#pragma once

#include "Engine.h"
#include "Envelope.h"
#include <algorithm>
#include <vector>
#include "Filter.h"
#include "Noise.h"
#include "Oscillator.h"
#include "Effects.h"
#include "Sequencer.h"
#include "Shapers.h"
#include "Wavetable.h"

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

/** Wavetable: Table, Position, Warp, Level. */
class WavetableEngine final : public VoiceEngine
{
public:
    void prepare (double sr, int) override { table.setSampleRate (sr); }
    void reset() override { table.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            // Table picks a corner of the set; Position sweeps across all of
            // them. Two controls over one axis, which is how every wavetable
            // synth does it — the coarse one is a preset for the fine one.
            case 0: corner = clamp (v * 3.999f, 0.0f, 3.0f) / 3.0f; break;
            case 1: sweep = v; break;
            case 2: table.setWarp (v); break;
            case 3: level = v; break;
            default: break;
        }
        table.setPosition (clamp (corner + sweep * 0.34f, 0.0f, 1.0f));
    }

    float tick (float in, const VoiceContext& v) override
    {
        table.setFrequency (midiToHz (v.note));
        return in + table.tick() * level;
    }

private:
    Wavetable table;
    float corner = 0.0f, sweep = 0.3f, level = 0.8f;
};

/**
    Sampler: Start, Length, Tune, Level, Loop.

    With no sample loaded it plays a synthesised body — a decaying sine stack —
    so the block is not silent while the file layer does not exist. Marked in the
    interface as no engine yet, because a sampler that cannot load a sample is
    not a sampler; this is a placeholder tone, not a feature.
*/
class SamplerEngine final : public VoiceEngine
{
public:
    void prepare (double sr, int) override { sampleRate = sr; }
    void reset() override { phase = 0.0f; age = 0.0f; }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 2: tune = std::round ((v * 2.0f - 1.0f) * 24.0f); break;
            case 3: level = v; break;
            case 4: loop = v > 0.5f; break;
            default: break;
        }
    }

    void noteOn (int, float) override { phase = 0.0f; age = 0.0f; }

    float tick (float in, const VoiceContext& v) override
    {
        const float hz = midiToHz (v.note + tune);
        phase += hz / (float) sampleRate;
        if (phase >= 1.0f) phase -= 1.0f;
        age += 1.0f / (float) sampleRate;

        const float body = std::sin (phase * twoPi)
                         + 0.4f * std::sin (phase * twoPi * 2.0f)
                         + 0.2f * std::sin (phase * twoPi * 3.0f);
        const float decay = loop ? 1.0f : std::exp (-age * 3.0f);
        return in + body * 0.4f * decay * level;
    }

private:
    double sampleRate = 44100.0;
    float phase = 0.0f, age = 0.0f, tune = 0.0f, level = 0.8f;
    bool loop = true;
};

/** FM operator: Ratio, Index, Feedback, Level. Two-op, with self-modulation. */
class FmEngine final : public VoiceEngine
{
public:
    void prepare (double sr, int) override { sampleRate = sr; }
    void reset() override { carrier = 0.0f; modulator = 0.0f; last = 0.0f; }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            // Snapped to whole and half ratios. Between them FM is inharmonic,
            // which is occasionally what you want and usually a mistake — and
            // finding a clean ratio on a continuous knob is impossible.
            case 0: ratio = std::round (clamp (v, 0.0f, 1.0f) * 16.0f) * 0.5f + 0.5f; break;
            case 1: index = v * v * 12.0f; break;
            case 2: feedback = v * 0.9f; break;
            case 3: level = v; break;
            default: break;
        }
    }

    float tick (float in, const VoiceContext& v) override
    {
        const float hz = midiToHz (v.note);
        const float inc = hz / (float) sampleRate;

        modulator += inc * ratio;
        if (modulator >= 1.0f) modulator -= 1.0f;
        carrier += inc;
        if (carrier >= 1.0f) carrier -= 1.0f;

        // Self-feedback on the modulator turns a clean two-op tone into
        // something closer to a saw as it is pushed. One line, and it is most of
        // what makes DX-era FM sound like itself.
        const float m = std::sin (modulator * twoPi + last * feedback);
        last = m;
        return in + std::sin (carrier * twoPi + m * index) * level;
    }

private:
    double sampleRate = 44100.0;
    float carrier = 0.0f, modulator = 0.0f, last = 0.0f;
    float ratio = 2.0f, index = 1.0f, feedback = 0.0f, level = 0.7f;
};

