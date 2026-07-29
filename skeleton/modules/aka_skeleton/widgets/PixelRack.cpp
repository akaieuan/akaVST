#include "PixelRack.h"

namespace aka
{

/* ---- timeline (seconds), same shape as the site's ------------------------ */
static constexpr float kHold     = 9.0f;
static constexpr float kDissolve = 1.9f;
static constexpr float kGone     = 0.5f;
static constexpr float kReform   = 1.6f;
static constexpr float kTotal    = kHold + kDissolve + kGone + kReform;
static constexpr float kSpread   = 0.55f;

PixelRack::PixelRack (std::unique_ptr<RackDevice> d)
    : device (std::move (d))
{
    setOpaque (false);
    setInterceptsMouseClicks (false, false);
    accents.reserve (256);
    refreshColours();
}

PixelRack::~PixelRack() { stopTimer(); }

void PixelRack::setGrid (int c)             { cols = juce::jmax (6, c); rebuildCells(); repaint(); }
void PixelRack::setGap (float g)            { gap = juce::jlimit (0.0f, 0.6f, g); rebuildCells(); repaint(); }
void PixelRack::setHoldsForever (bool h)    { holdsForever = h; repaint(); }
void PixelRack::setDissolve (Dissolve d)    { dissolve = d; rebuildCells(); repaint(); }
void PixelRack::setFrameRate (int fps)      { frameRate = juce::jlimit (1, 60, fps); startIfVisible(); }

void PixelRack::setPixelColour (juce::Colour c)
{
    pixelOverride = c;
    hasPixelOverride = true;
    refreshColours();
}

/**
    Re-read the palette.

    Called at the top of every paint rather than only on demand. Caching theme
    colours in a member is how a component ends up permanently wearing whichever
    theme happened to be active when it was constructed — the exact fault that
    left this screen black on the light theme, and the same one that makes a
    plugin's hundred construction-time setColour calls go stale. Reading at paint
    time costs a few Colour constructions per frame and cannot be wrong.

    The pixel colour is the exception: an override is a deliberate choice by the
    host component, so it wins, but it is resolved through the palette so it
    still tracks the theme.
*/
void PixelRack::refreshColours()
{
    fg           = hasPixelOverride ? pixelOverride : Palette::textHi();
    panelGrey    = Palette::bgPanel();
    screenGrey   = Palette::bgScreen();
    accentColour = Palette::accentBase();
    lastSignature = {};
    repaint();
}

void PixelRack::resized()  { rebuildCells(); }

void PixelRack::visibilityChanged()        { startIfVisible(); }
void PixelRack::parentHierarchyChanged()   { startIfVisible(); }

/**
    Only run while actually on screen.

    The site gates its loop on an IntersectionObserver plus visibilitychange for
    the same reason: a mark nobody is looking at should cost nothing. In a plugin
    that is not politeness, it is the difference between a free editor and one
    that burns a core per instance in a thirty-track session.
*/
void PixelRack::startIfVisible()
{
    if (isShowing())
    {
        if (! isTimerRunning())
        {
            startMs = juce::Time::currentTimeMillis();
            startTimerHz (frameRate);
        }
    }
    else
    {
        stopTimer();
    }
}

void PixelRack::rebuildCells()
{
    cells.clear();
    carved.clear();

    const auto w = (float) getWidth();
    const auto h = (float) getHeight();
    if (w <= 0.0f || h <= 0.0f) return;

    const float ratio = h / w;
    rows = juce::jmax (6, juce::roundToInt ((float) cols * ratio));

    cellW = w / (float) cols;
    cellH = h / (float) rows;
    px = juce::jmin (cellW, cellH) * (1.0f - gap);
    offX = (cellW - px) * 0.5f;
    offY = (cellH - px) * 0.5f;

    const auto s = field::screen (cols, rows);

    for (int j = 0; j < rows; ++j)
    {
        for (int i = 0; i < cols; ++i)
        {
            const float nx = ((i + 0.5f) / (float) cols) * 2.0f - 1.0f;
            const float ny = ((j + 0.5f) / (float) rows) * 2.0f - 1.0f;

            // Negative treatment throughout: solid panel, device carved out of
            // it. The carve runs per frame, so a device is free to change its
            // face over time without the cell set being resampled.
            if (! field::inPanel (nx, ny, ratio)) continue;

            const float seed = (float) (i * 37 + j * 101);
            const float r1 = field::hash (seed);

            float delay;
            if (dissolve == Dissolve::ash)
                delay = ((ny + 1.0f) * 0.5f) * 0.75f + r1 * 0.25f;
            else if (dissolve == Dissolve::scatter)
                delay = r1;
            else
                delay = field::hash (std::floor ((nx + 1.0f) * 6.0f)) * 0.7f + r1 * 0.3f;

            RackCell c;
            c.i = i;
            c.j = j;
            c.x = (float) i * cellW;
            c.y = (float) j * cellH;
            c.interior = i >= s.x0 && i <= s.x1 && j >= s.y0 && j <= s.y1;
            c.seed = seed;
            c.r1 = r1;
            c.r2 = field::hash (seed + 1.0f);
            c.r3 = field::hash (seed + 2.0f);
            c.delay = delay;
            cells.push_back (c);
        }
    }

    carved.assign (cells.size(), 0);

    cellAt.assign ((size_t) (cols * rows), -1);
    for (size_t k = 0; k < cells.size(); ++k)
        cellAt[(size_t) (cells[k].j * cols + cells[k].i)] = (int) k;

    lastSignature = {};
}

void PixelRack::timerCallback()
{
    if (device == nullptr || cells.empty()) return;

    const float elapsed = (float) (juce::Time::currentTimeMillis() - startMs) * 0.001f;
    const float hold = holdsForever ? elapsed : std::fmod (elapsed, kTotal);

    // Skip the repaint entirely when the quantised state has not moved. Whole
    // cells mean most frames are identical to the one before.
    const auto sig = device->signature (hold);
    if (sig == lastSignature) return;
    lastSignature = sig;

    repaint();
}

void PixelRack::paint (juce::Graphics& g)
{
    if (device == nullptr || cells.empty()) return;

    // Every frame, not once at construction. See refreshColours().
    fg           = hasPixelOverride ? pixelOverride : Palette::textHi();
    panelGrey    = Palette::bgPanel();
    screenGrey   = Palette::bgScreen();
    accentColour = Palette::accentBase();

    const float elapsed = (float) (juce::Time::currentTimeMillis() - startMs) * 0.001f;
    const float cycle = holdsForever ? 0.0f : std::fmod (elapsed, kTotal);
    const float hold = holdsForever ? elapsed : cycle;

    // Where in the assemble/hold/dissolve/reform loop we are, as 0 assembled to
    // 1 fully gone.
    float t = 0.0f;
    if (! holdsForever)
    {
        if (cycle < kHold)                              t = 0.0f;
        else if (cycle < kHold + kDissolve)             t = (cycle - kHold) / kDissolve;
        else if (cycle < kHold + kDissolve + kGone)     t = 1.0f;
        else                                            t = 1.0f - (cycle - kHold - kDissolve - kGone) / kReform;
    }

    // One carve pass, read by both the substrate and the pixels.
    for (size_t k = 0; k < cells.size(); ++k)
    {
        const auto& c = cells[k];
        carved[k] = (c.interior && device->carve (c.i, c.j, hold)) ? 1 : 0;
    }

    /* ---- substrate ------------------------------------------------------
       The plate the pixels sit on. Without it the carved face, the gaps
       between pixels and the ground outside the panel are all the same
       nothing, and the mark stops reading as a device. Two passes rather than
       one so fillStyle is set twice per frame instead of once per cell.       */
    const float substrateAlpha = 1.0f - field::clamp01 (t);
    if (substrateAlpha > 0.01f)
    {
        g.setColour (panelGrey.withMultipliedAlpha (substrateAlpha));
        for (size_t k = 0; k < cells.size(); ++k)
            if (! carved[k])
                g.fillRect (cells[k].x, cells[k].y, cellW, cellH);

        g.setColour (screenGrey.withMultipliedAlpha (substrateAlpha));
        for (size_t k = 0; k < cells.size(); ++k)
            if (carved[k])
                g.fillRect (cells[k].x, cells[k].y, cellW, cellH);
    }

    /* ---- pixels ---------------------------------------------------------- */
    const auto s = field::screen (cols, rows);

    for (size_t k = 0; k < cells.size(); ++k)
    {
        if (carved[k]) continue;

        const auto& c = cells[k];
        const float ct = field::clamp01 (t * (1.0f + kSpread) - c.delay * kSpread);

        float x = c.x, y = c.y, a = 1.0f, scale = 1.0f;

        if (ct <= 0.0f)
        {
            const auto d = device->idle (c, hold);
            if (d.x != 0 || d.y != 0)
            {
                // Interior cells slide under the frame rather than over it: once
                // a cell leaves the screen it is simply not drawn, so the panel
                // outline stays exactly as sampled.
                const int ni = c.i + d.x;
                const int nj = c.j + d.y;
                if (ni < s.x0 || ni > s.x1 || nj < s.y0 || nj > s.y1) continue;
                x += (float) d.x * cellW;
                y += (float) d.y * cellH;
            }
        }
        else if (dissolve == Dissolve::ash)
        {
            const float e = field::easeInCubic (ct);
            y -= e * (float) getHeight() * (0.55f + c.r2 * 0.5f);
            x += std::sin (ct * (4.0f + c.r2 * 5.0f) + c.seed) * (float) getWidth() * 0.045f * ct;
            a = 1.0f - ct;
            scale = 1.0f - ct * 0.5f;
        }
        else if (dissolve == Dissolve::scatter)
        {
            const float e = field::easeOutCubic (ct);
            y += 0.85f * (float) getHeight() * e * (0.8f + c.r2 * 0.6f);
            x += (c.r3 - 0.5f) * (float) getWidth() * 0.3f * e;
            a = 1.0f - field::easeInCubic (ct) * 0.9f;
        }
        else
        {
            // glitch: horizontal tearing in whole cells, the house default
            const float stepped = std::floor (ct * 9.0f) / 9.0f;
            if (stepped > 0.0f)
            {
                x += std::round ((field::hash (c.seed + stepped * 53.0f) - 0.5f) * 9.0f * stepped) * cellW;
                if (field::hash (c.seed + stepped * 17.0f) > 0.82f)
                    y += std::round ((field::hash (c.seed + stepped * 29.0f) - 0.5f) * 4.0f) * cellH;
            }
            const float flick = field::hash (c.seed + std::floor (ct * 14.0f) * 7.0f);
            a = ct >= 0.99f ? 0.0f : (flick > ct * 0.9f ? 1.0f : 0.15f);
        }

        if (a <= 0.01f) continue;

        const float sz = px * scale;
        g.setColour (fg.withMultipliedAlpha (a));
        g.fillRect (x + offX + (px - sz) * 0.5f, y + offY + (px - sz) * 0.5f, sz, sz);
    }

    /* ---- accents ---------------------------------------------------------
       On top of the panel, and only while assembled: mid-dissolve they would be
       the one thing standing still.                                          */
    if (t <= 0.0f)
    {
        accents.clear();
        device->overlay (hold, accents);

        for (const auto& a : accents)
        {
            // Only where the panel actually is. A device addresses the grid and
            // has no idea which cells the outline kept, so anything it places in
            // a corner the sampling dropped would paint outside the silhouette
            // and read as a block that has escaped the screen.
            if (a.i < 0 || a.i >= cols || a.j < 0 || a.j >= rows) continue;
            if (cellAt[(size_t) (a.j * cols + a.i)] < 0) continue;

            const float ax = (float) a.i * cellW;
            const float ay = (float) a.j * cellH;

            // Re-lay the plate under the cell first. An accent replaces one
            // pixel of the panel; it does not blow a hole through to whatever
            // is behind the component.
            g.setColour (panelGrey);
            g.fillRect (ax, ay, cellW, cellH);

            const auto colour = a.accent >= 0 && a.accent < numAccents
                              ? juce::Colour (Palette::current().accents[a.accent].base)
                              : accentColour;

            g.setColour (colour.withMultipliedAlpha (a.alpha));
            g.fillRect (ax + offX, ay + offY, px, px);
        }
    }
}

} // namespace aka
