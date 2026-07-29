#pragma once

#include <juce_graphics/juce_graphics.h>
#include "Tokens.h"

namespace aka
{

/**
    The active theme and accent, and the colours that follow from them.

    bleep and i4 both already work this way — statics reassigned by a setter,
    read directly by paint code — and it is kept because it works and because
    migrating two plugins away from it buys nothing. The sharp edge is worth
    stating plainly: these are process-wide. Two instances of the same plugin in
    one session share them, so `setTheme` is a global act and every live editor
    has to be told to repaint.

    `accent` is resolved rather than stored, because an instrument owns exactly
    one and spending a second is the thing this is designed to prevent.
*/
class Palette
{
public:
    static int themeCount() noexcept { return aka::themeCount; }
    static const char* themeName (int i) noexcept { return themes[wrap (i)].name; }

    static int currentThemeIndex() noexcept { return themeIndex; }
    static const Theme& current() noexcept { return themes[themeIndex]; }

    static void setTheme (int i) noexcept { themeIndex = wrap (i); }

    static AccentId currentAccent() noexcept { return accentId; }
    static void setAccent (AccentId a) noexcept { accentId = a; }

    /** The instrument's one accent, at the three strengths it may be spent at. */
    static const Accent& accent() noexcept { return current().accents[accentId]; }

    static juce::Colour bgDeep()       { return c (current().bgDeep); }
    static juce::Colour bgPanel()      { return c (current().bgPanel); }
    static juce::Colour bgScreen()     { return c (current().bgScreen); }
    static juce::Colour divider()      { return c (current().divider); }
    static juce::Colour trackDim()     { return c (current().trackDim); }

    static juce::Colour textDim()      { return c (current().textDim); }
    static juce::Colour textMid()      { return c (current().textMid); }
    static juce::Colour textHi()       { return c (current().textHi); }
    static juce::Colour textOnAccent() { return c (current().textOnAccent); }

    static juce::Colour record()       { return c (current().record); }
    static juce::Colour recordSoft()   { return c (current().recordSoft); }
    static juce::Colour selected()     { return c (current().selected); }
    static juce::Colour selectedSoft() { return c (current().selectedSft); }
    static juce::Colour active()       { return c (current().active); }
    static juce::Colour activeSoft()   { return c (current().activeSoft); }

    static juce::Colour accentBase()   { return c (accent().base); }
    static juce::Colour accentSoft()   { return c (accent().soft); }
    static juce::Colour accentGlow()   { return c (accent().glow); }

    /** Any accent by id, for the rare case that genuinely needs a second. */
    static juce::Colour accentBase (AccentId a) { return c (current().accents[a].base); }

    static juce::Font mono (float size)
    {
        return juce::Font (juce::FontOptions (current().monoFontName, size, juce::Font::plain));
    }

    static juce::Font monoBold (float size)
    {
        return juce::Font (juce::FontOptions (current().monoFontName, size, juce::Font::bold));
    }

    /**
        The wordmark face: ultra-light sans, widely tracked. Only for a plugin's
        own name — it is a logotype, not a text style, and reads as noise
        anywhere else.
    */
    static juce::Font display (float size)
    {
        return juce::Font (juce::FontOptions ("Helvetica Neue", size, juce::Font::plain))
                   .withExtraKerningFactor (0.18f);
    }

private:
    static juce::Colour c (juce::uint32 argb) noexcept { return juce::Colour (argb); }
    static int wrap (int i) noexcept { return juce::jlimit (0, aka::themeCount - 1, i); }

    static inline int themeIndex = 0;
    static inline AccentId accentId = accentBlue;
};

} // namespace aka
