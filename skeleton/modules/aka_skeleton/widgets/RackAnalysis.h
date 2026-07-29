#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <array>
#include <atomic>
#include <cmath>

namespace aka
{

/**
    Band energy and level for a rack screen, computed on the audio thread.

    A one-pole cascade rather than an FFT. Each tap is a lowpass at roughly half
    the corner of the one before it, so what a tap rejects is the content above
    its corner — sixteen bands for sixteen multiply-adds per sample, with no
    window, no latency, and nothing crossing a queue.

    Deliberately not a FIFO. `juce::AbstractFifo` is strictly single-consumer, so
    a screen tapping a queue that a meter is already draining leaves both
    flickering as they steal samples from each other. Atomics have no such
    problem and a picture only needs an envelope.

    The corners descend on purpose. Ascending is the obvious way to write it and
    it is wrong: the first tap becomes a very slow lowpass, its residue is the
    entire signal, and every band after it is fed something already reduced to
    nothing — band 0 takes everything and the other fifteen read as silence.
*/
template <int NumBands = 16>
class RackAnalysis
{
public:
    static constexpr int numBands = NumBands;

    /** Call once per block with the post-FX mono output. Audio thread only. */
    void process (const float* mono, int numSamples) noexcept
    {
        float bandPeak[numBands] = {};
        float peak = 0.0f;

        for (int s = 0; s < numSamples; ++s)
        {
            const float x = mono[s];
            peak = juce::jmax (peak, std::abs (x));

            float previousTap = x;
            for (int b = 0; b < numBands; ++b)
            {
                const float coeff = juce::jmin (0.9f, baseCoeff * (float) (1 << (numBands - 1 - b)));
                state[b] += coeff * (previousTap - state[b]);
                bandPeak[b] = juce::jmax (bandPeak[b], std::abs (previousTap - state[b]));
                previousTap = state[b];
            }
        }

        // Fast attack, slow release on both, so the picture tracks transients
        // without strobing on every buffer boundary.
        const float previousLevel = level.load (std::memory_order_relaxed);
        level.store (peak > previousLevel ? peak : previousLevel * 0.82f + peak * 0.18f,
                     std::memory_order_relaxed);

        for (int b = 0; b < numBands; ++b)
        {
            const float previous = bands[(size_t) b].load (std::memory_order_relaxed);
            const float next = bandPeak[b] > previous ? bandPeak[b]
                                                      : previous * 0.86f + bandPeak[b] * 0.14f;
            bands[(size_t) b].store (next, std::memory_order_relaxed);
        }
    }

    /** Band energy, low index is treble. Message thread. */
    float band (int i) const noexcept
    {
        return bands[(size_t) juce::jlimit (0, numBands - 1, i)].load (std::memory_order_relaxed);
    }

    float peakLevel() const noexcept { return level.load (std::memory_order_relaxed); }

    /** Band energy as a 0..1 position in the display window. */
    static float normalise (float energy) noexcept
    {
        const float db = juce::Decibels::gainToDecibels (energy, floorDb);
        return juce::jlimit (0.0f, 1.0f, (db - floorDb) / (ceilDb - floorDb));
    }

    /**
        The dynamic window, in dB.

        A many-way split leaves each band holding a fraction of the total, so the
        interesting range sits well below unity. A linear gain and a root has no
        usable range at all: at any setting low enough not to clip, quiet detail
        is invisible, and at any setting high enough to show it everything above
        a few percent pins to maximum and the picture stops moving.
    */
    static constexpr float floorDb = -54.0f;
    static constexpr float ceilDb  = -12.0f;

private:
    static constexpr float baseCoeff = 0.0012f;

    float state[numBands] {};
    std::array<std::atomic<float>, numBands> bands {};
    std::atomic<float> level { 0.0f };
};

} // namespace aka
