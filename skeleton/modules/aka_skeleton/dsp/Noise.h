#pragma once

#include "Engine.h"
#include <cstdint>

namespace aka::dsp
{

/**
    The four noises enzyme's Dirt block names.

    White is the reference. The other three are what actually gets used: a synth
    wants texture with a shape to it, and flat noise has none. Crackle is sparse
    impulses through a decay, Geiger is the same but Poisson-sparse and much
    louder per hit, Burst is filtered white gated by its own slow envelope.

    xorshift rather than rand(): rand() locks, allocates on some platforms, and
    is not the same sequence twice across compilers. In an audio callback that
    is three separate problems.
*/
class Noise
{
public:
    enum class Kind { White = 0, Crackle, Geiger, Burst, numKinds };

    void setSampleRate (double sr) noexcept { sampleRate = sr > 0.0 ? sr : 44100.0; }
    void setKind (int i) noexcept           { kind = (Kind) clamp (i, 0, (int) Kind::numKinds - 1); }

    /** Tilts the spectrum: 0 is dark, 1 is bright. */
    void setColour (float v01) noexcept     { colour = clamp (v01, 0.0f, 1.0f); }

    void reset() noexcept { lp = 0.0f; env = 0.0f; }

    float tick() noexcept
    {
        const float w = white();

        switch (kind)
        {
            case Kind::White: break;

            case Kind::Crackle:
                // Sparse impulses through a decay: a click that rings a little
                // reads as dust on a surface, where a bare click reads as a bug.
                if (uniform() > 0.9985f) env = 1.0f;
                env *= 0.9992f;
                return tilt (w * env);

            case Kind::Geiger:
                if (uniform() > 0.99975f) env = 1.0f;
                env *= 0.996f;
                return tilt (w * env * 1.8f);

            case Kind::Burst:
                // Gated by its own slow wander, so it comes and goes.
                env = env * 0.99995f + (uniform() > 0.99993f ? 1.0f : 0.0f);
                return tilt (w * clamp (env, 0.0f, 1.0f));

            default: break;
        }

        return tilt (w);
    }

private:
    /** A one-pole, crossfaded against the dry signal. Cheaper than two filters. */
    float tilt (float x) noexcept
    {
        const float c = 0.02f + colour * 0.9f;
        lp = flush (lp + c * (x - lp));
        return lerp (lp, x, colour);
    }

    float white() noexcept { return uniform() * 2.0f - 1.0f; }

    float uniform() noexcept
    {
        state ^= state << 13;
        state ^= state >> 17;
        state ^= state << 5;
        return (float) (state & 0xffffff) / (float) 0x1000000;
    }

    double sampleRate = 44100.0;
    std::uint32_t state = 0x9e3779b9u;
    float lp = 0.0f, env = 0.0f, colour = 0.5f;
    Kind kind = Kind::White;
};

} // namespace aka::dsp
