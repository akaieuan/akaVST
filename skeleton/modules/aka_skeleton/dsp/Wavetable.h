#pragma once

#include "Engine.h"
#include <array>

namespace aka::dsp
{

/**
    A wavetable, generated rather than loaded.

    Four tables, each 2048 samples, built at prepare from additive partials.
    Loading them from disk would mean a file format, an asset pipeline and a
    plugin that fails differently depending on where it was installed — for four
    waveforms that are each a dozen lines of arithmetic. Generated tables also
    band-limit for free: stop adding partials at Nyquist and there is nothing to
    alias.

    Position morphs between adjacent tables, so sweeping it is a crossfade
    rather than a switch. Warp bends the read pointer — phase distortion, the
    cheapest way to get a table to do something it was not drawn to do.
*/
class Wavetable
{
public:
    static constexpr int size = 2048;
    static constexpr int numTables = 4;

    void setSampleRate (double sr) noexcept
    {
        sampleRate = sr > 0.0 ? sr : 44100.0;
        build();
    }

    void setFrequency (float hz) noexcept { frequency = hz > 0.0f ? hz : 0.0f; }

    /** 0..1 across the whole set, not an index — the point is to sweep it. */
    void setPosition (float v) noexcept { position = clamp (v, 0.0f, 1.0f); }
    void setWarp (float v) noexcept     { warp = clamp (v, 0.0f, 1.0f); }

    void reset() noexcept { phase = 0.0f; }

    float tick() noexcept
    {
        phase += frequency / (float) sampleRate;
        if (phase >= 1.0f) phase -= 1.0f;

        // Phase distortion: pull the read pointer toward the start of the cycle,
        // which brightens the tone without adding a single partial.
        float p = phase;
        if (warp > 0.001f)
        {
            const float bend = 0.5f + warp * 0.45f;
            p = p < bend ? p / bend * 0.5f : 0.5f + (p - bend) / (1.0f - bend) * 0.5f;
        }

        const float slot = position * (float) (numTables - 1);
        const int a = (int) slot;
        const int b = a + 1 < numTables ? a + 1 : a;
        return lerp (read (a, p), read (b, p), slot - (float) a);
    }

private:
    float read (int table, float p) const noexcept
    {
        const float x = p * (float) size;
        const int i = (int) x;
        const int j = (i + 1) & (size - 1);
        return lerp (tables[(size_t) table][(size_t) (i & (size - 1))],
                     tables[(size_t) table][(size_t) j], x - (float) i);
    }

    /**
        Additive, stopping at Nyquist.

        The partial count is fixed at a low fundamental rather than tracked per
        note: a table built for 20Hz has 1000 partials and aliases badly played
        two octaves up. 64 is quiet enough at the top of the keyboard and still
        bright enough at the bottom to be worth having.
    */
    void build() noexcept
    {
        const int partials = 64;

        for (int t = 0; t < numTables; ++t)
            for (int i = 0; i < size; ++i)
            {
                const float p = (float) i / (float) size;
                float y = 0.0f;

                for (int h = 1; h <= partials; ++h)
                {
                    const float a = amplitude (t, h);
                    if (a > 0.0f) y += a * std::sin (twoPi * p * (float) h);
                }
                tables[(size_t) t][(size_t) i] = y;
            }

        // Normalise each table so morphing between them does not change level.
        for (auto& table : tables)
        {
            float peak = 0.0f;
            for (float v : table) peak = std::fmax (peak, std::fabs (v));
            if (peak > 0.0f) for (float& v : table) v /= peak;
        }
    }

    static float amplitude (int table, int h) noexcept
    {
        const float n = (float) h;
        switch (table)
        {
            case 0: return h == 1 ? 1.0f : 0.0f;                          // Basic — sine
            case 1: return 1.0f / n;                                       // Metal — saw
            case 2: return (h % 2) ? 1.0f / n : 0.0f;                      // Vox — square-ish
            // Glass: odd partials falling fast, with a formant bump high up.
            default: return (h % 2) ? (1.0f / (n * n) + (h > 8 && h < 14 ? 0.06f : 0.0f)) : 0.0f;
        }
    }

    std::array<std::array<float, size>, numTables> tables {};
    double sampleRate = 44100.0;
    float frequency = 440.0f, phase = 0.0f, position = 0.0f, warp = 0.0f;
};

/**
    Karplus–Strong, which is what i4's RingResonator is underneath.

    A short delay line fed with noise and low-passed on every pass. Two lines of
    arithmetic and it sounds like a plucked string, which is the best
    cost-to-result ratio in synthesis.
*/
class PluckedString
{
public:
    void setSampleRate (double sr) noexcept
    {
        sampleRate = sr > 0.0 ? sr : 44100.0;
        buffer.assign ((size_t) (sampleRate / 20.0) + 4, 0.0f);
        reset();
    }

    void setFrequency (float hz) noexcept
    {
        length = clamp ((float) sampleRate / (hz > 20.0f ? hz : 20.0f), 2.0f, (float) buffer.size() - 2.0f);
    }

    /** 0 rings for a long time, 1 is a thud. */
    void setDamping (float v) noexcept { damping = clamp (v, 0.0f, 1.0f); }

    /** Where the string is struck: nearer the end is brighter. */
    void setPosition (float v) noexcept { position = clamp (v, 0.02f, 0.98f); }

    void reset() noexcept
    {
        for (auto& v : buffer) v = 0.0f;
        writeIndex = 0;
        last = 0.0f;
    }

    /** Fill the line with noise — this is the strike. */
    void pluck() noexcept
    {
        const int n = (int) length;
        for (int i = 0; i < n && i < (int) buffer.size(); ++i)
        {
            state ^= state << 13; state ^= state >> 17; state ^= state << 5;
            float x = (float) (state & 0xffff) / 32768.0f - 1.0f;
            // A comb at the strike point: the harmonic that has a node there
            // cannot be excited, which is why plucking a guitar over the
            // soundhole and over the bridge are different sounds.
            const float t = (float) i / (float) n;
            x *= std::sin (pi * t / position);
            buffer[(size_t) i] = x;
        }
        writeIndex = 0;
    }

    float tick() noexcept
    {
        const int n = (int) length;
        if (n < 2) return 0.0f;

        const int readIndex = writeIndex;
        const float x = buffer[(size_t) readIndex];

        // One-pole average: the loop filter. Everything about the decay is here.
        const float damped = lerp (x, last, 0.15f + damping * 0.45f);
        last = damped;

        // Per-sample, so the exponent is the sample rate. 0.991 sounds like a
        // gentle decay and is nothing of the kind: at 48kHz it is down 400dB in
        // a second. The loop filter above already does most of the damping —
        // this only stops the line ringing forever.
        buffer[(size_t) readIndex] = flush (damped * (0.9999f - damping * 0.0012f));
        writeIndex = (writeIndex + 1) % n;
        return x;
    }

private:
    std::vector<float> buffer;
    std::uint32_t state = 0x1234567u;
    double sampleRate = 44100.0;
    float length = 200.0f, damping = 0.4f, position = 0.3f, last = 0.0f;
    int writeIndex = 0;
};

} // namespace aka::dsp
