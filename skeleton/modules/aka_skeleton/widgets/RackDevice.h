#pragma once

#include <juce_core/juce_core.h>
#include <vector>

namespace aka
{

/** One cell of the sampled panel. */
struct RackCell
{
    /** Cell index in the grid. */
    int i, j;
    /** Top-left in component pixels. */
    float x, y;
    /** Inside the inset screen, so it may animate. Frame cells never move. */
    bool interior;
    float seed, r1, r2, r3;
    /** Position in the dissolve stagger, 0..1. */
    float delay;
};

/** A cell painted in the accent colour, over the top of the panel. */
struct RackAccentCell
{
    int i, j;
    float alpha = 1.0f;
};

/**
    The contract between the rack engine and the devices it draws.

    Ported unchanged from the site's types.ts, and deliberately still only four
    methods. The engine owns everything generic — sampling the panel into cells,
    the assemble/hold/dissolve timeline, visibility gating, colour, and the paint
    loop. A device owns only what makes it that instrument, and the engine never
    learns what any device is.

    That separation is what lets a device driven by live audio sit beside one
    driven by a clock without the engine knowing the difference. On the web every
    device is a function of `t` alone; here `t` is still passed, but nothing stops
    an implementation ignoring it and reading a sequencer instead.
*/
class RackDevice
{
public:
    virtual ~RackDevice() = default;

    /** Is this cell cut away right now? Evaluated per painted frame. */
    virtual bool carve (int i, int j, float t) = 0;

    /** Whole-cell displacement while assembled, so the grid never softens. */
    virtual juce::Point<int> idle (const RackCell& c, float t) = 0;

    /** Cells drawn in the accent colour after the main pass. */
    virtual void overlay (float t, std::vector<RackAccentCell>& out) = 0;

    /**
        The quantised state of the animation. An identical signature means an
        identical frame, so the loop can skip the repaint entirely. Return a
        constant for a device that does not animate.

        This matters more here than on the web: a plugin editor redrawing a pixel
        grid at 60fps for no reason is real CPU in a session with thirty tracks.
    */
    virtual juce::String signature (float t) = 0;
};

} // namespace aka
