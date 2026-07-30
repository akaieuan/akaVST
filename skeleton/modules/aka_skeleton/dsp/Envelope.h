#pragma once

#include "Engine.h"

namespace aka::dsp
{

/**
    ADSR with a shape control.

    Curve is the parameter the Envelope block already exposes and nothing was
    reading. At 0.5 each stage is linear; below, the segment bends toward
    exponential; above, toward logarithmic. It matters more than it sounds like
    it should — a linear decay is the sound of a synth that was never voiced,
    because nothing in the physical world decays in a straight line.

    Times are exponential in the control: 1ms at 0 to 12s at 1. Linear times put
    everything usable in the bottom eighth of the knob.
*/
class Envelope
{
public:
    enum class Stage { Idle = 0, Attack, Decay, Sustain, Release };

    void setSampleRate (double sr) noexcept { sampleRate = sr > 0.0 ? sr : 44100.0; }

    void setAttack (float v01) noexcept  { attackTime  = timeFrom01 (v01, 0.001f, 8.0f); }
    void setDecay (float v01) noexcept   { decayTime   = timeFrom01 (v01, 0.002f, 12.0f); }
    void setSustain (float v01) noexcept { sustain     = clamp (v01, 0.0f, 1.0f); }
    void setRelease (float v01) noexcept { releaseTime = timeFrom01 (v01, 0.003f, 12.0f); }
    void setCurve (float v01) noexcept   { curve       = clamp (v01, 0.0f, 1.0f); }

    void noteOn() noexcept  { stage = Stage::Attack; progress = 0.0f; from = level; }
    void noteOff() noexcept { if (stage != Stage::Idle) { stage = Stage::Release; progress = 0.0f; from = level; } }

    void reset() noexcept { stage = Stage::Idle; level = 0.0f; progress = 0.0f; from = 0.0f; }

    bool isActive() const noexcept { return stage != Stage::Idle; }
    float value() const noexcept   { return level; }

    float tick() noexcept
    {
        const float dt = 1.0f / (float) sampleRate;

        switch (stage)
        {
            case Stage::Idle:
                level = 0.0f;
                break;

            case Stage::Attack:
                progress += dt / attackTime;
                if (progress >= 1.0f) { level = 1.0f; stage = Stage::Decay; progress = 0.0f; from = 1.0f; }
                else level = lerp (from, 1.0f, shape (progress));
                break;

            case Stage::Decay:
                progress += dt / decayTime;
                if (progress >= 1.0f) { level = sustain; stage = Stage::Sustain; }
                else level = lerp (from, sustain, shape (progress));
                break;

            case Stage::Sustain:
                level = sustain;
                break;

            case Stage::Release:
                progress += dt / releaseTime;
                if (progress >= 1.0f) { level = 0.0f; stage = Stage::Idle; }
                else level = lerp (from, 0.0f, shape (progress));
                break;
        }

        return level;
    }

private:
    /** 0.5 is a straight line; either side bends the segment. */
    float shape (float t) const noexcept
    {
        if (curve > 0.49f && curve < 0.51f) return t;
        const float e = 0.35f + (1.0f - curve) * 2.4f;
        return std::pow (clamp (t, 0.0f, 1.0f), e);
    }

    static float timeFrom01 (float v, float lo, float hi) noexcept
    {
        return lo * std::pow (hi / lo, clamp (v, 0.0f, 1.0f));
    }

    double sampleRate = 44100.0;
    float attackTime = 0.01f, decayTime = 0.2f, releaseTime = 0.3f;
    float sustain = 0.7f, curve = 0.5f;
    float level = 0.0f, progress = 0.0f, from = 0.0f;
    Stage stage = Stage::Idle;
};

} // namespace aka::dsp
