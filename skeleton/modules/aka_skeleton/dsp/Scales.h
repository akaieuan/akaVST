#pragma once

#include "Engine.h"

namespace aka::dsp
{

/**
    Snap a pitch to the nearest degree of a scale.

    Ported from i4's ScaleQuantizer, which follows the Torso S-4 manual's scale
    list. In i4 this is a private helper that three engines happen to share —
    Tape's SPEED, Mosaic's PITCH and PATTERN, and Ring's tuning — and it is
    presented to the player nowhere. It is the clearest case in either plugin of
    something useful being hidden inside something else.

    The port drops i4's std::vector-per-scale for a flat table of bitmasks: one
    12-bit integer per scale, bit n set if semitone n is in it. A vector of
    floats is a cache miss and a size lookup for what is a membership test, and
    this runs per sample when a modulation signal is patched through it.
*/
struct Scales
{
    enum Id
    {
        Chromatic = 0, Major, Minor, Dorian, Lydian, Mixolydian, SuperLocrian,
        HexAeolian, HexDorian, Blues, Pentatonic, Hirajoshi, Kumoi, Iwato,
        WholeTone, Pelog, Tetratonic, Fifths, Octaves, Free, count
    };

    /**
        Twelve bits per scale, low bit is the root.

        Written as shifted literals rather than hex so each one can be read
        against the interval list it came from without a conversion step.
    */
    static constexpr unsigned mask (int id) noexcept
    {
        switch (id)
        {
            case Major:        return 0b101010110101u;  // 0 2 4 5 7 9 11
            case Minor:        return 0b010110101101u;  // 0 2 3 5 7 8 10
            case Dorian:       return 0b011010101101u;  // 0 2 3 5 7 9 10
            case Lydian:       return 0b101011010101u;  // 0 2 4 6 7 9 11
            case Mixolydian:   return 0b011010110101u;  // 0 2 4 5 7 9 10
            case SuperLocrian: return 0b010101011011u;  // 0 1 3 4 6 8 10
            case HexAeolian:   return 0b010110101001u;  // 0 3 5 7 8 10
            case HexDorian:    return 0b001010101101u;  // 0 2 3 5 7 9
            case Blues:        return 0b010011101001u;  // 0 3 5 6 7 10
            case Pentatonic:   return 0b001010010101u;  // 0 2 4 7 9
            case Hirajoshi:    return 0b000110001101u;  // 0 2 3 7 8
            case Kumoi:        return 0b001010001101u;  // 0 2 3 7 9
            case Iwato:        return 0b010001100011u;  // 0 1 5 6 10
            case WholeTone:    return 0b010101010101u;  // 0 2 4 6 8 10
            case Pelog:        return 0b000110001011u;  // 0 1 3 7 8
            case Tetratonic:   return 0b001001001001u;  // 0 3 6 9
            case Fifths:       return 0b000010000001u;  // 0 7
            case Octaves:      return 0b000000000001u;  // 0
            default:           return 0b111111111111u;  // Chromatic
        }
    }

    /**
        Snap `semitones` to the nearest degree, with `root` as degree zero.

        Free passes through untouched — the one setting that means "do not".
        Chromatic still rounds, because a chromatic quantiser that does nothing
        would be a second Free under a different name.

        The wrap case matters more than it looks: 11.5 semitones in a major
        scale is nearer the octave above than it is to the 11 below, and a
        search that only walks the mask misses it and pulls the note down a
        semitone. i4 handles this and it is worth carrying over.
    */
    static float snap (float semitones, int id) noexcept
    {
        if (id == Free) return semitones;
        if (id == Chromatic) return std::round (semitones);

        const unsigned m = mask (id);
        if (m == 0u) return std::round (semitones);

        const float octave = std::floor (semitones / 12.0f);
        const float rest   = semitones - octave * 12.0f;

        int best = 0;
        float bestDistance = 1.0e9f;
        for (int i = 0; i < 12; ++i)
        {
            if ((m & (1u << i)) == 0u) continue;
            const float d = std::fabs (rest - (float) i);
            if (d < bestDistance) { bestDistance = d; best = i; }
        }

        if (std::fabs (rest - 12.0f) < bestDistance) return (octave + 1.0f) * 12.0f;
        return octave * 12.0f + (float) best;
    }

    /** As above, but with a root offset — the block exposes both. */
    static float snapTo (float semitones, int id, int root) noexcept
    {
        const float r = (float) root;
        return snap (semitones - r, id) + r;
    }
};

} // namespace aka::dsp
