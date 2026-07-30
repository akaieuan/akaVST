#pragma once

#include "Engine.h"
#include <vector>

namespace aka::dsp
{

/**
    A bank of bandpass peaks — the vowel filter.

    Three formants is the smallest number that reads as a voice rather than as a
    filter sweep, and the frequencies below are the standard measured ones for a
    male vocal tract. Morph slides between adjacent vowels rather than switching,
    because a vowel that changes instantly is a consonant.
*/
class Formant
{
public:
    static constexpr int numVowels = 5;   // A E I O U
    static constexpr int numPeaks = 3;

    void setSampleRate (double sr) noexcept { sampleRate = sr > 0.0 ? sr : 44100.0; update(); }
    void setVowel (int v) noexcept  { vowel = clamp (v, 0, numVowels - 1); update(); }
    void setMorph (float v) noexcept { morph = clamp (v, 0.0f, 1.0f); update(); }
    void setWidth (float v) noexcept { width = clamp (v, 0.0f, 1.0f); update(); }

    void reset() noexcept { for (auto& p : peaks) p = {}; }

    float tick (float x) noexcept
    {
        float y = 0.0f;
        for (int i = 0; i < numPeaks; ++i)
        {
            auto& p = peaks[(size_t) i];
            // A two-pole resonator, direct form. Cheap, and the only thing it
            // has to do is ring at one frequency.
            const float out = p.a * x + p.b1 * p.z1 + p.b2 * p.z2;
            p.z2 = p.z1;
            p.z1 = flush (out);
            y += out * gains[(size_t) i];
        }
        return y;
    }

private:
    // Measured formant centres, Hz. F1 and F2 carry the vowel; F3 is presence.
    static constexpr float table[numVowels][numPeaks] = {
        {  730, 1090, 2440 },  // A
        {  530, 1840, 2480 },  // E
        {  270, 2290, 3010 },  // I
        {  570,  840, 2410 },  // O
        {  300,  870, 2240 },  // U
    };

    void update() noexcept
    {
        const float slot = morph * (float) (numVowels - 1);
        const int a = (int) slot;
        const int b = a + 1 < numVowels ? a + 1 : a;
        const float t = slot - (float) a;

        for (int i = 0; i < numPeaks; ++i)
        {
            // Vowel picks the base set; morph slides across all five.
            const float base = table[vowel][i];
            const float swept = lerp (table[a][i], table[b][i], t);
            const float hz = lerp (base, swept, morph > 0.001f ? 1.0f : 0.0f);

            // Q from width: narrow rings hard and reads as vocal, wide reads as
            // a shelf. 4 to 30 covers the useful span.
            const float q = 30.0f - width * 26.0f;
            const float w = twoPi * clamp (hz, 60.0f, (float) sampleRate * 0.45f) / (float) sampleRate;
            const float r = 1.0f - w / (2.0f * q);

            auto& p = peaks[(size_t) i];
            p.b1 = 2.0f * r * std::cos (w);
            p.b2 = -r * r;
            // Peak gain of this resonator is about 1/(1-r), so the input scale
            // is (1-r) and the output lands near unity. The first attempt also
            // multiplied by sin(w), which at these formant frequencies is about
            // 0.1 — the filter was correct and twenty decibels down, which
            // measures as silence.
            p.a = 1.0f - r;
            gains[(size_t) i] = i == 0 ? 1.0f : (i == 1 ? 0.7f : 0.4f);
        }
    }

    struct Peak { float a = 0.0f, b1 = 0.0f, b2 = 0.0f, z1 = 0.0f, z2 = 0.0f; };
    std::array<Peak, numPeaks> peaks {};
    std::array<float, numPeaks> gains { 1.0f, 0.7f, 0.4f };
    double sampleRate = 44100.0;
    float morph = 0.0f, width = 0.4f;
    int vowel = 0;
};

/** A tuned delay with feedback. Metallic when short, a slapback when long. */
class Comb
{
public:
    void setSampleRate (double sr) noexcept
    {
        sampleRate = sr > 0.0 ? sr : 44100.0;
        buffer.assign ((size_t) (sampleRate * 0.05) + 4, 0.0f);
        reset();
    }

    void setTune (float v01) noexcept
    {
        // 20Hz to 4kHz: below that the delay is longer than the buffer, above it
        // there is nothing left to comb.
        delay = clamp ((float) sampleRate / hzFrom01 (v01, 20.0f, 4000.0f),
                       2.0f, (float) buffer.size() - 2.0f);
    }

    void setFeedback (float v) noexcept { feedback = clamp (v, 0.0f, 0.98f); }
    void setMix (float v) noexcept      { mix = clamp (v, 0.0f, 1.0f); }

    void reset() noexcept { for (auto& v : buffer) v = 0.0f; write = 0; }

    float tick (float x) noexcept
    {
        if (buffer.size() < 4) return x;

        // Fractional read, so tuning is continuous rather than stepping between
        // whole samples — which would make a sweep sound like a staircase.
        float readPos = (float) write - delay;
        while (readPos < 0.0f) readPos += (float) buffer.size();
        const int i = (int) readPos;
        const int j = (i + 1) % (int) buffer.size();
        const float wet = lerp (buffer[(size_t) i], buffer[(size_t) j], readPos - (float) i);

        buffer[(size_t) write] = flush (x + wet * feedback);
        write = (write + 1) % (int) buffer.size();
        return lerp (x, wet, mix);
    }

private:
    std::vector<float> buffer;
    double sampleRate = 44100.0;
    float delay = 200.0f, feedback = 0.5f, mix = 0.5f;
    int write = 0;
};

/**
    Wavefolder.

    Where a clipper flattens what goes past the ceiling, a folder reflects it
    back down — so pushing harder keeps adding harmonics instead of asymptoting
    into a square. It is the reason a folded sine sounds nothing like a distorted
    one at the same drive.
*/
inline float fold (float x, float amount, float symmetry) noexcept
{
    x = (x + symmetry) * (1.0f + amount * 8.0f);
    // Triangle wrap: reflect repeatedly until inside [-1, 1].
    x = std::fabs (std::fmod (x + 3.0f, 4.0f) - 2.0f) - 1.0f;
    return x;
}

/**
    Bitcrusher: quantise the amplitude, hold the sample.

    Two separate degradations that get conflated. Bits is vertical — how many
    levels the amplitude can take. Rate is horizontal — how often a new value is
    read at all. Jitter wobbles the hold, which is what makes a crusher sound
    like failing hardware rather than like a clean decimator.
*/
class Crusher
{
public:
    void setSampleRate (double sr) noexcept { sampleRate = sr > 0.0 ? sr : 44100.0; }

