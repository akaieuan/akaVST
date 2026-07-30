#pragma once

#include "Engine.h"
#include "Envelope.h"
#include "Filter.h"
#include "Noise.h"
#include "Oscillator.h"

/**
    One engine per block type.

    Each maps the block's normalised parameters — in the catalogue's order, which
    is the order the generator emits and the order the UI shows — onto real
    units. That mapping is the engine's job and nowhere else's: a cutoff knob is
    exponential because filters are, not because a slider decided so.

    Sources and Shapes run per voice; Effects and Route blocks run once on the
    summed signal. The catalogue's group already says which.
*/
namespace aka::dsp
{

/** Pitch, in the one place that has to agree with everything else. */
inline float midiToHz (float note) noexcept
{
    return 440.0f * std::pow (2.0f, (note - 69.0f) / 12.0f);
}

/** A voice tells its per-voice engines what note it is playing. */
struct VoiceContext
{
    float note = 60.0f;      // MIDI, fractional — glide and modulation land here
    float velocity = 1.0f;
    bool  gate = false;
};

/**
    What a voice engine is, without RTTI.

    The voice needs to find its envelope and its filters to wire them together,
    and dynamic_cast is the obvious way — but the engines compile with
    -fno-rtti, because typeinfo in an audio path buys nothing and costs binary
    size in a module that ships over the wire. A tag is cheaper, and it is the
    same tag the catalogue already uses.
*/
enum class Kind { Generic = 0, Envelope, Filter };

/** Per-voice engines see the voice; bus engines do not. */
struct VoiceEngine : Engine
{
    void process (float*, float*, int) override {}
    virtual Kind kind() const { return Kind::Generic; }
    /** Mono, per sample, inside the voice loop. */
    virtual float tick (float in, const VoiceContext& v) = 0;
};

/* ── Source ───────────────────────────────────────────────────────────── */

/** Oscillator: Wave, Tune, Fine, Level, PW. */
class OscEngine final : public VoiceEngine
{
public:
    void prepare (double sr, int) override { osc.setSampleRate (sr); }
    void reset() override { osc.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: osc.setMode ((int) (v * 3.999f)); break;   // Saw Square Sine FM
            case 1: tune = std::round ((v * 2.0f - 1.0f) * 24.0f); break;
            case 2: fine = (v * 2.0f - 1.0f) * 0.5f; break;    // ±50 cents
            case 3: level = v; break;
            case 4: osc.setPulseWidth (0.05f + v * 0.9f); break;
            default: break;
        }
    }

    float tick (float in, const VoiceContext& v) override
    {
        osc.setFrequency (midiToHz (v.note + tune + fine));
        return in + osc.tick() * level;
    }

private:
    Oscillator osc;
    float tune = 0.0f, fine = 0.0f, level = 0.8f;
};

/** Sub: Level, Octave, Shape. */
class SubEngine final : public VoiceEngine
{
public:
    void prepare (double sr, int) override { osc.setSampleRate (sr); }
    void reset() override { osc.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: level = v; break;
            case 1: octave = v < 0.5f ? 12.0f : 24.0f; break;
            case 2: osc.setMode (v < 0.5f ? (int) Oscillator::Mode::Sine
                                          : (int) Oscillator::Mode::Square); break;
            default: break;
        }
    }

    float tick (float in, const VoiceContext& v) override
    {
        osc.setFrequency (midiToHz (v.note - octave));
        return in + osc.tick() * level;
    }

private:
    Oscillator osc;
    float level = 0.4f, octave = 12.0f;
};

/** Noise: Kind, Level, Colour. */
class NoiseEngine final : public VoiceEngine
{
public:
    void prepare (double sr, int) override { noise.setSampleRate (sr); }
    void reset() override { noise.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: noise.setKind ((int) (v * 3.999f)); break;
            case 1: level = v; break;
            case 2: noise.setColour (v); break;
            default: break;
        }
    }

    float tick (float in, const VoiceContext&) override { return in + noise.tick() * level; }

private:
    Noise noise;
    float level = 0.2f;
};

/* ── Shape ────────────────────────────────────────────────────────────── */

/** Filter: Mode, Cutoff, Reso, Env, Key. */
class FilterEngine final : public VoiceEngine
{
public:
    Kind kind() const override { return Kind::Filter; }
    void prepare (double sr, int) override { filter.setSampleRate (sr); }
    void reset() override { filter.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: filter.setMode ((int) (v * 4.999f)); break;
            case 1: base = v; break;
            case 2: filter.setResonance (v); break;
            case 3: envAmount = v * 2.0f - 1.0f; break;
            case 4: keyTrack = v; break;
            default: break;
        }
    }

    /** The envelope's current value, written by the voice before each sample. */
    void setEnvelope (float e) noexcept { env = e; }

    float tick (float in, const VoiceContext& v) override
    {
        // Cutoff modulation happens in octaves, not hertz. A filter that opens
        // by 2000Hz is dramatic at the bottom of the keyboard and inaudible at
        // the top; one that opens by two octaves sounds the same everywhere.
        const float octaves = envAmount * 5.0f * env + keyTrack * (v.note - 60.0f) / 12.0f;
        filter.setCutoff (hzFrom01 (base, 20.0f, 18000.0f) * std::pow (2.0f, octaves));
        return filter.tick (in);
    }