/** String: Pitch, Damping, Position, Level. Karplus-Strong. */
class StringEngine final : public VoiceEngine
{
public:
    void prepare (double sr, int) override { string.setSampleRate (sr); }
    void reset() override { string.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: tune = std::round ((v * 2.0f - 1.0f) * 24.0f); break;
            case 1: string.setDamping (v); break;
            case 2: string.setPosition (0.02f + v * 0.96f); break;
            case 3: level = v; break;
            default: break;
        }
    }

    void noteOn (int note, float) override
    {
        string.setFrequency (midiToHz ((float) note + tune));
        string.pluck();
    }

    float tick (float in, const VoiceContext&) override { return in + string.tick() * level; }

private:
    PluckedString string;
    float tune = 0.0f, level = 0.7f;
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

/** Formant: Vowel, Morph, Width, Mix. */
class FormantEngine final : public VoiceEngine
{
public:
    void prepare (double sr, int) override { formant.setSampleRate (sr); }
    void reset() override { formant.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: formant.setVowel ((int) (v * 4.999f)); break;
            case 1: formant.setMorph (v); break;
            case 2: formant.setWidth (v); break;
            case 3: mix = v; break;
            default: break;
        }
    }

    float tick (float in, const VoiceContext&) override { return lerp (in, formant.tick (in), mix); }

private:
    Formant formant;
    float mix = 1.0f;
};

/** Comb: Tune, Feedback, Mix. */
class CombEngine final : public VoiceEngine
{
public:
    void prepare (double sr, int) override { comb.setSampleRate (sr); }
    void reset() override { comb.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: comb.setTune (v); break;
            case 1: comb.setFeedback (v * 0.95f); break;
            case 2: comb.setMix (v); break;
            default: break;
        }
    }

    float tick (float in, const VoiceContext&) override { return comb.tick (in); }

private:
    Comb comb;
};

/** Wavefolder: Fold, Symmetry, Mix. */
class FoldEngine final : public VoiceEngine
{
public:
    void prepare (double, int) override {}
    void reset() override {}

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: amount = v; break;
            case 1: symmetry = (v - 0.5f) * 1.2f; break;
            case 2: mix = v; break;
            default: break;
        }
    }

    float tick (float in, const VoiceContext&) override
    {
        return lerp (in, fold (in, amount, symmetry), mix);
    }

private:
    float amount = 0.3f, symmetry = 0.0f, mix = 1.0f;
};

/** Bitcrusher: Bits, Rate, Jitter, Mix. */
class CrushEngine final : public VoiceEngine
{
public:
    void prepare (double sr, int) override { crusher.setSampleRate (sr); }
    void reset() override { crusher.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: crusher.setBits (v); break;
            case 1: crusher.setRate (v); break;
            case 2: crusher.setJitter (v); break;
            case 3: crusher.setMix (v); break;
            default: break;
        }
    }

    float tick (float in, const VoiceContext&) override { return crusher.tick (in); }

private:
    Crusher crusher;
};

/** EQ: Low, Lo mid, Hi mid, High. */
class EqEngine final : public VoiceEngine
{
public:
    void prepare (double sr, int) override { tone.setSampleRate (sr); }
    void reset() override { tone.reset(); }
    void setParam (int i, float v) override { tone.setBand (i, v); }
    float tick (float in, const VoiceContext&) override { return tone.tick (in); }

private:
    Tone3 tone;
};

/** Gate: Thresh, Attack, Hold, Release. */
class GateEngine final : public VoiceEngine
{
public:
    void prepare (double sr, int) override { gate.setSampleRate (sr); }
    void reset() override { gate.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: gate.setThreshold (v); break;
            case 1: gate.setAttack (v); break;
            case 2: gate.setHold (v); break;
            case 3: gate.setRelease (v); break;
            default: break;
        }
    }

    float tick (float in, const VoiceContext&) override { return gate.tick (in); }

private:
    Gate gate;
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

/**
    Sequencer: Tempo, Rate, Swing, Gate, Length, Run.

    A bus block, because it plays the instrument rather than being part of one
    voice. Its pattern is not in the parameters — sixteen steps of note,
    velocity and gate is sixty-four numbers, and a parameter list is the wrong
    shape for that. The steps live in the block's face state and arrive through
    setStep, which is also why the grid you draw is the grid that plays.
*/
class SeqEngine final : public Engine
{
public:
    void prepare (double sr, int) override { seq.setSampleRate (sr); }
    void reset() override { seq.reset(); }

