#include "LookAndFeel.h"

namespace aka
{

/**
    A component's own colour if it set one, otherwise the palette's.

    The palette is the default, not the law. A plugin still needs to say "this
    one button is the bypass and it goes red" without leaving the design system,
    and JUCE's colour ids are the idiom for that. Reading `findColour`
    unconditionally would be wrong the other way — it falls back to black when
    nothing is registered — so the specified check is what makes the fallback
    safe.
*/
static juce::Colour colourFor (juce::Component& c, int colourId, juce::Colour fallback)
{
    return c.isColourSpecified (colourId) ? c.findColour (colourId) : fallback;
}

void LookAndFeel::refreshColours()
{
    setColour (juce::ResizableWindow::backgroundColourId, Palette::bgDeep());
    setColour (juce::Label::textColourId,                 Palette::textMid());
    setColour (juce::Slider::textBoxTextColourId,         Palette::textHi());
    setColour (juce::Slider::textBoxOutlineColourId,      juce::Colours::transparentBlack);
    setColour (juce::ComboBox::backgroundColourId,        Palette::bgPanel());
    setColour (juce::ComboBox::textColourId,              Palette::textHi());
    setColour (juce::ComboBox::outlineColourId,           Palette::divider());
    setColour (juce::ComboBox::arrowColourId,             Palette::textDim());
    setColour (juce::PopupMenu::backgroundColourId,       Palette::bgPanel());
    setColour (juce::PopupMenu::textColourId,             Palette::textMid());
    setColour (juce::PopupMenu::highlightedBackgroundColourId, Palette::accentSoft());
    setColour (juce::PopupMenu::highlightedTextColourId,  Palette::textHi());
    setColour (juce::TextButton::buttonColourId,          Palette::bgPanel());
    setColour (juce::TextButton::textColourOffId,         Palette::textDim());
    setColour (juce::TextButton::textColourOnId,          Palette::textOnAccent());
    setColour (juce::TooltipWindow::backgroundColourId,   Palette::bgPanel());
    setColour (juce::TooltipWindow::textColourId,         Palette::textMid());
    setColour (juce::TooltipWindow::outlineColourId,      Palette::divider());
}

/**
    Theme changes are process-wide, so every LookAndFeel instance has to be told.
    JUCE has no registry of them, so the caller passes the root it wants
    repainted — usually the editor. Passing nothing changes the palette for
    anything constructed afterwards, which is what a plugin wants at startup.
*/
static void applyAndRepaint (juce::Component* root)
{
    if (root == nullptr)
        return;

    if (auto* lf = dynamic_cast<LookAndFeel*> (&root->getLookAndFeel()))
        lf->refreshColours();

    root->repaint();
}

void LookAndFeel::setTheme (int index, juce::Component* rootToRepaint)
{
    Palette::setTheme (index);
    applyAndRepaint (rootToRepaint);
}

void LookAndFeel::setAccent (AccentId accent, juce::Component* rootToRepaint)
{
    Palette::setAccent (accent);
    applyAndRepaint (rootToRepaint);
}

/* ── Fonts ────────────────────────────────────────────────────────────── */

juce::Font LookAndFeel::getLabelFont (juce::Label& label)
{
    return Palette::mono (juce::jmin (13.0f, (float) label.getHeight() * 0.7f));
}

juce::Font LookAndFeel::getComboBoxFont (juce::ComboBox& box)
{
    return Palette::mono (juce::jmin (12.0f, (float) box.getHeight() * 0.6f));
}

juce::Font LookAndFeel::getTextButtonFont (juce::TextButton&, int buttonHeight)
{
    return Palette::mono (juce::jmin (12.0f, (float) buttonHeight * 0.55f));
}

juce::Font LookAndFeel::getPopupMenuFont()          { return Palette::mono (12.0f); }
juce::Font LookAndFeel::getSliderPopupFont (juce::Slider&) { return Palette::mono (11.0f); }

/* ── Controls ─────────────────────────────────────────────────────────── */

void LookAndFeel::drawRotarySlider (juce::Graphics& g, int x, int y, int w, int h,
                                    float sliderPos, float startAngle, float endAngle,
                                    juce::Slider& slider)
{
    const auto bounds = juce::Rectangle<int> (x, y, w, h).toFloat().reduced (2.0f);
    const auto radius = juce::jmin (bounds.getWidth(), bounds.getHeight()) / 2.0f;
    const auto centre = bounds.getCentre();
    const auto angle = startAngle + sliderPos * (endAngle - startAngle);

    // Proportional, but capped. Unclamped, a 40px-radius knob takes a 6px arc,
    // which on a dense row of them reads as a redesign rather than a palette
    // change. The ceiling keeps the house look a hairline at every size.
    const auto thickness = juce::jlimit (1.5f, maxArcThickness, radius * 0.16f);
    const auto arcRadius = radius - thickness * 0.5f;

    // Track: the full sweep, unfilled.
    juce::Path track;
    track.addCentredArc (centre.x, centre.y, arcRadius, arcRadius, 0.0f,
                         startAngle, endAngle, true);
    g.setColour (colourFor (slider, juce::Slider::rotarySliderOutlineColourId, Palette::trackDim()));
    g.strokePath (track, juce::PathStrokeType (thickness, juce::PathStrokeType::curved,
                                               juce::PathStrokeType::rounded));

    // Value: the one place a knob spends the accent.
    if (sliderPos > 0.0f)
    {
        juce::Path value;
        value.addCentredArc (centre.x, centre.y, arcRadius, arcRadius, 0.0f,
                             startAngle, angle, true);
        g.setColour (slider.isEnabled()
                         ? colourFor (slider, juce::Slider::rotarySliderFillColourId, Palette::accentBase())
                         : Palette::trackDim());
        g.strokePath (value, juce::PathStrokeType (thickness, juce::PathStrokeType::curved,
                                                   juce::PathStrokeType::rounded));
    }

    // Indicator: a spoke from the hub, not a dot on the rim — it reads at 20px.
    const auto inner = arcRadius - thickness * 0.75f;
    const juce::Point<float> tip (centre.x + inner * std::cos (angle - juce::MathConstants<float>::halfPi),
                                  centre.y + inner * std::sin (angle - juce::MathConstants<float>::halfPi));
    const juce::Point<float> root (centre.x + inner * 0.35f * std::cos (angle - juce::MathConstants<float>::halfPi),
                                   centre.y + inner * 0.35f * std::sin (angle - juce::MathConstants<float>::halfPi));
    g.setColour (colourFor (slider, juce::Slider::thumbColourId, Palette::textHi()));
    g.drawLine ({ root, tip }, juce::jmax (1.0f, thickness * 0.4f));
}

void LookAndFeel::drawLinearSlider (juce::Graphics& g, int x, int y, int w, int h,
                                    float sliderPos, float, float,
                                    juce::Slider::SliderStyle style, juce::Slider& slider)
{
    const auto bounds = juce::Rectangle<int> (x, y, w, h).toFloat();
    const bool vertical = style == juce::Slider::LinearVertical
                       || style == juce::Slider::LinearBarVertical;
    const auto thickness = juce::jmax (3.0f, (vertical ? bounds.getWidth() : bounds.getHeight()) * 0.22f);

    auto track = vertical ? bounds.withSizeKeepingCentre (thickness, bounds.getHeight())
                          : bounds.withSizeKeepingCentre (bounds.getWidth(), thickness);

    g.setColour (colourFor (slider, juce::Slider::backgroundColourId, Palette::trackDim()));
    g.fillRoundedRectangle (track, thickness * 0.5f);

    auto filled = track;
    if (vertical) filled = filled.withTop (sliderPos);
    else          filled = filled.withRight (sliderPos);

    const auto fill = slider.isEnabled()
                    ? colourFor (slider, juce::Slider::trackColourId, Palette::accentBase())
                    : Palette::trackDim();
    g.setColour (fill);
    g.fillRoundedRectangle (filled, thickness * 0.5f);

    // The thumb. Without it a linear slider reads as a progress bar — you can
    // see the value but not that it is draggable, and there is nothing to aim
    // at. JUCE's default draws one; anything replacing it has to as well.
    const float thumbSize = thickness * 2.0f;
    const auto centre = vertical ? juce::Point<float> (track.getCentreX(), sliderPos)
                                 : juce::Point<float> (sliderPos, track.getCentreY());
    const auto thumb = juce::Rectangle<float> (thumbSize, thumbSize).withCentre (centre);

    g.setColour (colourFor (slider, juce::Slider::thumbColourId, Palette::textHi()));
    g.fillRoundedRectangle (thumb, thumbSize * 0.35f);
}

void LookAndFeel::drawComboBox (juce::Graphics& g, int width, int height, bool,
                                int, int, int, int, juce::ComboBox& box)
{
    const auto bounds = juce::Rectangle<int> (0, 0, width, height).toFloat().reduced (0.5f);

    g.setColour (colourFor (box, juce::ComboBox::backgroundColourId, Palette::bgPanel()));
    g.fillRoundedRectangle (bounds, cornerRadius);
    g.setColour (box.hasKeyboardFocus (false)
                     ? Palette::accentBase()
                     : colourFor (box, juce::ComboBox::outlineColourId, Palette::divider()));
    g.drawRoundedRectangle (bounds, cornerRadius, hairline);

    // A chevron, drawn in whole pixels so it stays crisp at small sizes.
    const float cx = bounds.getRight() - 10.0f;
    const float cy = bounds.getCentreY();
    juce::Path chevron;
    chevron.startNewSubPath (cx - 3.0f, cy - 1.5f);
    chevron.lineTo (cx, cy + 1.5f);
    chevron.lineTo (cx + 3.0f, cy - 1.5f);
    g.setColour (colourFor (box, juce::ComboBox::arrowColourId, Palette::textDim()));
    g.strokePath (chevron, juce::PathStrokeType (1.2f));
}

void LookAndFeel::drawLabel (juce::Graphics& g, juce::Label& label)
{
    g.fillAll (label.findColour (juce::Label::backgroundColourId));

    // A Slider's text box IS an editable Label. Painting the static text while
    // its TextEditor is live double-draws the value, and every editable knob
    // readout in a plugin hits this.
    if (label.isBeingEdited())
        return;

    const float alpha = label.isEnabled() ? 1.0f : 0.5f;
    g.setColour (label.findColour (juce::Label::textColourId).withMultipliedAlpha (alpha));
    g.setFont (getLabelFont (label));

    // Squeeze rather than ellipsize: captions sit under knobs in dense rows,
    // and a truncated parameter name is worse than a slightly narrow one.
    g.drawFittedText (label.getText(), label.getLocalBounds(),
                      label.getJustificationType(), 1, 0.9f);
}

void LookAndFeel::drawButtonBackground (juce::Graphics& g, juce::Button& button,
                                        const juce::Colour& backgroundColour,
                                        bool isHighlighted, bool isDown)
{
    const auto bounds = button.getLocalBounds().toFloat().reduced (0.5f);
    const bool on = button.getToggleState();

    // `backgroundColour` is JUCE's resolved off-state fill and the on-state has
    // its own id. Ignoring both would look like a working reskin and quietly
    // flatten every deliberately-coloured button — a bypass that went red, a
    // transport that went green — into one accent.
    auto fill = on ? colourFor (button, juce::TextButton::buttonOnColourId, Palette::accentBase())
                   : backgroundColour;

    if (isDown)             fill = fill.contrasting (0.08f);
    else if (isHighlighted) fill = fill.brighter (0.15f);

    g.setColour (fill);
    g.fillRoundedRectangle (bounds, cornerRadius);

    // Depth is a border, never a shadow. An on-state borders in its own fill so
    // it reads as one solid block rather than a chip inside a frame.
    g.setColour (on ? fill : Palette::divider());
    g.drawRoundedRectangle (bounds, cornerRadius, hairline);
}

void LookAndFeel::drawButtonText (juce::Graphics& g, juce::TextButton& button,
                                  bool isHighlighted, bool)
{
    const bool on = button.getToggleState();

    g.setFont (getTextButtonFont (button, button.getHeight()));
    g.setColour (on ? colourFor (button, juce::TextButton::textColourOnId, Palette::textOnAccent())
                    : colourFor (button, juce::TextButton::textColourOffId,
                                 isHighlighted ? Palette::textHi() : Palette::textDim()));
    g.drawFittedText (button.getButtonText(), button.getLocalBounds(),
                      juce::Justification::centred, 1, 0.9f);
}

/* ── Layout ───────────────────────────────────────────────────────────── */

juce::Rectangle<int> LookAndFeel::paintPanel (juce::Graphics& g, juce::Rectangle<int> area,
                                              const juce::String& title, juce::Colour tint)
{
    const auto bounds = area.toFloat().reduced (0.5f);
    g.setColour (Palette::bgPanel());
    g.fillRoundedRectangle (bounds, cornerRadius);
    g.setColour (Palette::divider());
    g.drawRoundedRectangle (bounds, cornerRadius, hairline);

    auto inner = area.reduced (10);
    if (title.isEmpty())
        return inner;

    auto header = inner.removeFromTop (14);

    // The tab is the only tinted thing on the panel: it says which module this
    // is without colouring the whole surface.
    auto tab = header.removeFromLeft (3).reduced (0, 2);
    g.setColour (tint.isTransparent() ? Palette::accentBase() : tint);
    g.fillRect (tab);

    g.setColour (Palette::textDim());
    g.setFont (Palette::mono (10.0f));
    g.drawText (title.toUpperCase(), header.reduced (6, 0),
                juce::Justification::centredLeft, false);

    inner.removeFromTop (8);
    return inner;
}

void LookAndFeel::paintHairline (juce::Graphics& g, juce::Rectangle<int> area)
{
    g.setColour (Palette::divider());
    g.fillRect (area.withHeight (1));
}

} // namespace aka
