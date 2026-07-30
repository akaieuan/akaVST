#pragma once

#include "Engine.h"

namespace aka::dsp
{

/**
    Topology-preserving state variable filter, after Zavalishin.

    One structure, five outputs. bleep uses juce::dsp::LadderFilter, which sounds
    good and gives exactly one response — every mode in bleep's Mode parameter is
    the same ladder with a different slope. An SVF hands back lowpass, highpass,
    bandpass and notch from the same two integrators for free, which is what the
    Filter block's mode list actually promises.

    Zero-delay feedback, so resonance stays stable up to self-oscillation and the
    cutoff can be modulated at audio rate without the filter blowing up — which
    matters the moment an LFO gets patched to it.
*/
class Filter
{
public:
    enum class Mode { LP24 = 0, LP12, HP12, BP12, Notch, numModes };

    void setSampleRate (double sr) noexcept { sampleRate = sr > 0.0 ? sr : 44100.0; update(); }
    void setMode (int i) noexcept           { mode = (Mode) clamp (i, 0, (int) Mode::numModes - 1); }

    /** Hertz, not normalised — callers modulate in octaves and need real units. */
    void setCutoff (float hz) noexcept
    {
        const float nyquist = (float) sampleRate * 0.49f;
        cutoff = clamp (hz, 20.0f, nyquist);
        update();
    }

    void setResonance (float v01) noexcept
    {
        // Never quite zero damping: at exactly zero the filter self-oscillates
        // and never stops, which reads as a broken instrument rather than a
        // feature. 0.5 is Butterworth, the bottom of the useful range.
        k = 2.0f - 1.94f * clamp (v01, 0.0f, 1.0f);
        update();
    }

    void reset() noexcept { ic1 = ic2 = ic1b = ic2b = 0.0f; }

    float tick (float x) noexcept
    {
        const float first = stage (x, ic1, ic2);
        // LP24 is two 12dB sections in series; every other mode is one.
        return mode == Mode::LP24 ? stage (first, ic1b, ic2b) : first;
    }

private:
    float stage (float x, float& s1, float& s2) noexcept
    {
        const float hp = (x - (2.0f * k + g) * s1 - s2) * a;
        const float bp = g * hp + s1;
        s1 = flush (g * hp + bp);
        const float lp = g * bp + s2;
        s2 = flush (g * bp + lp);

        switch (mode)
        {
            case Mode::LP24:
            case Mode::LP12:  return lp;
            case Mode::HP12:  return hp;
            case Mode::BP12:  return bp;
            case Mode::Notch: return hp + lp;
            default:          return lp;
        }
    }

    void update() noexcept
    {
        g = std::tan (pi * cutoff / (float) sampleRate);
        a = 1.0f / (1.0f + g * (g + 2.0f * k));
    }

    double sampleRate = 44100.0;
    float cutoff = 8000.0f, k = 1.0f, g = 0.1f, a = 1.0f;
    float ic1 = 0.0f, ic2 = 0.0f, ic1b = 0.0f, ic2b = 0.0f;
    Mode mode = Mode::LP24;
};

} // namespace aka::dsp