    void setSink (NoteSink* s) noexcept { seq.setSink (s); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: seq.setTempo (40.0f + v * 200.0f); break;
            case 1: seq.setDivision ((int) (v * 5.999f)); break;
            case 2: seq.setSwing (v); break;
            case 3: seq.setGateScale (v); break;
            // Sixty-four, not sixteen — this was left behind when the
            // sequencer grew to four pages, so Length 0.25 meant four steps
            // and a pattern silently played its first bar over and over.
            case 4: seq.setLength (1 + (int) (v * 63.999f)); break;
            case 5: seq.setRunning (v > 0.5f); break;
            default: break;
        }
    }

    /** One step, from the face. Note is absolute MIDI; the rest are 0..1. */
    void setStep (int index, bool active, int note, float velocity, float gate) noexcept
    {
        auto& s = seq.stepAt (index);
        s.active = active;
        s.note = note;
        s.velocity = velocity;
        s.gate = gate;
    }

    void process (float*, float*, int n) override { seq.advance (n); }

    /** Step velocity while the gate is open — an accent you can patch. */
    float modValue() const override { return seq.modValue(); }

    int currentStep() const noexcept { return seq.currentStep(); }

private:
    Sequencer seq;
};

/** Mod envelope: Delay, A, D, S, R, Curve, Amount. Per voice, like the amp one. */
class ModEnvEngine final : public VoiceEngine
{
public:
    void prepare (double sr, int) override { env.setSampleRate (sr); sampleRate = sr; }
    void reset() override { env.reset(); waited = 0.0f; }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: delaySeconds = v * v * 2.0f; break;
            case 1: env.setAttack (v); break;
            case 2: env.setDecay (v); break;
            case 3: env.setSustain (v); break;
            case 4: env.setRelease (v); break;
            case 5: env.setCurve (v); break;
            case 6: amount = v; break;
            default: break;
        }
    }

    void noteOn (int, float) override { waited = 0.0f; started = delaySeconds < 0.001f; if (started) env.noteOn(); }
    void noteOff (int) override { env.noteOff(); }

    /**
        Passes audio through untouched.

        A modulation envelope is not an amp envelope: putting it in the chain
        would make it shape the sound directly, which is what the Envelope block
        is for. This one only produces a value, and the patch bay decides where
        it lands.
    */
    float tick (float in, const VoiceContext&) override
    {
        if (! started)
        {
            waited += 1.0f / (float) sampleRate;
            if (waited >= delaySeconds) { started = true; env.noteOn(); }
        }
        value = env.tick() * amount;
        return in;
    }

    float modValue() const override { return value; }

private:
    Envelope env;
    double sampleRate = 44100.0;
    float delaySeconds = 0.0f, waited = 0.0f, amount = 0.5f, value = 0.0f;
    bool started = true;
};

/** Random: Mode, Rate, Amount, Smooth. Sample-and-hold, drift or a walk. */
class RandomEngine final : public Engine
{
public:
    void prepare (double sr, int) override { sampleRate = sr; }
    void reset() override { value = 0.0f; target = 0.0f; phase = 0.0f; }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: mode = (int) (v * 2.999f); break;
            case 1: rate = hzFrom01 (v, 0.05f, 30.0f); break;
            case 2: amount = v; break;
            case 3: smooth = clamp (v, 0.0f, 0.999f); break;
            default: break;
        }
    }

    void process (float*, float*, int n) override
    {
        for (int i = 0; i < n; ++i)
        {
            phase += rate / (float) sampleRate;
            if (phase >= 1.0f)
            {
                phase -= 1.0f;
                state ^= state << 13; state ^= state >> 17; state ^= state << 5;
                const float r = (float) (state & 0xffff) / 32768.0f - 1.0f;
                // Walk moves from where it is; the others jump. That difference
                // is the whole point of having three modes.
                target = mode == 2 ? clamp (target + r * 0.35f, -1.0f, 1.0f) : r;
            }
            const float a = mode == 0 ? 1.0f : (1.0f - smooth) * 0.5f + 0.002f;
            value = flush (value + a * (target - value));
        }
    }

    float modValue() const override { return value * amount; }

private:
    std::uint32_t state = 0x8f1bbcdcu;
    double sampleRate = 44100.0;
    float rate = 4.0f, amount = 0.5f, smooth = 0.2f;
    float value = 0.0f, target = 0.0f, phase = 0.0f;
    int mode = 0;
};

