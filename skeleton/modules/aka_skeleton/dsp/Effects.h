#pragma once

#include "Delays.h"

namespace aka::dsp
{

/**
    The bus effects.

    Every one of these is stereo and in place, because that is where they run:
    once on the summed signal, after the voices. They share Line, OnePole,
    Allpass, Fdn and Dynamics from Delays.h — which is why chorus, flanger,
    phaser and delay are a few dozen lines each rather than four ring buffers.

    bleep's FxChain wrapped juce::dsp for all of this. None of it could be
    lifted, which is what made the no-JUCE rule pay for itself: what is here is
    ours and compiles anywhere.
*/

/** A slow sine for modulating a delay. Its own, so effects do not share phase. */
struct Sweep
{
    void setRate (float hz, double sr) noexcept { inc = hz / (float) sr; }
    float tick() noexcept
    {
        phase += inc;
        if (phase >= 1.0f) phase -= 1.0f;
        return std::sin (phase * twoPi);
    }
    /** Quarter-cycle apart, so the two channels never agree. */
    float quadrature() const noexcept { return std::sin ((phase + 0.25f) * twoPi); }
    void reset() noexcept { phase = 0.0f; }
    float phase = 0.0f, inc = 0.001f;
};

/** Delay: Time, Feedback, Spread, Tone, Mix, Sync. */
class DelayEngine final : public Engine
{
public:
    void prepare (double sr, int) override
    {
        sampleRate = sr;
        left.prepare (sr, 2.5f);
        right.prepare (sr, 2.5f);
        tone.setCutoff (6000.0f, sr);
    }
    void reset() override { left.reset(); right.reset(); tone.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: time = 0.02f + v * v * 1.8f; break;   // squared: the short end is where the detail is
            case 1: feedback = v * 0.92f; break;
            case 2: spread = v; break;
            case 3: tone.setCutoff (hzFrom01 (v, 400.0f, 16000.0f), sampleRate); break;
            case 4: mix = v; break;
            case 5: /* Sync — needs a transport the delay can see. */ break;
            default: break;
        }
    }

    void process (float* l, float* r, int n) override
    {
        // The two sides run at slightly different lengths. Equal lengths give a
        // delay that sits in the middle of the head; a few percent apart and it
        // opens out, which is the whole reason a stereo delay is stereo.
        const float dl = time * (float) sampleRate;
        const float dr = time * (1.0f + spread * 0.34f) * (float) sampleRate;

        for (int i = 0; i < n; ++i)
        {
            const float wl = left.read (dl), wr = right.read (dr);
            left.push (l[i] + tone.tick (wr) * feedback);   // crossed, so it ping-pongs
            right.push (r[i] + wl * feedback);
            l[i] = lerp (l[i], wl, mix);
            r[i] = lerp (r[i], wr, mix);
        }
    }

private:
    Line left, right;
    OnePole tone;
    double sampleRate = 44100.0;
    float time = 0.3f, feedback = 0.35f, spread = 0.5f, mix = 0.25f;
};

/** Reverb: Size, Decay, Damp, Pre, Width, Mix. */
class ReverbEngine final : public Engine
{
public:
    void prepare (double sr, int) override { fdn.prepare (sr); }
    void reset() override { fdn.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: fdn.setSize (v); break;
            case 1: fdn.setDecay (v); break;
            case 2: fdn.setDamping (v); break;
            case 3: fdn.setPreDelay (v); break;
            case 4: fdn.setWidth (v); break;
            case 5: mix = v; break;
            default: break;
        }
    }

    void process (float* l, float* r, int n) override
    {
        for (int i = 0; i < n; ++i)
        {
            float wl = 0.0f, wr = 0.0f;
            fdn.process ((l[i] + r[i]) * 0.5f, wl, wr);
            l[i] = lerp (l[i], wl, mix);
            r[i] = lerp (r[i], wr, mix);
        }
    }

private:
    Fdn fdn;
    float mix = 0.3f;
};