private:
    Filter filter;
    float base = 0.7f, envAmount = 0.0f, keyTrack = 0.0f, env = 0.0f;
};

/** Character: Drive, Bias, Tone, Mix. */
class DriveEngine final : public VoiceEngine
{
public:
    void prepare (double sr, int) override { sampleRate = sr; lp = 0.0f; }
    void reset() override { lp = 0.0f; }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: drive = 1.0f + v * 24.0f; break;
            case 1: bias = (v * 2.0f - 1.0f) * 0.5f; break;
            case 2: tone = v; break;
            case 3: mix = v; break;
            default: break;
        }
    }

    float tick (float in, const VoiceContext&) override
    {
        // Bias before the nonlinearity, so asymmetric clipping brings in even
        // harmonics. Symmetric tanh only ever gives odd ones, which is why a
        // drive knob with no bias sounds like the same fuzz at every setting.
        float wet = std::tanh ((in + bias) * drive) - std::tanh (bias * drive);
        const float c = 0.02f + tone * 0.9f;
        lp = flush (lp + c * (wet - lp));
        wet = lerp (lp, wet, tone);
        // Compensate: 24x gain into a tanh is much louder than the input.
        return lerp (in, wet / (1.0f + drive * 0.06f), mix);
    }

private:
    double sampleRate = 44100.0;
    float drive = 4.0f, bias = 0.0f, tone = 0.5f, mix = 1.0f, lp = 0.0f;
};

/* ── Modulate ─────────────────────────────────────────────────────────── */

/** Envelope: A, D, S, R, Curve, Vel. The voice's amp envelope by default. */
class EnvEngine final : public VoiceEngine
{
public:
    Kind kind() const override { return Kind::Envelope; }
    void prepare (double sr, int) override { env.setSampleRate (sr); }
    void reset() override { env.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: env.setAttack (v); break;
            case 1: env.setDecay (v); break;
            case 2: env.setSustain (v); break;
            case 3: env.setRelease (v); break;
            case 4: env.setCurve (v); break;
            case 5: velAmount = v; break;
            default: break;
        }
    }

    void noteOn (int, float velocity) override { vel = velocity; env.noteOn(); }
    void noteOff (int) override { env.noteOff(); }

    float tick (float in, const VoiceContext&) override
    {
        // Velocity scales the whole envelope rather than only the peak, so a
        // soft note is quieter for its entire life instead of just its attack.
        current = env.tick() * lerp (1.0f, vel, velAmount);
        return in * current;
    }

    float modValue() const override { return current; }
    bool isActive() const override  { return env.isActive(); }

private:
    Envelope env;
    float vel = 1.0f, velAmount = 0.4f, current = 0.0f;
};

/** LFO: Shape, Rate, Depth, Sync. Free-running, shared across voices. */
class LfoEngine final : public Engine
{
public:
    void prepare (double sr, int) override { sampleRate = sr; }
    void reset() override { phase = 0.0f; held = 0.0f; }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: shape = (int) (v * 3.999f); break;
            case 1: rate = hzFrom01 (v, 0.02f, 40.0f); break;
            case 2: depth = v; break;
            case 3: /* Sync — needs a transport; Phase 2. */ break;
            default: break;
        }
    }

    void process (float*, float*, int n) override
    {
        for (int i = 0; i < n; ++i) advance();
    }

    float modValue() const override { return value * depth; }

private:
    void advance() noexcept
    {
        const float inc = rate / (float) sampleRate;
        const float was = phase;
        phase += inc;
        if (phase >= 1.0f) phase -= 1.0f;

        switch (shape)
        {
            case 0: value = std::sin (phase * twoPi); break;
            case 1: value = 4.0f * std::fabs (phase - 0.5f) - 1.0f; break;
            case 2: value = phase < 0.5f ? 1.0f : -1.0f; break;
            default:
                // Sample and hold: a new random value each time phase wraps.
                if (phase < was) { state = state * 1664525u + 1013904223u; held = (float) (state >> 8 & 0xffff) / 32768.0f - 1.0f; }
                value = held;
                break;
        }
    }

    double sampleRate = 44100.0;
    std::uint32_t state = 22222u;
    float phase = 0.0f, rate = 2.0f, depth = 0.5f, value = 0.0f, held = 0.0f;
    int shape = 0;
};

/* ── Route ────────────────────────────────────────────────────────────── */

/** Output: Level, plus the tap the meters read. */
class OutEngine final : public Engine
{
public:
    void prepare (double, int) override {}
    void reset() override { peakL = peakR = 0.0f; }
    void setParam (int i, float v) override { if (i == 0) level = v * v; }

    void process (float* l, float* r, int n) override
    {
        for (int i = 0; i < n; ++i)
        {
            l[i] *= level;
            r[i] *= level;
            peakL = std::fmax (peakL * 0.9995f, std::fabs (l[i]));
            peakR = std::fmax (peakR * 0.9995f, std::fabs (r[i]));
        }
    }

    float peakLeft() const noexcept  { return peakL; }
    float peakRight() const noexcept { return peakR; }

private:
    float level = 0.64f, peakL = 0.0f, peakR = 0.0f;
};

} // namespace aka::dsp
