#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include <memory>
#include <vector>
#include "RackDevice.h"
#include "RackField.h"
#include "../theme/Theme.h"

namespace aka
{

/**
    The akaVST mark, as a JUCE component: a pixel *panel* that assembles, holds,
    dissolves and reforms, with device geometry knocked out of it.

    Ported from the site's rack engine, keeping its grammar intact — a
    deterministic hash PRNG, one sampled cell set, an assemble-and-hold timeline,
    a two-grey substrate under the pixels, and a signature check that skips the
    repaint when nothing has changed.

    What is different here is where a device gets its numbers. On the site every
    device is a function of time; in a plugin the same geometry can be driven by
    what the instrument is actually doing — the step the sequencer is on, the
    level coming out of it. The device contract did not need to change to allow
    that, which is the whole argument for it being four methods.

    Threading: this is a message-thread component and reads nothing directly from
    the audio thread. A reactive device is responsible for getting its own state
    across that boundary lock-free.
*/
class PixelRack : public juce::Component,
                  private juce::Timer
{
public:
    enum class Dissolve { glitch, scatter, ash };

    /** Takes ownership of the device. */
    explicit PixelRack (std::unique_ptr<RackDevice> device);
    ~PixelRack() override;

    /** Cells across. Rows follow from the component's aspect. */
    void setGrid (int cols);
    /** Gap between pixels, as a fraction of a cell. */
    void setGap (float gap);
    /** Assemble once, then hold and idle — no dissolve loop. */
    void setHoldsForever (bool shouldHold);
    void setDissolve (Dissolve d);
    /** Frames per second for the idle animation. 30 is plenty for whole cells. */
    void setFrameRate (int fps);

    /**
        Override the pixel colour. Defaults to the foreground, which is what the
        mark uses on the website.

        Worth setting for anything large. The mark is a 200px badge on a page and
        near-white pixels read as a lit device; the same treatment across a
        1000px panel is a white wall that inverts the whole editor's tonal
        balance. Scale changes what the colour means.
    */
    void setPixelColour (juce::Colour);

    /** Re-reads palette colours. Call after a theme change. */
    void refreshColours();

    void paint (juce::Graphics&) override;
    void resized() override;
    void visibilityChanged() override;
    void parentHierarchyChanged() override;

private:
    void timerCallback() override;
    void rebuildCells();
    void startIfVisible();

    std::unique_ptr<RackDevice> device;

    int cols = 34;
    int rows = 20;
    float gap = 0.16f;
    bool holdsForever = false;
    Dissolve dissolve = Dissolve::glitch;
    int frameRate = 30;

    std::vector<RackCell> cells;
    std::vector<juce::uint8> carved;
    std::vector<RackAccentCell> accents;

    float cellW = 0.0f, cellH = 0.0f, px = 0.0f, offX = 0.0f, offY = 0.0f;

    juce::int64 startMs = 0;
    juce::String lastSignature;

    juce::Colour fg, panelGrey, screenGrey, accentColour;
    juce::Colour pixelOverride;
    bool hasPixelOverride = false;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PixelRack)
};

} // namespace aka
