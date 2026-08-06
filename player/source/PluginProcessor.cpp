#include "PluginProcessor.h"
#include "PluginEditor.h"

PlayerProcessor::PlayerProcessor()
    : AudioProcessor (BusesProperties().withOutput ("Output", juce::AudioChannelSet::stereo(), true))
{
    using aka::dsp::BlockType;

    // Oscillator → Filter → Envelope → Output. The shape of a synth, and enough
    // to prove a voice runs: a source, something shaping it, something opening
    // and closing it, and a sink.
    //
    // Described here, pushed in prepareToPlay. The description is the thing a
    // `.socket` file will carry in Phase 1, so keeping it separate from the act
    // of applying it is the shape this wants anyway.
    types = { BlockType::osc, BlockType::filter, BlockType::env, BlockType::out };

    // (block index, parameter index, value) — the contract BlockCatalog.h
    // exists to keep honest.
    values = {
        { 0, 0, 0.0f },     // Oscillator · Wave
        { 0, 3, 0.8f },     // Oscillator · Level
        { 1, 1, 0.65f },    // Filter · Cutoff
        { 1, 2, 0.25f },    // Filter · Reso
        { 2, 0, 0.02f },    // Envelope · A
        { 2, 3, 0.35f },    // Envelope · R
        { 3, 0, 0.8f },     // Output · Level
    };
}

/**
    Order matters here, and getting it wrong is silent.

    `Instrument::prepare` calls `voice.build(...)`, which constructs every voice
    engine from scratch — so any parameter pushed before it is discarded, and
    the instrument plays its defaults. Worse, parameters that resolve against
    the sample rate (a filter's cutoff becomes a coefficient via tan(pi·f/sr))
    would be computed against the wrong rate even if they did survive.

    The first version of this file set parameters in the constructor. It built,
    it validated, it made a sound, and it was wrong: measured against the same
    instrument in WebAssembly the spectral centroid was 958 Hz against 258, and
    nothing about the plugin looked broken. Prepare, then types, then values —
    the same order Socket's worklet uses, for the same reason.
*/
void PlayerProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    instrument.prepare (sampleRate, samplesPerBlock);
    instrument.setAllTypes (types);
    instrument.setChain ({ 0, 1, 2, 3 });
    for (const auto& v : values)
        instrument.setParam (v.block, v.index, v.value);
}

bool PlayerProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    const auto& out = layouts.getMainOutputChannelSet();
    return out == juce::AudioChannelSet::stereo() || out == juce::AudioChannelSet::mono();
}

void PlayerProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi)
{
    juce::ScopedNoDenormals noDenormals;
    buffer.clear();

    const int n = buffer.getNumSamples();
    if (n <= 0) return;

    for (const auto meta : midi)
    {
        const auto m = meta.getMessage();
        if (m.isNoteOn())        instrument.noteOn (m.getNoteNumber(), m.getFloatVelocity());
        else if (m.isNoteOff())  instrument.noteOff (m.getNoteNumber());
        else if (m.isAllNotesOff() || m.isAllSoundOff()) instrument.allNotesOff();
    }

    // The engine always writes two channels. On a mono bus there is no second
    // pointer to hand it, so it renders into a scratch right that is discarded
    // — cheaper and far less surprising than teaching the engine about layouts.
    float* left = buffer.getWritePointer (0);
    if (buffer.getNumChannels() >= 2)
    {
        instrument.process (left, buffer.getWritePointer (1), n);
    }
    else
    {
        juce::HeapBlock<float> scratch (static_cast<size_t> (n));
        instrument.process (left, scratch.get(), n);
    }
}

juce::String PlayerProcessor::describeInstrument() const
{
    juce::StringArray names;
    for (const auto t : types)
        names.add (aka::dsp::blockInfo[static_cast<int> (t)].name);
    return names.joinIntoString (" → ");
}

juce::AudioProcessorEditor* PlayerProcessor::createEditor()
{
    return new PlayerEditor (*this);
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new PlayerProcessor();
}