/** Follower: Attack, Release, Gain. Reads the bus, so it runs there. */
class FollowEngine final : public Engine
{
public:
    void prepare (double sr, int) override { sampleRate = sr; }
    void reset() override { env = 0.0f; }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: attack = coeff (v, 0.0005f, 0.2f); break;
            case 1: release = coeff (v, 0.01f, 2.0f); break;
            case 2: gain = 0.5f + v * 5.5f; break;
            default: break;
        }
    }

    void process (float* l, float* r, int n) override
    {
        for (int i = 0; i < n; ++i)
        {
            const float level = std::fabs ((l[i] + r[i]) * 0.5f) * gain;
            env = flush (env + (level > env ? attack : release) * (level - env));
        }
    }

    float modValue() const override { return clamp (env, 0.0f, 1.0f); }

private:
    float coeff (float v01, float fast, float slow) const noexcept
    {
        const float seconds = fast * std::pow (slow / fast, clamp (v01, 0.0f, 1.0f));
        return 1.0f - std::exp (-1.0f / (seconds * (float) sampleRate));
    }

    double sampleRate = 44100.0;
    float attack = 0.02f, release = 0.002f, gain = 2.0f, env = 0.0f;
};

/**
    Arpeggiator: Mode, Rate, Octaves, Gate.

    Holds what is played and plays it back in order. Like the sequencer it is a
    bus block, because it plays the instrument rather than living in one voice —
    and for the same reason it needs a way back in.
*/
class ArpEngine final : public Engine
{
public:
    void prepare (double sr, int) override { sampleRate = sr; }
    void reset() override { held.clear(); step = 0; clock = 0.0; sounding = -1; }

    void setSink (NoteSink* s) noexcept { sink = s; }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: mode = (int) (v * 3.999f); break;
            case 1: rate = hzFrom01 (v, 0.5f, 24.0f); break;
            case 2: octaves = 1 + (int) (v * 3.999f); break;
            case 3: gate = 0.05f + v * 0.9f; break;
            default: break;
        }
    }

    /** The arpeggiator hears note events rather than making them from nothing. */
    void noteOn (int note, float) override
    {
        if (std::find (held.begin(), held.end(), note) == held.end()) held.push_back (note);
    }
    void noteOff (int note) override
    {
        held.erase (std::remove (held.begin(), held.end(), note), held.end());
        if (held.empty()) stop();
    }

    void process (float*, float*, int n) override
    {
        if (sink == nullptr) return;
        const double stepSamples = sampleRate / (double) rate;

        for (int i = 0; i < n; ++i)
        {
            if (gateLeft > 0 && --gateLeft == 0) stop();
            clock += 1.0;
            if (clock < stepSamples || held.empty()) continue;
            clock -= stepSamples;
            fire (stepSamples);
        }
    }

private:
    void fire (double stepSamples)
    {
        std::vector<int> notes = held;
        std::sort (notes.begin(), notes.end());
        const int span = (int) notes.size() * octaves;
        if (span == 0) return;

        int index = step % span;
        switch (mode)
        {
            case 1: index = span - 1 - index; break;                      // Down
            case 2: { const int cycle = step % (span * 2 - 1 > 0 ? span * 2 - 2 : 1);
                      index = cycle < span ? cycle : span * 2 - 2 - cycle; break; }   // Up/Down
            case 3: state = state * 1664525u + 1013904223u;
                    index = (int) ((state >> 16) % (unsigned) span); break;           // Random
            default: break;                                                          // Up
        }

        stop();
        sounding = notes[(size_t) (index % notes.size())] + 12 * (index / (int) notes.size());
        sink->sinkNoteOn (clamp (sounding, 0, 127), 0.9f);
        gateLeft = (int) std::fmax (32.0, stepSamples * (double) gate);
        ++step;
    }

    void stop()
    {
        if (sounding >= 0 && sink) sink->sinkNoteOff (sounding);
        sounding = -1;
        gateLeft = 0;
    }

    std::vector<int> held;
    NoteSink* sink = nullptr;
    std::uint32_t state = 0x1a2b3c4du;
    double sampleRate = 44100.0, clock = 0.0;
    float rate = 8.0f, gate = 0.5f;
    int mode = 0, octaves = 1, step = 0, sounding = -1, gateLeft = 0;
};

