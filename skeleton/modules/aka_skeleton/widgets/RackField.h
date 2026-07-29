#pragma once

#include <juce_graphics/juce_graphics.h>
#include <cmath>

namespace aka
{

/**
    Shared geometry for every rack device. Ported from the site's field.ts.

    Two rules hold across all of them. Everything is laid out in whole cells
    rather than normalised space, so a block is always an exact number of cells
    and nothing aliases into mush at small sizes. And every device draws inside
    an inset screen, so the panel keeps an unbroken frame: that frame is what
    makes these read as hardware, and it is what idle motion is clipped to.
*/
namespace field
{

/**
    The site's PRNG, reproduced exactly.

    Same constants and the same sin-fract trick as field.ts, because a device
    ported from the web should dissolve in the same pattern as the mark it came
    from. Divergence here would be invisible until the two were put side by side.
*/
inline float hash (float n) noexcept
{
    const float s = std::sin (n * 127.1f + 311.7f) * 43758.5453f;
    return s - std::floor (s);
}

inline float clamp01 (float v) noexcept { return juce::jlimit (0.0f, 1.0f, v); }
inline float easeInCubic (float t) noexcept { return t * t * t; }
inline float easeOutCubic (float t) noexcept { return 1.0f - std::pow (1.0f - t, 3.0f); }

/** The panel outline: a rounded rectangle, tested in aspect-corrected space. */
inline bool inPanel (float nx, float ny, float ratio) noexcept
{
    const float halfW = 0.94f;
    const float halfH = 0.94f * ratio;
    const float r = juce::jmin (halfW, halfH) * 0.26f;
    const float ax = std::abs (nx);
    const float ay = std::abs (ny * ratio);

    if (ax > halfW || ay > halfH) return false;

    const float cx = halfW - r;
    const float cy = halfH - r;
    if (ax <= cx || ay <= cy) return true;

    return std::hypot (ax - cx, ay - cy) <= r;
}

/** The inset area a device draws into, in cell indices, inclusive. */
struct Screen
{
    int x0, x1, y0, y1;
    /** Width and height in cells. */
    int w, h;
};

inline Screen screen (int cols, int rows) noexcept
{
    const int padX = juce::jmax (2, juce::roundToInt (cols * 0.13f));
    const int padY = juce::jmax (1, juce::roundToInt (rows * 0.15f));
    const int x0 = padX;
    const int x1 = cols - 1 - padX;
    const int y0 = padY;
    const int y1 = rows - 1 - padY;
    return { x0, x1, y0, y1, x1 - x0 + 1, y1 - y0 + 1 };
}

/** 2 cells on, 1 cell off: the smallest block that still reads as a block. */
inline constexpr int unitCells = 3;

/** A centred row of equal blocks, sized to whatever the screen can hold. */
struct BlockRun
{
    /** First column of the first block. */
    int x0;
    /** Total width in cells, trailing gap trimmed. */
    int span;
    int count;
};

inline BlockRun blockRun (const Screen& s, int minCount = 3, int unit = unitCells) noexcept
{
    const int count = juce::jmax (minCount, s.w / unit);
    const int span = count * unit - 1;
    return { s.x0 + (s.w - span) / 2, span, count };
}

/** Index of the block a column falls in, or -1 in a gap or outside the run. */
inline int blockAt (int i, const BlockRun& run, int unit = unitCells) noexcept
{
    const int d = i - run.x0;
    if (d < 0 || d > run.span) return -1;
    if (d % unit >= unit - 1) return -1;
    return d / unit;
}

/** Is this cell inside a rectangle given in cell indices, inclusive? */
inline bool inRect (int i, int j, int x0, int y0, int x1, int y1) noexcept
{
    return i >= x0 && i <= x1 && j >= y0 && j <= y1;
}

} // namespace field
} // namespace aka