/** Chorus: Rate, Depth, Voices, Spread, Mix. */
class ChorusEngine final : public Engine
{
public:
    void prepare (double sr, int) override
    {
        sampleRate = sr;
        for (auto& l : lines) l.prepare (sr, 0.1f);
        for (int i = 0; i < 3; ++i) sweep[i].setRate (0.4f + (float) i * 0.13f, sr);
    }
    void reset() override { for (auto& l : lines) l.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: rate = hzFrom01 (v, 0.05f, 6.0f);
                    for (int k = 0; k < 3; ++k) sweep[k].setRate (rate * (1.0f + (float) k * 0.27f), sampleRate);
                    break;
            case 1: depth = v; break;
            case 2: voices = 1 + (int) (v * 2.999f); break;
            case 3: spread = v; break;
            case 4: mix = v; break;
            default: break;
        }
    }

    void process (float* l, float* r, int n) override
    {
        for (int i = 0; i < n; ++i)
        {
            const float in = (l[i] + r[i]) * 0.5f;
            float wetL = 0.0f, wetR = 0.0f;

            for (int k = 0; k < voices; ++k)
            {
                const float m = sweep[k].tick();
                // 7ms centre with a few milliseconds of swing — below about 5ms
                // it is a flanger and above about 20 it is a doubler.
                const float base = (0.007f + (float) k * 0.003f) * (float) sampleRate;
                const float swing = depth * 0.004f * (float) sampleRate;
                lines[k].push (in);
                wetL += lines[k].read (base + m * swing);
                wetR += lines[k].read (base + sweep[k].quadrature() * swing);
            }

            const float g = 1.0f / (float) voices;
            l[i] = lerp (l[i], lerp (wetL * g, wetR * g, spread * 0.5f), mix);
            r[i] = lerp (r[i], lerp (wetR * g, wetL * g, spread * 0.5f), mix);
        }
    }

private:
    Line lines[3];
    Sweep sweep[3];
    double sampleRate = 44100.0;
    float rate = 0.4f, depth = 0.4f, spread = 0.6f, mix = 0.3f;
    int voices = 2;
};

/** Flanger: Rate, Depth, Feedback, Mix. A chorus with a short line and feedback. */
class FlangerEngine final : public Engine
{
public:
    void prepare (double sr, int) override { sampleRate = sr; line.prepare (sr, 0.05f); sweep.setRate (0.2f, sr); }
    void reset() override { line.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: sweep.setRate (hzFrom01 (v, 0.02f, 4.0f), sampleRate); break;
            case 1: depth = v; break;
            case 2: feedback = (v * 2.0f - 1.0f) * 0.92f; break;   // negative sounds hollow, and that is a sound
            case 3: mix = v; break;
            default: break;
        }
    }

    void process (float* l, float* r, int n) override
    {
        for (int i = 0; i < n; ++i)
        {
            const float m = sweep.tick();
            const float d = (0.0005f + depth * 0.006f * (0.5f + 0.5f * m)) * (float) sampleRate;
            const float wet = line.read (d);
            line.push ((l[i] + r[i]) * 0.5f + wet * feedback);
            l[i] = lerp (l[i], wet, mix);
            r[i] = lerp (r[i], wet, mix);
        }
    }

private:
    Line line;
    Sweep sweep;
    double sampleRate = 44100.0;
    float depth = 0.5f, feedback = 0.45f, mix = 0.4f;
};

