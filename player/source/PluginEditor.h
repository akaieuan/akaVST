#pragma once

#include <aka_skeleton/aka_skeleton.h>
#include "PluginProcessor.h"

/**
    Phase 0's editor: proof of life, not an interface.

    It names the instrument that is loaded and shows the voice count, because
    those are the two things that tell you the engine is running rather than the
    plugin merely opening. The real editor — a generic panel renderer over the
    layout data, built from skeleton's Knob and devices — is Phase 2.
*/
class PlayerEditor final : public juce::AudioProcessorEditor,
                           private juce::Timer
{
public:
    explicit PlayerEditor (PlayerProcessor&);
    ~PlayerEditor() override;

    void paint (juce::Graphics&) override;
    void resized() override {}

private:
    void timerCallback() override;

    PlayerProcessor& processor;
    aka::LookAndFeel lookAndFeel;
    int voices = 0;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PlayerEditor)
};
