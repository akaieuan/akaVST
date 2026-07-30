#pragma once

#include "Engine.h"

namespace aka::dsp
{

/**
    Multi-mode oscillator. Per-sample render with phase tracking.

    Lifted from bleep's, which was already written without juce::dsp — the only
    changes are std::clamp for juce::jlimit and the constants above. That it
    ported in five minutes while FxChain could not port at all is the whole
    argument for the no-JUCE rule.

    Modes:
      Sine     — pure, no aliasing
      Triangle — bipolar from phase 0..1, no aliasing
      Saw      — naive saw with PolyBLEP correction
      Square   — pulse with variable width and PolyBLEP at both edges
      FM       — two-op: a sine modulator phase-modulates a sine carrier

    Nominally [-1, 1]; FM can exceed slightly at high index.
*/
class Oscillator
{
public:
    enum class Mode { Sine = 0, Triangle, Saw, Square, FM, numModes };

    void setSampleRate (double sr) noexcept { sampleRate = sr; updateIncrement(); }
    void setFrequency (float hz) noexcept   { frequency = hz > 0.0f ? hz : 0.0f; updateIncrement(); }
    void setMode (Mode m) noexcept          { mode = m; }
    void setMode (int i) noexcept           { mode = (Mode) clamp (i, 0, (int) Mode::numModes - 1); }
    void setPulseWidth (float pw) noexcept  { pulseWidth = clamp (pw, 0.05f, 0.95f); }
    void setFmRatio (float r) noexcept      { fmRatio = r > 0.0f ? r : 0.0f; }
    void setFmAmount (float a) noexcept     { fmAmount = a > 0.0f ? a : 0.0f; }

    void reset() noexcept { phase = 0.0; fmPhase = 0.0; wrapped = false; }

    /** Hard sync: the master reports a wrap, the slave resets on it. */
    bool didWrap() const noexcept { return wrapped; }
    void resetPhase() noexcept    { phase = 0.0; }

    /** One sample, and advance. */
    float tick() noexcept
    {
        const float out = render();

        phase += increment;
        wrapped = phase >= 1.0;
        if (wrapped) phase -= 1.0;

        fmPhase += increment * fmRatio;
        if (fmPhase >= 1.0) fmPhase -= 1.0;

        return out;
    }

private:
    void updateIncrement() noexcept
    {
        increment = sampleRate > 0.0 ? frequency / sampleRate : 0.0;
    }

    float render() noexcept
    {
        const float t  = (float) phase;
        const float dt = (float) increment;

        switch (mode)
        {
            case Mode::Sine:     return std::sin (t * twoPi);
            case Mode::Triangle: return 4.0f * std::fabs (t - 0.5f) - 1.0f;

            case Mode::Saw:      return (2.0f * t - 1.0f) - polyBlep (t, dt);

            case Mode::Square:
            {
                float y = t < pulseWidth ? 1.0f : -1.0f;
                y += polyBlep (t, dt);
                float t2 = t - pulseWidth;
                if (t2 < 0.0f) t2 += 1.0f;
                return y - polyBlep (t2, dt);
            }

            case Mode::FM:
            {
                const float mod = std::sin ((float) fmPhase * twoPi);
                return std::sin (t * twoPi + mod * fmAmount * twoPi);
            }

            default: return 0.0f;
        }
    }

    /**
        PolyBLEP: the band-limited step that keeps a naive saw from aliasing.

        A discontinuity between samples is an infinite-bandwidth event, and at
        44.1kHz everything above Nyquist folds back down as inharmonic grit. This
        smears the step across the two samples either side of it, which is enough
        to make a saw usable across the keyboard.
    */
    static float polyBlep (float t, float dt) noexcept
    {
        if (dt <= 0.0f) return 0.0f;

        if (t < dt)
        {
            const float x = t / dt;
            return x + x - x * x - 1.0f;
        }
        if (t > 1.0f - dt)
        {
            const float x = (t - 1.0f) / dt;
            return x * x + x + x + 1.0f;
        }
        return 0.0f;
    }

    double sampleRate = 44100.0;
    double phase = 0.0, fmPhase = 0.0, increment = 0.0;
    float frequency = 440.0f, pulseWidth = 0.5f, fmRatio = 2.0f, fmAmount = 0.0f;
    Mode mode = Mode::Saw;
    bool wrapped = false;
};

} // namespace aka::dsp