    void setBits (float v01) noexcept   { levels = std::pow (2.0f, 1.0f + clamp (v01, 0.0f, 1.0f) * 15.0f); }
    void setRate (float v01) noexcept   { step = hzFrom01 (clamp (v01, 0.0f, 1.0f), 300.0f, (float) sampleRate) / (float) sampleRate; }
    void setJitter (float v) noexcept   { jitter = clamp (v, 0.0f, 1.0f); }
    void setMix (float v) noexcept      { mix = clamp (v, 0.0f, 1.0f); }

    void reset() noexcept { phase = 0.0f; held = 0.0f; }

    float tick (float x) noexcept
    {
        phase += step;
        if (jitter > 0.0f)
        {
            state ^= state << 13; state ^= state >> 17; state ^= state << 5;
            phase += ((float) (state & 0xffff) / 65536.0f - 0.5f) * jitter * step;
        }
        if (phase >= 1.0f)
        {
            phase -= 1.0f;
            held = std::round (x * levels) / levels;
        }
        return lerp (x, held, mix);
    }

private:
    std::uint32_t state = 0x2545f491u;
    double sampleRate = 44100.0;
    float levels = 4096.0f, step = 1.0f, jitter = 0.0f, mix = 0.5f;
    float phase = 0.0f, held = 0.0f;
};

/** Three shelves and a bell. Enough to voice a panel, not to master a record. */
class Tone3
{
public:
    void setSampleRate (double sr) noexcept { sampleRate = sr > 0.0 ? sr : 44100.0; update(); }

    /** Each 0..1, with 0.5 flat. */
    void setBand (int i, float v) noexcept
    {
        if (i >= 0 && i < 4) { gain[(size_t) i] = (clamp (v, 0.0f, 1.0f) - 0.5f) * 2.0f; update(); }
    }

    void reset() noexcept { for (auto& s : z) s = { 0.0f, 0.0f }; }

    float tick (float x) noexcept
    {
        // Four one-pole splits, each band scaled and summed. Not a textbook EQ,
        // but the bands stay independent and nothing rings.
        float out = 0.0f, remaining = x;
        for (int i = 0; i < 4; ++i)
        {
            auto& s = z[(size_t) i];
            s.lp = flush (s.lp + coeff[(size_t) i] * (remaining - s.lp));
            const float band = i == 0 ? s.lp : s.lp - s.prev;
            s.prev = s.lp;
            out += band * (1.0f + gain[(size_t) i] * 1.5f);
            remaining -= band;
        }
        return out + remaining;
    }

private:
    void update() noexcept
    {
        static constexpr float corners[4] { 120.0f, 600.0f, 3000.0f, 9000.0f };
        for (int i = 0; i < 4; ++i)
            coeff[(size_t) i] = clamp (twoPi * corners[i] / (float) sampleRate, 0.0f, 0.99f);
    }

    struct State { float lp = 0.0f, prev = 0.0f; };
    std::array<State, 4> z {};
    std::array<float, 4> coeff { 0.02f, 0.08f, 0.4f, 0.9f };
    std::array<float, 4> gain {};
    double sampleRate = 44100.0;
};

/** A gate, with the four controls a gate actually needs. */
class Gate
{
public:
    void setSampleRate (double sr) noexcept { sampleRate = sr > 0.0 ? sr : 44100.0; }

    void setThreshold (float v01) noexcept { threshold = v01 * v01 * 0.5f; }
    void setAttack (float v01) noexcept    { attack = coeffFor (v01, 0.0002f, 0.1f); }
    void setHold (float v01) noexcept      { holdTime = v01 * 0.5f; }
    void setRelease (float v01) noexcept   { release = coeffFor (v01, 0.005f, 2.0f); }

    void reset() noexcept { level = 0.0f; envelope = 0.0f; held = 0.0f; }

    float tick (float x) noexcept
    {
        const float rectified = std::fabs (x);
        envelope = rectified > envelope ? rectified : envelope * 0.9995f;

        if (envelope > threshold) held = holdTime;
        else held = std::fmax (0.0f, held - 1.0f / (float) sampleRate);

        const float target = (envelope > threshold || held > 0.0f) ? 1.0f : 0.0f;
        const float c = target > level ? attack : release;
        level = flush (level + c * (target - level));
        return x * level;
    }

private:
    float coeffFor (float v01, float fast, float slow) const noexcept
    {
        const float seconds = fast * std::pow (slow / fast, clamp (v01, 0.0f, 1.0f));
        return 1.0f - std::exp (-1.0f / (seconds * (float) sampleRate));
    }

    double sampleRate = 44100.0;
    float threshold = 0.05f, attack = 0.5f, release = 0.01f, holdTime = 0.1f;
    float level = 0.0f, envelope = 0.0f, held = 0.0f;
};

} // namespace aka::dsp
