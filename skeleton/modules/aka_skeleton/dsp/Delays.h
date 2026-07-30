#pragma once

#include "Engine.h"
#include <vector>

namespace aka::dsp
{

/**
    A fractional delay line — the part four effects share.

    Delay, chorus, flanger and the resonator are all this with a different
    length and a different way of moving it. Writing it once is the difference
    between four effects and four hundred lines of the same ring buffer.

    Reads are interpolated because a modulated delay whose length snaps to whole
    samples clicks on every step, and a chorus is nothing but a modulated delay.
*/
class Line
{
public:
    void prepare (double sr, float maxSeconds)
    {
        sampleRate = sr > 0.0 ? sr : 44100.0;
        buffer.assign ((size_t) (sampleRate * maxSeconds) + 4, 0.0f);
        write = 0;
    }

    void reset() { for (auto& v : buffer) v = 0.0f; write = 0; }

    void push (float x) noexcept
    {
        if (buffer.empty()) return;
        buffer[(size_t) write] = flush (x);
        write = (write + 1) % (int) buffer.size();
    }

    /** Samples back from the write head, fractional. */
    float read (float delay) const noexcept
    {
        const int n = (int) buffer.size();
        if (n < 4) return 0.0f;

        float pos = (float) write - clamp (delay, 1.0f, (float) n - 2.0f);
        while (pos < 0.0f) pos += (float) n;
        const int i = (int) pos;
        const int j = (i + 1) % n;
        return lerp (buffer[(size_t) i], buffer[(size_t) j], pos - (float) i);
    }

    float readSeconds (float seconds) const noexcept { return read (seconds * (float) sampleRate); }
    double rate() const noexcept { return sampleRate; }

private:
    std::vector<float> buffer;
    double sampleRate = 44100.0;
    int write = 0;
};

/** A one-pole, for damping a feedback path. Cheap and it is what ears expect. */
struct OnePole
{
    void setCutoff (float hz, double sr) noexcept
    {
        a = clamp (twoPi * hz / (float) sr, 0.001f, 0.99f);
    }
    float tick (float x) noexcept { z = flush (z + a * (x - z)); return z; }
    void reset() noexcept { z = 0.0f; }
    float a = 0.3f, z = 0.0f;
};

/** A first-order allpass — the building block of a phaser. */
struct Allpass
{
    void setCoefficient (float c) noexcept { g = clamp (c, -0.99f, 0.99f); }
    float tick (float x) noexcept
    {
        const float y = -g * x + z;
        z = flush (x + g * y);
        return y;
    }
    void reset() noexcept { z = 0.0f; }
    float g = 0.5f, z = 0.0f;
};

/**
    A feedback delay network — the reverb.

    JUCE's is not portable, so this is written rather than moved. Four delay
    lines of mutually prime length through a Hadamard mixing matrix: each echo
    feeds every line, so the echo density doubles every pass and the tail
    becomes noise rather than a rhythm within about eighty milliseconds. Prime
    lengths are what stop the same echo landing on itself and ringing one note.

    Four is the smallest N that sounds like a room rather than like four delays.
    Eight is smoother and twice the cost, and at this size nobody has ever
    noticed the difference in a plugin panel.
*/
class Fdn
{
public:
    static constexpr int N = 4;

    void prepare (double sr)
    {
        sampleRate = sr;
        // Mutually prime, spread over a plausible room.
        static constexpr float seconds[N] { 0.0297f, 0.0371f, 0.0411f, 0.0437f };
        for (int i = 0; i < N; ++i)
        {
            lines[i].prepare (sr, 0.25f);
            base[i] = seconds[i];
            damp[i].reset();
        }
        pre.prepare (sr, 0.25f);
        setSize (0.5f);
        setDamping (0.4f);
    }

    void reset()
    {
        for (auto& l : lines) l.reset();
        for (auto& d : damp) d.reset();
        for (auto& s : state) s = 0.0f;
        pre.reset();
    }

