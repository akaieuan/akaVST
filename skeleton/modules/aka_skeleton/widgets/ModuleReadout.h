#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include <memory>
#include "PixelRack.h"

namespace aka
{

/**
    A small pixel readout for a single module's panel.

    The same engine as the main screen, sized and defaulted for a header strip
    rather than a display. A plugin is a stack of modules each shaping the sound
    differently, and one big spectrum flattens all of that into a single line —
    a readout per module says what each one is actually doing.

    Cheap enough to have ten of, because `RackDevice::signature` lets the engine
    skip a repaint when nothing has moved. These are mostly parameter-driven, so
    an envelope only redraws when a knob turns. Ten always-animating widgets in a
    plugin editor would not be viable; ten mostly-idle ones are free.
*/
class ModuleReadout : public juce::Component
{
public:
    explicit ModuleReadout (std::unique_ptr<RackDevice> device, int cols = 22)
    {
        rack = std::make_unique<PixelRack> (std::move (device));
        rack->setGrid (cols);
        // Assembled and still. A readout that periodically dissolved itself
        // would be decoration competing with the parameter it is reporting.
        rack->setHoldsForever (true);
        // Slower than the main screen: these track knobs and clocks, not audio,
        // and the signature check means most ticks do no work anyway.
        rack->setFrameRate (20);
        rack->setGap (0.22f);
        addAndMakeVisible (*rack);
    }

    /** Material colour for the grid. Follows the theme; call after a flip. */
    void refreshColours (juce::Colour pixel)
    {
        rack->setPixelColour (pixel);
        rack->refreshColours();
    }

    void resized() override { rack->setBounds (getLocalBounds()); }

private:
    std::unique_ptr<PixelRack> rack;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (ModuleReadout)
};

} // namespace aka