/** Phaser: Rate, Depth, Stages, Feedback, Mix. */
class PhaserEngine final : public Engine
{
public:
    void prepare (double sr, int) override { sampleRate = sr; sweep.setRate (0.25f, sr); reset(); }
    void reset() override { for (auto& a : stages) a.reset(); last = 0.0f; }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: sweep.setRate (hzFrom01 (v, 0.02f, 6.0f), sampleRate); break;
            case 1: depth = v; break;
            case 2: count = (int[]) { 4, 6, 8, 12 }[clamp ((int) (v * 3.999f), 0, 3)]; break;
            case 3: feedback = v * 0.85f; break;
            case 4: mix = v; break;
            default: break;
        }
    }

    void process (float* l, float* r, int n) override
    {
        for (int i = 0; i < n; ++i)
        {
            // The notches sweep because the allpass coefficient does. Between
            // 200Hz and 2kHz is where a phaser is recognisably one.
            const float hz = hzFrom01 (0.5f + sweep.tick() * 0.5f * depth, 200.0f, 2000.0f);
            const float c = (std::tan (pi * hz / (float) sampleRate) - 1.0f)
                          / (std::tan (pi * hz / (float) sampleRate) + 1.0f);

            float x = (l[i] + r[i]) * 0.5f + last * feedback;
            for (int k = 0; k < count; ++k) { stages[k].setCoefficient (c); x = stages[k].tick (x); }
            last = flush (x);

            l[i] = lerp (l[i], x, mix);
            r[i] = lerp (r[i], x, mix);
        }
    }

private:
    Allpass stages[12];
    Sweep sweep;
    double sampleRate = 44100.0;
    float depth = 0.6f, feedback = 0.3f, mix = 0.4f, last = 0.0f;
    int count = 6;
};

/** Compressor: Thresh, Ratio, Attack, Release, Makeup. */
class CompEngine final : public Engine
{
public:
    void prepare (double sr, int) override { dyn.prepare (sr); }
    void reset() override { dyn.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: dyn.setThreshold (v); break;
            case 1: dyn.setRatio (v); break;
            case 2: dyn.setAttack (v); break;
            case 3: dyn.setRelease (v); break;
            case 4: dyn.setMakeup (v); break;
            default: break;
        }
    }

    void process (float* l, float* r, int n) override
    {
        // One detector for both channels. Independent detectors make the image
        // wander every time one side is louder, which is the classic mistake.
        for (int i = 0; i < n; ++i)
        {
            const float sum = (l[i] + r[i]) * 0.5f;
            const float g = dyn.tick (sum) / (sum == 0.0f ? 1.0f : sum);
            l[i] *= g;
            r[i] *= g;
        }
    }

    float modValue() const override { return dyn.reduction(); }

private:
    Dynamics dyn;
};

/** Limiter: Ceiling, Release. A compressor with an infinite ratio and no choice. */
class LimiterEngine final : public Engine
{
public:
    void prepare (double sr, int) override
    {
        dyn.prepare (sr);
        dyn.setRatio (1.0f);      // maps to 20:1, close enough to a brick wall
        dyn.setAttack (0.0f);
        dyn.setMakeup (0.0f);
    }
    void reset() override { dyn.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: ceiling = 0.05f + v * 0.95f; dyn.setThreshold (0.55f + v * 0.44f); break;
            case 1: dyn.setRelease (v * 0.4f); break;
            default: break;
        }
    }

    void process (float* l, float* r, int n) override
    {
        for (int i = 0; i < n; ++i)
        {
            const float sum = (l[i] + r[i]) * 0.5f;
            const float g = dyn.tick (sum) / (sum == 0.0f ? 1.0f : sum);
            // Hard clip after the gain stage. A limiter that can be overshot is
            // not a limiter; the detector gets it most of the way and this
            // catches what a finite attack cannot.
            l[i] = clamp (l[i] * g, -ceiling, ceiling);
            r[i] = clamp (r[i] * g, -ceiling, ceiling);
        }
    }

    float modValue() const override { return dyn.reduction(); }

private:
    Dynamics dyn;
    float ceiling = 0.95f;
};