    void setSize (float v01) noexcept { size = 0.35f + clamp (v01, 0.0f, 1.0f) * 2.4f; }
    void setDecay (float v01) noexcept { feedback = 0.2f + clamp (v01, 0.0f, 1.0f) * 0.78f; }
    void setDamping (float v01) noexcept
    {
        const float hz = hzFrom01 (1.0f - clamp (v01, 0.0f, 1.0f), 700.0f, 16000.0f);
        for (auto& d : damp) d.setCutoff (hz, sampleRate);
    }
    void setPreDelay (float v01) noexcept { preSeconds = clamp (v01, 0.0f, 1.0f) * 0.15f; }
    void setWidth (float v01) noexcept { width = clamp (v01, 0.0f, 1.0f); }

    /** Stereo out from a mono sum. */
    void process (float in, float& outL, float& outR) noexcept
    {
        pre.push (in);
        const float x = preSeconds > 0.0005f ? pre.readSeconds (preSeconds) : in;

        float v[N];
        for (int i = 0; i < N; ++i) v[i] = lines[i].read (base[i] * size * (float) sampleRate);

        // Hadamard: every line into every other, with no multiplies. This is
        // what turns four delays into a diffuse tail instead of four echoes.
        const float a = v[0] + v[1], b = v[2] + v[3];
        const float c = v[0] - v[1], d = v[2] - v[3];
        float m[N] { a + b, c + d, a - b, c - d };

        for (int i = 0; i < N; ++i)
        {
            state[i] = damp[i].tick (m[i] * 0.5f * feedback);
            lines[i].push (x + state[i]);
        }

        const float mid = (v[0] + v[1] + v[2] + v[3]) * 0.35f;
        const float side = (v[0] - v[3]) * 0.35f;
        outL = mid + side * width;
        outR = mid - side * width;
    }

private:
    Line lines[N], pre;
    OnePole damp[N];
    float base[N] {}, state[N] {};
    double sampleRate = 44100.0;
    float size = 1.0f, feedback = 0.7f, preSeconds = 0.0f, width = 1.0f;
};

/**
    Envelope follower and gain computer — the compressor and the limiter.

    Separated because they are separate things and conflating them is why so
    many compressors sound wrong: the follower decides *when*, the computer
    decides *how much*. Peak detection with a fast attack for the limiter,
    the same follower with slower constants for the compressor.
*/
class Dynamics
{
public:
    void prepare (double sr) noexcept { sampleRate = sr; reset(); }
    void reset() noexcept { env = 0.0f; gain = 1.0f; }

    void setThreshold (float v01) noexcept { thresholdDb = -60.0f + clamp (v01, 0.0f, 1.0f) * 60.0f; }
    void setRatio (float v01) noexcept     { ratio = 1.0f + clamp (v01, 0.0f, 1.0f) * 19.0f; }
    void setAttack (float v01) noexcept    { attack = coeff (v01, 0.0002f, 0.1f); }
    void setRelease (float v01) noexcept   { release = coeff (v01, 0.02f, 1.5f); }
    void setMakeup (float v01) noexcept    { makeup = std::pow (10.0f, clamp (v01, 0.0f, 1.0f) * 24.0f / 20.0f); }

    /** How much the last sample was pushed down, for a meter. */
    float reduction() const noexcept { return 1.0f - gain; }

    float tick (float x) noexcept
    {
        const float level = std::fabs (x);
        // Attack on the way up, release on the way down. One coefficient for
        // both is what makes a compressor breathe wrong.
        env = flush (env + (level > env ? attack : release) * (level - env));

        const float db = 20.0f * std::log10 (env + 1e-9f);
        const float over = db - thresholdDb;
        const float targetDb = over > 0.0f ? -over * (1.0f - 1.0f / ratio) : 0.0f;
        const float target = std::pow (10.0f, targetDb / 20.0f);

        gain = flush (gain + (target < gain ? attack : release) * (target - gain));
        return x * gain * makeup;
    }

private:
    float coeff (float v01, float fast, float slow) const noexcept
    {
        const float seconds = fast * std::pow (slow / fast, clamp (v01, 0.0f, 1.0f));
        return 1.0f - std::exp (-1.0f / (seconds * (float) sampleRate));
    }

    double sampleRate = 44100.0;
    float thresholdDb = -18.0f, ratio = 4.0f, attack = 0.01f, release = 0.001f, makeup = 1.0f;
    float env = 0.0f, gain = 1.0f;
};

} // namespace aka::dsp
