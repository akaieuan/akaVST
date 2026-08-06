#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "Instrument.h"

/**
    akaVST Player — Phase 0.

    The plugin that will eventually load a `.socket` instrument. Right now it
    loads a hardcoded one, because the only question this stage answers is
    whether the engine compiles and sounds inside a JUCE plugin at all. That
    code has only ever been through Emscripten; everything downstream of here
    assumes it survives AppleClang and a real audio callback, and assuming was
    not good enough.

    No parameters, no editor to speak of, no file format. Those are Phases 1
    and 2. What exists is the spine: MIDI in, aka::dsp::Instrument, audio out.
*/
class PlayerProcessor final : public juce::AudioProcessor
{
public:
    PlayerProcessor();
    ~PlayerProcessor() override = default;

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override {}
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "akaVST Player"; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 2.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return {}; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock&) override {}
    void setStateInformation (const void*, int) override {}

    /** What the editor reports. Replaced by the loaded file's name in Phase 2. */
    juce::String describeInstrument() const;
    int activeVoices() const noexcept { return instrument.activeVoices(); }

private:
    /** One parameter of the loaded instrument, addressed the way the engine is. */
    struct Value { int block; int index; float value; };

    aka::dsp::Instrument instrument;
    std::vector<aka::dsp::BlockType> types;
    std::vector<Value> values;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PlayerProcessor)
};
