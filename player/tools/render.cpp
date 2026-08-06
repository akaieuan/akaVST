#include <juce_audio_processors/juce_audio_processors.h>
#include <cmath>
#include <cstdio>

/**
    Host the built plugin, play a note, and measure what comes out.

    auval proves the plugin renders without crashing. It does not prove it
    renders the *right* thing, and every engine bug in this project so far was
    found by measuring rather than listening — a spectral centroid, a peak, a
    dB per band — because the ones that matter are inaudible until they are
    catastrophic.

    This is also the harness Phase 2 needs: the claim there is that the Player
    and the web app run the same C++, and the only way to hold that claim is to
    measure both and compare. Socket's side already exists as a Node script
    driving the WebAssembly build; this is the other half.
*/

namespace
{
constexpr double sampleRate = 48000.0;
constexpr int    blockSize  = 512;

double peakOf (const juce::AudioBuffer<float>& b)
{
    double peak = 0.0;
    for (int c = 0; c < b.getNumChannels(); ++c)
        for (int i = 0; i < b.getNumSamples(); ++i)
            peak = std::fmax (peak, std::fabs ((double) b.getSample (c, i)));
    return peak;
}

double rmsOf (const juce::AudioBuffer<float>& b)
{
    double sum = 0.0;
    const int n = b.getNumSamples();
    for (int i = 0; i < n; ++i) sum += (double) b.getSample (0, i) * b.getSample (0, i);
    return std::sqrt (sum / juce::jmax (1, n));
}

/** Hann-windowed magnitude at one frequency. The window is not optional. */
double magAt (const juce::AudioBuffer<float>& b, double hz)
{
    const int n = b.getNumSamples();
    double re = 0.0, im = 0.0, norm = 0.0;
    const double w = 2.0 * juce::MathConstants<double>::pi * hz / sampleRate;
    for (int i = 0; i < n; ++i)
    {
        const double win = 0.5 - 0.5 * std::cos (2.0 * juce::MathConstants<double>::pi * i / (n - 1));
        re += b.getSample (0, i) * win * std::cos (w * i);
        im -= b.getSample (0, i) * win * std::sin (w * i);
        norm += win;
    }
    return 2.0 * std::hypot (re, im) / juce::jmax (1.0, norm);
}

/** Where the energy sits. The one number that says "brighter". */
double centroidOf (const juce::AudioBuffer<float>& b)
{
    double num = 0.0, den = 0.0;
    for (double hz = 40.0; hz < 12000.0; hz *= 1.06)
    {
        const double m = magAt (b, hz);
        num += hz * m;
        den += m;
    }
    return den > 0.0 ? num / den : 0.0;
}
} // namespace

int main (int argc, char** argv)
{
    juce::ScopedJuceInitialiser_GUI juceInit;

    if (argc < 2)
    {
        std::puts ("usage: render <path to .vst3>");
        return 2;
    }

    juce::AudioPluginFormatManager formats;
    formats.addDefaultFormats();

    juce::OwnedArray<juce::PluginDescription> found;
    juce::VST3PluginFormat vst3;
    juce::KnownPluginList list;
    list.scanAndAddFile (argv[1], true, found, vst3);

    if (found.isEmpty())
    {
        std::printf ("no plugin found at %s\n", argv[1]);
        return 1;
    }

    juce::String error;
    auto plugin = formats.createPluginInstance (*found[0], sampleRate, blockSize, error);
    if (plugin == nullptr)
    {
        std::printf ("could not instantiate: %s\n", error.toRawUTF8());
        return 1;
    }

    plugin->setPlayConfigDetails (0, 2, sampleRate, blockSize);
    plugin->prepareToPlay (sampleRate, blockSize);

    juce::AudioBuffer<float> block (2, blockSize);
    juce::AudioBuffer<float> captured (2, (int) sampleRate);   // one second
    captured.clear();

    // Middle C, held. A note-on in the first block and nothing after it, so any
    // sound in the capture came from the engine sustaining rather than from a
    // stream of retriggers covering for a voice that never held.
    juce::MidiBuffer midi;
    midi.addEvent (juce::MidiMessage::noteOn (1, 60, 0.9f), 0);

    int written = 0;
    while (written < captured.getNumSamples())
    {
        block.clear();
        plugin->processBlock (block, midi);
        midi.clear();

        const int n = juce::jmin (blockSize, captured.getNumSamples() - written);
        for (int c = 0; c < 2; ++c) captured.copyFrom (c, written, block, c, 0, n);
        written += n;
    }

    const double peak = peakOf (captured);
    const double rms = rmsOf (captured);
    const double centroid = centroidOf (captured);
    const double fundamental = magAt (captured, 261.63);

    std::printf ("plugin      : %s\n", plugin->getName().toRawUTF8());
    std::printf ("peak        : %.5f\n", peak);
    std::printf ("rms         : %.5f\n", rms);
    std::printf ("centroid    : %.0f Hz\n", centroid);
    std::printf ("C4 partial  : %.1f dB\n", 20.0 * std::log10 (juce::jmax (1.0e-12, fundamental)));

    // Release, and confirm it actually stops. A synth that never releases is a
    // synth that sounds fine for one note and ruins the second.
    juce::MidiBuffer off;
    off.addEvent (juce::MidiMessage::noteOff (1, 60), 0);
    for (int i = 0; i < 200; ++i)
    {
        block.clear();
        plugin->processBlock (block, off);
        off.clear();
    }
    const double tail = peakOf (block);
    std::printf ("after release: %.7f\n", tail);

    const bool ok = peak > 0.001 && centroid > 40.0 && tail < 0.0005;
    std::printf ("\n%s\n", ok ? "PASS — the plugin renders a note and releases it"
                              : "FAIL");
    return ok ? 0 : 1;
}
