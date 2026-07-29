#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include "../theme/Theme.h"

namespace aka
{

/**
    What a Knob needs from a modulation system, and nothing more.

    i4's knob reaches straight into `ModDest` and `ModMatrix`, which is why it
    cannot leave i4. Skeleton inverts that: the widget declares the three things
    it actually needs and the plugin supplies them, so skeleton never learns what
    a modulation matrix is. Same move the site's rack engine makes — `Device` is
    four methods and the engine never learns what any device is.

    A plugin with no modulation simply passes nullptr and the submenu vanishes.
*/
struct ModAssignHost
{
    virtual ~ModAssignHost() = default;

    /** Is this parameter a legal modulation destination? */
    virtual bool canAssign (const juce::String& paramId) const = 0;

    /** Menu entries, in order. Returning an empty array hides the submenu. */
    virtual juce::StringArray slotNames() const = 0;

    /** Route this parameter into the slot at `slotIndex`. */
    virtual void assign (const juce::String& paramId, int slotIndex) = 0;
};

/**
    The house rotary: arc, spoke, a mono caption and a live value beneath.

    Lifted from i4, which had the most evolved of the three. Keeps the tooltip,
    the double-click reset, wheel and fine-drag, the right-click menu, and — the
    part worth preserving most — its own value formatting. JUCE's default text
    will happily render "1514.2095947 ms".
*/
class Knob : public juce::Component,
             public juce::SettableTooltipClient,
             private juce::Timer
{
public:
    Knob()
    {
        slider.setSliderStyle (juce::Slider::RotaryHorizontalVerticalDrag);
        slider.setTextBoxStyle (juce::Slider::NoTextBox, false, 0, 0);
        slider.setRotaryParameters (juce::MathConstants<float>::pi * 1.25f,
                                    juce::MathConstants<float>::pi * 2.75f,
                                    true);
        slider.setMouseDragSensitivity (220);
        slider.setVelocityModeParameters (1.0, 1, 0.0, false);
        slider.setDoubleClickReturnValue (true, 0.0);
        slider.setPopupDisplayEnabled (true, false, this);

        caption.setJustificationType (juce::Justification::centred);
        caption.setInterceptsMouseClicks (false, false);
        caption.setColour (juce::Label::textColourId, Palette::textDim());

        valueLabel.setJustificationType (juce::Justification::centred);
        valueLabel.setInterceptsMouseClicks (false, false);
        valueLabel.setColour (juce::Label::textColourId, Palette::textHi());
        valueLabel.setFont (Palette::mono (10.0f));

        addAndMakeVisible (slider);
        addAndMakeVisible (caption);
        addAndMakeVisible (valueLabel);

        slider.addMouseListener (this, false);
        startTimerHz (15);
    }

    ~Knob() override
    {
        stopTimer();
        slider.removeMouseListener (this);
    }

    void attach (juce::AudioProcessorValueTreeState& state,
                 const juce::String& paramId,
                 const juce::String& label)
    {
        caption.setText (label, juce::dontSendNotification);

        // The inner Slider is what receives the hover, so it needs the tooltip
        // too — setting it on the wrapper alone silently does nothing.
        if (auto* p = state.getParameter (paramId))
        {
            const auto name = p->getName (60);
            setTooltip (name);
            slider.setTooltip (name);
            caption.setTooltip (name);
        }

        attachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment> (
            state, paramId, slider);

        boundState = &state;
        boundParamId = paramId;
    }

    /** Opt in to the right-click "assign to mod" submenu. Not owned. */
    void setModAssignHost (ModAssignHost* host) noexcept { modHost = host; }

    juce::String getBoundParamId() const { return boundParamId; }

    /** Re-reads palette colours. Call after a theme flip. */
    void refreshColours()
    {
        caption.setColour (juce::Label::textColourId, Palette::textDim());
        valueLabel.setColour (juce::Label::textColourId, Palette::textHi());
        valueLabel.setFont (Palette::mono (10.0f));
        repaint();
    }

    void resized() override
    {
        auto b = getLocalBounds();
        valueLabel.setBounds (b.removeFromBottom (12));
        caption.setBounds    (b.removeFromBottom (11));
        slider.setBounds (b);
    }

    void mouseDown (const juce::MouseEvent& e) override
    {
        if (e.mods.isPopupMenu() || e.mods.isRightButtonDown())
            showContextMenu();
    }

    juce::Slider slider;
    juce::Label  caption;
    juce::Label  valueLabel;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> attachment;

private:
    /**
        Precision by magnitude, plus the parameter's own unit.

        A fixed decimal count is wrong at both ends: three decimals on a
        millisecond value is float noise, and none on a ratio is useless.
    */
    static juce::String format (float v, const juce::String& unit)
    {
        const float mag = std::abs (v);
        juce::String txt = mag >= 100.0f ? juce::String ((int) std::round (v))
                         : mag >= 10.0f  ? juce::String (v, 1)
                         : mag >= 1.0f   ? juce::String (v, 2)
                                         : juce::String (v, 3);
        if (unit.isNotEmpty())
            txt += " " + unit;
        return txt;
    }

    void timerCallback() override
    {
        if (boundState == nullptr)
            return;

        if (auto* p = boundState->getParameter (boundParamId))
        {
            const float v = p->getNormalisableRange().convertFrom0to1 (p->getValue());
            const auto txt = format (v, p->getLabel());
            if (txt != valueLabel.getText())
                valueLabel.setText (txt, juce::dontSendNotification);
        }
    }

    void showContextMenu()
    {
        if (boundState == nullptr)
            return;

        auto* param = boundState->getParameter (boundParamId);
        if (param == nullptr)
            return;

        juce::PopupMenu menu;
        menu.addItem (1, "Reset to default");
        menu.addItem (2, "Copy value");
        menu.addItem (3, "Paste value");

        const bool assignable = modHost != nullptr && modHost->canAssign (boundParamId);
        const auto slots = assignable ? modHost->slotNames() : juce::StringArray();

        if (! slots.isEmpty())
        {
            menu.addSeparator();
            juce::PopupMenu sub;
            for (int i = 0; i < slots.size(); ++i)
                sub.addItem (100 + i, slots[i]);
            menu.addSubMenu ("Assign to mod", sub);
        }

        menu.showMenuAsync (juce::PopupMenu::Options().withTargetComponent (&slider),
            [this, param] (int result)
            {
                if (result == 0)
                    return;

                if (result >= 100)
                {
                    if (modHost != nullptr)
                        modHost->assign (boundParamId, result - 100);
                    return;
                }

                const auto& range = param->getNormalisableRange();
                switch (result)
                {
                    case 1:
                        param->setValueNotifyingHost (param->getDefaultValue());
                        break;
                    case 2:
                        juce::SystemClipboard::copyTextToClipboard (
                            juce::String (range.convertFrom0to1 (param->getValue())));
                        break;
                    case 3:
                    {
                        const auto text = juce::SystemClipboard::getTextFromClipboard();
                        if (text.containsOnly ("0123456789.-+eE") && text.isNotEmpty())
                            param->setValueNotifyingHost (
                                range.convertTo0to1 (text.getFloatValue()));
                        break;
                    }
                    default:
                        break;
                }
            });
    }

    juce::AudioProcessorValueTreeState* boundState = nullptr;
    juce::String boundParamId;
    ModAssignHost* modHost = nullptr;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (Knob)
};

} // namespace aka