/** Tape: Wow, Flutter, Sat, Hiss, Mix. */
class TapeEngine final : public Engine
{
public:
    void prepare (double sr, int) override
    {
        sampleRate = sr;
        line.prepare (sr, 0.05f);
        wowSweep.setRate (0.6f, sr);
        flutterSweep.setRate (9.0f, sr);
    }
    void reset() override { line.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: wow = v; break;
            case 1: flutter = v; break;
            case 2: sat = v; break;
            case 3: hiss = v * v * 0.02f; break;
            case 4: mix = v; break;
            default: break;
        }
    }

    void process (float* l, float* r, int n) override
    {
        for (int i = 0; i < n; ++i)
        {
            // Wow is slow and flutter is fast, and they are separate controls
            // because they are separate mechanical faults — a stretched reel
            // and a worn capstan do not sound alike.
            const float drift = wowSweep.tick() * wow * 0.0025f + flutterSweep.tick() * flutter * 0.0004f;
            const float d = (0.006f + drift) * (float) sampleRate;

            const float in = (l[i] + r[i]) * 0.5f;
            line.push (in);
            float wet = line.read (d);

            wet = std::tanh (wet * (1.0f + sat * 6.0f)) / (1.0f + sat * 1.6f);
            state = state * 1664525u + 1013904223u;
            wet += ((float) (state >> 8 & 0xffff) / 32768.0f - 1.0f) * hiss;

            l[i] = lerp (l[i], wet, mix);
            r[i] = lerp (r[i], wet, mix);
        }
    }

private:
    Line line;
    Sweep wowSweep, flutterSweep;
    std::uint32_t state = 0x51ed270bu;
    double sampleRate = 44100.0;
    float wow = 0.2f, flutter = 0.15f, sat = 0.4f, hiss = 0.0f, mix = 1.0f;
};

/**
    Granular: Size, Spray, Pitch, Density, Mix.

    Eight overlapping grains reading a buffer at their own rates. Overlap is
    what stops it being a stutter: each grain fades in and out under a raised
    cosine, and with enough of them the seams never line up.
*/
class GrainEngine final : public Engine
{
public:
    static constexpr int numGrains = 8;

    void prepare (double sr, int) override
    {
        sampleRate = sr;
        line.prepare (sr, 2.0f);
        for (int i = 0; i < numGrains; ++i) grains[i] = { (float) i / numGrains, 0.0f, 1.0f };
    }
    void reset() override { line.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: size = 0.01f + v * v * 0.45f; break;
            case 1: spray = v; break;
            case 2: pitch = std::pow (2.0f, (v * 2.0f - 1.0f) * 2.0f); break;   // ±2 octaves
            case 3: density = 0.15f + v * 0.85f; break;
            case 4: mix = v; break;
            default: break;
        }
    }

    void process (float* l, float* r, int n) override
    {
        for (int i = 0; i < n; ++i)
        {
            line.push ((l[i] + r[i]) * 0.5f);
            float wet = 0.0f;

            for (auto& g : grains)
            {
                g.phase += 1.0f / (size * (float) sampleRate);
                if (g.phase >= 1.0f)
                {
                    g.phase -= 1.0f;
                    state = state * 1664525u + 1013904223u;
                    const float rnd = (float) (state >> 8 & 0xffff) / 65536.0f;
                    g.offset = rnd * spray * 1.5f * (float) sampleRate;
                    g.gain = rnd < density ? 1.0f : 0.0f;
                }
                if (g.gain <= 0.0f) continue;

                // Raised cosine. A rectangular window clicks at both ends, and
                // eight grains clicking is a buzz at the grain rate.
                const float env = 0.5f - 0.5f * std::cos (g.phase * twoPi);
                const float pos = g.offset + g.phase * size * (float) sampleRate * pitch;
                wet += line.read (pos + 2.0f) * env;
            }

            wet *= 0.4f;
            l[i] = lerp (l[i], wet, mix);
            r[i] = lerp (r[i], wet, mix);
        }
    }

private:
    struct Grain { float phase, offset, gain; };
    Line line;
    Grain grains[numGrains] {};
    std::uint32_t state = 0x2f6e2b1u;
    double sampleRate = 44100.0;
    float size = 0.08f, spray = 0.3f, pitch = 1.0f, density = 0.5f, mix = 0.6f;
};

