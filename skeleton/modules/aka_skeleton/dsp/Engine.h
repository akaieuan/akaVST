#pragma once

#include <cmath>

/**
    The DSP half of the skeleton.

    Nothing in this directory may include JUCE, and that is a rule with a reason
    rather than a preference. These engines compile twice: once into the plugins,
    and once into WebAssembly so that Socket previews the exact code the plugin
    ships. WebAssembly cannot link JUCE. Keeping the constraint visible is what
    stops the shared library quietly becoming a thin wrapper over juce::dsp,
    which is what bleep's FxChain already is and why almost none of it could be
    lifted here.

    Standard library only, no allocation after prepare, no locks, no logging.
*/
namespace aka::dsp
{

inline constexpr float pi    = 3.14159265358979323846f;
inline constexpr float twoPi = 6.28318530717958647692f;

template <typename T>
inline T clamp (T v, T lo, T hi) noexcept { return v < lo ? lo : (v > hi ? hi : v); }

/** Linear interpolation, the one everything else is written in terms of. */
inline float lerp (float a, float b, float t) noexcept { return a + (b - a) * t; }

/** 0..1 to a frequency, exponentially. The way a cutoff knob has to behave. */
inline float hzFrom01 (float v, float lo, float hi) noexcept
{
    return lo * std::pow (hi / lo, clamp (v, 0.0f, 1.0f));
}

/** Denormals cost more than the samples are worth. */
inline float flush (float x) noexcept { return std::fabs (x) < 1.0e-20f ? 0.0f : x; }

/**
    A block's audio engine.

    One instance per block instance — per voice for a Source, Shape or Modulate
    block, once on the summed signal for an Effect or Route block. The catalogue
    says which.
*/
struct Engine
{
    virtual ~Engine() = default;

    virtual void prepare (double sampleRate, int maxBlock) = 0;
    virtual void reset() = 0;

    /**
        A parameter, normalised, indexed by the block's catalogue order.

        Normalised because that is what the UI has and what a preset stores.
        The engine owns the mapping to hertz, decibels and milliseconds: unit
        knowledge belongs with the DSP, not with whatever happens to be driving
        it. A cutoff knob is exponential because filters are, not because a
        slider decided so.
    */
    virtual void setParam (int index, float v) = 0;

    virtual void noteOn (int /*note*/, float /*velocity*/) {}
    virtual void noteOff (int /*note*/) {}

    /** In place, two channels, `n` frames. */
    virtual void process (float* left, float* right, int n) = 0;

    /** Modulators write here instead of to audio. */
    virtual float modValue() const { return 0.0f; }

    /** True once a voice has finished and can be reclaimed. */
    virtual bool isActive() const { return true; }
};

} // namespace aka::dsp
