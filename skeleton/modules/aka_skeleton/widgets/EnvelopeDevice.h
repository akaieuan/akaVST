#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <functional>
#include <vector>
#include "RackDevice.h"
#include "RackField.h"

namespace aka
{

/**
    An ADSR, drawn.

    Four numbers everyone already reads as a shape, so drawing the shape says
    more than four knob positions do — and it says it without the player having
    to hold the mapping in their head.

    Generic on purpose: every instrument here has at least one envelope, usually
    three, and the only thing that differs is which parameters feed it. The
    plugin supplies a getter rather than skeleton learning what an APVTS is
    shaped like, the same inversion `ModAssignHost` uses.

    Times are normalised 0..1 rather than seconds. A readout this size cannot
    show the difference between 200ms and 800ms honestly, and pretending
    otherwise makes a display that is technically correct and visually useless —
    at real time scales a fast attack is simply invisible. Proportions of the
    width read; absolute durations do not.
*/
class EnvelopeDevice : public RackDevice
{
public:
    struct Stages { float attack, decay, sustain, release; };
    using Source = std::function<Stages()>;

    EnvelopeDevice (Source source, int cols, int rows)
        : get (std::move (source))
    {
        width = cols;
        height = rows;
        top = 0;
        bottom = rows - 1;
        curve.assign ((size_t) juce::jmax (1, cols), 0.0f);
    }

    bool carve (int i, int j, float) override
    {
        if (i < 0 || i >= width) return false;
        // Fill from the baseline up to the curve, so the envelope reads as a
        // solid body rather than a one-cell line that vanishes at this size.
        const int h = juce::roundToInt (curve[(size_t) i] * (float) (height - 1));
        return j >= bottom - h;
    }

    juce::Point<int> idle (const RackCell&, float) override { return {}; }

    void overlay (float, std::vector<RackAccentCell>& out) override
    {
        // The accent traces the top of the curve only — the outline of the
        // shape, not a filled block of colour.
        for (int i = 0; i < width; ++i)
        {
            const int h = juce::roundToInt (curve[(size_t) i] * (float) (height - 1));
            if (h > 0)
                out.push_back ({ i, bottom - h });
        }
    }

    juce::String signature (float) override
    {
        sample();

        juce::String s;
        for (int i = 0; i < width; ++i)
            s << (char) ('a' + juce::jlimit (0, 25, juce::roundToInt (curve[(size_t) i] * 9.0f)));
        return s;
    }

private:
    void sample()
    {
        const auto e = get();

        // Split the width by stage. Sustain gets a fixed share rather than a
        // proportional one: it is a level, not a duration, so scaling its width
        // by anything would be inventing information.
        const float a = juce::jlimit (0.0f, 1.0f, e.attack);
        const float d = juce::jlimit (0.0f, 1.0f, e.decay);
        const float s = juce::jlimit (0.0f, 1.0f, e.sustain);
        const float r = juce::jlimit (0.0f, 1.0f, e.release);

        const float total = a + d + r + 0.9f;
        const int aW = juce::jmax (1, juce::roundToInt ((float) width * a / total));
        const int dW = juce::jmax (1, juce::roundToInt ((float) width * d / total));
        const int sW = juce::jmax (1, juce::roundToInt ((float) width * 0.9f / total));

        for (int i = 0; i < width; ++i)
        {
            float v;
            if (i < aW)                     v = (float) (i + 1) / (float) aW;
            else if (i < aW + dW)           v = 1.0f - (1.0f - s) * ((float) (i - aW + 1) / (float) dW);
            else if (i < aW + dW + sW)      v = s;
            else
            {
                const int rW = juce::jmax (1, width - (aW + dW + sW));
                const float t = (float) (i - aW - dW - sW + 1) / (float) rW;
                v = s * (1.0f - t);
            }
            curve[(size_t) i] = juce::jlimit (0.0f, 1.0f, v);
        }

        juce::ignoreUnused (r);
    }

    Source get;
    std::vector<float> curve;
    int width = 0, height = 0, top = 0, bottom = 0;
};

} // namespace aka