/** Key tracking: Amount, Centre, Curve. Per voice — it is about the note. */
class KeyTrackEngine final : public VoiceEngine
{
public:
    void prepare (double, int) override {}
    void reset() override { value = 0.0f; }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: amount = v * 2.0f - 1.0f; break;
            case 1: centre = 24.0f + v * 84.0f; break;
            case 2: exponential = v > 0.5f; break;
            default: break;
        }
    }

    float tick (float in, const VoiceContext& v) override
    {
        const float t = clamp ((v.note - centre) / 48.0f, -1.0f, 1.0f);
        value = (exponential ? t * std::fabs (t) : t) * amount;
        return in;
    }

    float modValue() const override { return value; }

private:
    float amount = 0.5f, centre = 60.0f, value = 0.0f;
    bool exponential = false;
};

/* ── Route ────────────────────────────────────────────────────────────── */

/**
    Macros: M1..M4.

    Four knobs that are only worth anything once something is patched to them.
    Its modulation output is the first one; the patch bay would need four jacks
    to expose the rest, which is the next thing this block needs.
*/
class MacroEngine final : public Engine
{
public:
    void prepare (double, int) override {}
    void reset() override {}
    void setParam (int i, float v) override { if (i >= 0 && i < 4) macro[i] = v; }
    void process (float*, float*, int) override {}
    float modValue() const override { return macro[0] * 2.0f - 1.0f; }

private:
    float macro[4] { 0.5f, 0.5f, 0.5f, 0.5f };
};

/** Mixer: A, B, C, D. One bus, so the faders are a single output trim for now. */
class MixerEngine final : public Engine
{
public:
    void prepare (double, int) override {}
    void reset() override {}
    void setParam (int i, float v) override { if (i >= 0 && i < 4) level[i] = v; }

    void process (float* l, float* r, int n) override
    {
        // Averaged rather than summed. With one bus there is nothing to balance
        // yet, and four faders that each multiply the whole signal would make
        // pulling one down mute everything.
        const float g = (level[0] + level[1] + level[2] + level[3]) * 0.5f;
        for (int i = 0; i < n; ++i) { l[i] *= g; r[i] *= g; }
    }

private:
    float level[4] { 0.7f, 0.6f, 0.5f, 0.4f };
};

/** Crossover: Freq, Slope, Balance. Splits, tilts, and puts it back. */
class SplitEngine final : public Engine
{
public:
    void prepare (double sr, int) override { sampleRate = sr; lowL.setCutoff (500.0f, sr); lowR.setCutoff (500.0f, sr); }
    void reset() override { lowL.reset(); lowR.reset(); }

    void setParam (int i, float v) override
    {
        switch (i)
        {
            case 0: { const float hz = hzFrom01 (v, 60.0f, 8000.0f);
                      lowL.setCutoff (hz, sampleRate); lowR.setCutoff (hz, sampleRate); break; }
            case 1: poles = 1 + (int) (v * 2.999f); break;
            case 2: balance = v * 2.0f - 1.0f; break;
            default: break;
        }
    }

    void process (float* l, float* r, int n) override
    {
        const float lowGain = 1.0f - clamp (balance, 0.0f, 1.0f);
        const float highGain = 1.0f + clamp (balance, -1.0f, 0.0f);

        for (int i = 0; i < n; ++i)
        {
            float lowSideL = l[i], lowSideR = r[i];
            for (int p = 0; p < poles; ++p) { lowSideL = lowL.tick (lowSideL); lowSideR = lowR.tick (lowSideR); }
            l[i] = lowSideL * lowGain + (l[i] - lowSideL) * highGain;
            r[i] = lowSideR * lowGain + (r[i] - lowSideR) * highGain;
        }
    }

private:
    OnePole lowL, lowR;
    double sampleRate = 44100.0;
    float balance = 0.0f;
    int poles = 2;
};

/**
    Voice: Mode, Unison, Detune, Spread, Glide.

    Settings for the pool rather than an engine of its own — the instrument
    reads them. It exists as a block because "how many voices and how detuned"
    is a decision you make once and want to see on the face.
*/
class VoiceConfigEngine final : public Engine
{
public:
    void prepare (double, int) override {}
    void reset() override {}
    void setParam (int i, float v) override { if (i >= 0 && i < 5) value[i] = v; }
    void process (float*, float*, int) override {}

    int mode() const noexcept { return (int) (value[0] * 2.999f); }
    int unison() const noexcept { return 1 + (int) (value[1] * 3.999f); }
    float detune() const noexcept { return value[2]; }
    float spread() const noexcept { return value[3]; }
    float glide() const noexcept { return value[4]; }

private:
    float value[5] { 0.0f, 0.25f, 0.2f, 0.5f, 0.0f };
};

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
