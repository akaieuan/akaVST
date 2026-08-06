#include "PluginEditor.h"

PlayerEditor::PlayerEditor (PlayerProcessor& p)
    : AudioProcessorEditor (&p), processor (p)
{
    setLookAndFeel (&lookAndFeel);
    setSize (520, 200);
    startTimerHz (15);
}

PlayerEditor::~PlayerEditor()
{
    setLookAndFeel (nullptr);
}

void PlayerEditor::timerCallback()
{
    const int now = processor.activeVoices();
    if (now == voices) return;
    voices = now;
    repaint();
}

void PlayerEditor::paint (juce::Graphics& g)
{
    g.fillAll (aka::Palette::bgDeep());

    auto area = getLocalBounds().reduced (24);

    g.setColour (aka::Palette::textHi());
    g.setFont (aka::Palette::display (26.0f));
    g.drawText ("akaVST Player", area.removeFromTop (34), juce::Justification::centredLeft);

    area.removeFromTop (10);
    g.setColour (aka::Palette::textDim());
    g.setFont (aka::Palette::mono (11.0f));
    g.drawText ("Phase 0 — hardcoded instrument, no file format yet",
                area.removeFromTop (18), juce::Justification::centredLeft);

    area.removeFromTop (18);
    auto panel = area.removeFromTop (56).toFloat();
    g.setColour (aka::Palette::bgPanel());
    g.fillRoundedRectangle (panel, 4.0f);
    g.setColour (aka::Palette::divider());
    g.drawRoundedRectangle (panel.reduced (0.5f), 4.0f, 1.0f);

    auto inner = panel.reduced (14.0f, 10.0f);
    g.setColour (aka::Palette::textMid());
    g.setFont (aka::Palette::mono (12.0f));
    g.drawText (processor.describeInstrument(),
                inner.removeFromTop (16.0f), juce::Justification::centredLeft);

    // The voice count is the proof of life: the plugin opening says nothing
    // about whether the engine is running, and this moves when you play.
    g.setColour (voices > 0 ? aka::Palette::accentBase() : aka::Palette::textDim());
    g.setFont (aka::Palette::mono (11.0f));
    g.drawText (juce::String (voices) + (voices == 1 ? " voice" : " voices"),
                inner, juce::Justification::bottomLeft);
}