/** Resonator: Pitch, Decay, Tone, Mix. A tuned comb with a damped feedback path. */
class RingEngine final : public Engine
{
public:
    void prepare (double sr, int) override { sampleRate = sr; line.prepare (sr, 0.1f); damp.setCutoff (4000.0f, sr); }
    void reset() override { line.reset(); damp.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: hz = hzFrom01 (v, 40.0f, 2000.0f); break;
            case 1: feedback = 0.5f + v * 0.495f; break;
            case 2: damp.setCutoff (hzFrom01 (v, 400.0f, 12000.0f), sampleRate); break;
            case 3: mix = v; break;
            default: break;
        }
    }

    void process (float* l, float* r, int n) override
    {
        const float d = (float) sampleRate / hz;
        for (int i = 0; i < n; ++i)
        {
            const float wet = line.read (d);
            line.push ((l[i] + r[i]) * 0.5f + damp.tick (wet) * feedback);
            l[i] = lerp (l[i], wet, mix);
            r[i] = lerp (r[i], wet, mix);
        }
    }

private:
    Line line;
    OnePole damp;
    double sampleRate = 44100.0;
    float hz = 220.0f, feedback = 0.8f, mix = 0.3f;
};

/** Stereo: Width, Pan, Bass mono. */
class WidthEngine final : public Engine
{
public:
    void prepare (double sr, int) override { lowL.setCutoff (140.0f, sr); lowR.setCutoff (140.0f, sr); }
    void reset() override { lowL.reset(); lowR.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: width = v * 2.0f; break;
            case 1: pan = v * 2.0f - 1.0f; break;
            case 2: bassMono = v > 0.5f; break;
            default: break;
        }
    }

    void process (float* l, float* r, int n) override
    {
        // Constant power, so a pan sweep does not dip in the middle.
        const float a = (pan + 1.0f) * 0.25f * pi;
        const float gl = std::cos (a), gr = std::sin (a);

        for (int i = 0; i < n; ++i)
        {
            float mid = (l[i] + r[i]) * 0.5f;
            float side = (l[i] - r[i]) * 0.5f * width;

            if (bassMono)
            {
                // Everything below 140Hz to the middle. Wide bass is what makes
                // a mix collapse the moment it is played in mono.
                const float lowSide = lowL.tick (side);
                side -= lowSide;
            }
            l[i] = (mid + side) * gl * 1.414f;
            r[i] = (mid - side) * gr * 1.414f;
        }
    }

private:
    OnePole lowL, lowR;
    float width = 1.2f, pan = 0.0f;
    bool bassMono = true;
};

/** FX chain: Chorus, Delay, Reverb, Mix. Three of the above at fixed settings. */
class FxChainEngine final : public Engine
{
public:
    void prepare (double sr, int block) override
    {
        chorus.prepare (sr, block);
        delay.prepare (sr, block);
        reverb.prepare (sr, block);
        // Voiced once. The block is a convenience for people who want an effect
        // without three panels, so the only decisions left are the amounts.
        chorus.setParam (0, 0.3f); chorus.setParam (1, 0.5f); chorus.setParam (2, 0.5f); chorus.setParam (3, 0.7f);
        delay.setParam (0, 0.4f); delay.setParam (1, 0.35f); delay.setParam (2, 0.6f); delay.setParam (3, 0.6f);
        reverb.setParam (0, 0.55f); reverb.setParam (1, 0.55f); reverb.setParam (2, 0.4f); reverb.setParam (4, 0.8f);
    }
    void reset() override { chorus.reset(); delay.reset(); reverb.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: chorus.setParam (4, v); break;
            case 1: delay.setParam (4, v); break;
            case 2: reverb.setParam (5, v); break;
            case 3: mix = v; break;
            default: break;
        }
    }

    void process (float* l, float* r, int n) override
    {
        if (mix <= 0.001f) return;
        chorus.process (l, r, n);
        delay.process (l, r, n);
        reverb.process (l, r, n);
        if (mix < 0.999f) for (int i = 0; i < n; ++i) { l[i] *= mix; r[i] *= mix; }
    }

private:
    ChorusEngine chorus;
    DelayEngine delay;
    ReverbEngine reverb;
    float mix = 0.35f;
};

} // namespace aka::dsp
