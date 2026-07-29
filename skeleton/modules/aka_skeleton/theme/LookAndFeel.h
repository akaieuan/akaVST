#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include "Theme.h"

namespace aka
{

/**
    One LookAndFeel for every aka instrument.

    Replaces three near-identical implementations — `BleepLookAndFeel`,
    `EnzymeLookAndFeel` and i4's `LookAndFeel` — which between them override the
    same seven methods and disagree only in ways nobody chose.

    Follows the site's rules: depth is a hairline border, never a shadow;
    structure is mono and prose is sans; and exactly one accent is spent, on the
    thing that matters. The rotary's value arc is the accent; everything else on
    a knob is greyscale.
*/
class LookAndFeel : public juce::LookAndFeel_V4
{
public:
    LookAndFeel() { refreshColours(); }

    /**
        Re-reads the palette. Call after `Palette::setTheme` or `setAccent`.

        Virtual because a plugin migrating onto skeleton will often keep its own
        colour names as a bridge over its existing paint code, and those have to
        be repopulated in the same breath as these. `applyAndRepaint` reaches
        subclasses through a base pointer, so a non-virtual version would
        silently refresh only half the palette.
    */
    virtual void refreshColours();

    /** Sets the theme and repaints every component that uses this LookAndFeel. */
    static void setTheme (int index, juce::Component* rootToRepaint = nullptr);
    static void setAccent (AccentId accent, juce::Component* rootToRepaint = nullptr);

    void drawRotarySlider (juce::Graphics&, int x, int y, int w, int h,
                           float sliderPos, float startAngle, float endAngle,
                           juce::Slider&) override;

    void drawLinearSlider (juce::Graphics&, int x, int y, int w, int h,
                           float sliderPos, float minPos, float maxPos,
                           juce::Slider::SliderStyle, juce::Slider&) override;

    void drawComboBox (juce::Graphics&, int width, int height, bool isDown,
                       int buttonX, int buttonY, int buttonW, int buttonH,
                       juce::ComboBox&) override;

    void drawLabel (juce::Graphics&, juce::Label&) override;

    void drawButtonBackground (juce::Graphics&, juce::Button&,
                               const juce::Colour& backgroundColour,
                               bool isHighlighted, bool isDown) override;

    void drawButtonText (juce::Graphics&, juce::TextButton&,
                         bool isHighlighted, bool isDown) override;

    juce::Font getLabelFont (juce::Label&) override;
    juce::Font getComboBoxFont (juce::ComboBox&) override;
    juce::Font getTextButtonFont (juce::TextButton&, int buttonHeight) override;
    juce::Font getPopupMenuFont() override;
    juce::Font getSliderPopupFont (juce::Slider&) override;

    /**
        A panel with a header strip and an ALL-CAPS title, returning the inner
        bounds to lay controls into. Lifted from enzyme, which is the only one of
        the three that had factored this out.
    */
    static juce::Rectangle<int> paintPanel (juce::Graphics&, juce::Rectangle<int> area,
                                            const juce::String& title,
                                            juce::Colour tint = juce::Colour());

    /** The house hairline: one device pixel, never a shadow. */
    static void paintHairline (juce::Graphics&, juce::Rectangle<int> area);

    static constexpr float cornerRadius = 6.0f;
    static constexpr float hairline = 1.0f;

    /**
        Ceiling on a rotary's arc stroke.

        The arc scales with radius so a large knob does not look spindly, but
        unclamped a 40px-radius knob takes a 6px stroke — four times what these
        instruments draw today, which stops being a reskin and starts being a
        redesign. 2.2px keeps it a hairline at every size.
    */
    static constexpr float maxArcThickness = 2.2f;

    /**
        Ceiling on a linear slider's track.

        Same argument as the arc. A fader is a line with a position on it; a
        track thick enough to carry a fill and a cap has become a thermometer,
        and fifteen thermometers side by side is a control panel from a decade
        ago.
    */
    static constexpr float trackThickness = 4.0f;
};

} // namespace aka
