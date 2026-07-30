#pragma once

#include "Engine.h"
#include <array>
#include <cstdint>

namespace aka::dsp
{

/**
    Somewhere for a sequencer to send its notes.

    A sequencer is the one block that plays the instrument rather than being
    part of it, so it needs a way back into the voice pool. Declaring that as an
    interface keeps the sequencer from knowing what an Instrument is — and keeps
    it usable from a plugin that wants the notes as MIDI instead, which is
    exactly what bleep does with it.
*/
struct NoteSink
{
    virtual ~NoteSink() = default;
    virtual void sinkNoteOn (int note, float velocity) = 0;
    virtual void sinkNoteOff (int note) = 0;
};

/**
    Sixteen steps, after bleep's.

    bleep's is the best-thought-out thing in the three plugins and the shape is
    worth keeping: a step is not a flag. It carries a note, a velocity, a gate
    length and a chance, and that is the difference between a sequencer and a
    metronome. A pattern of identical hits is what you get when a step is a
    boolean, and it is why most built-in sequencers sound like a demo.

    Trimmed from bleep in two places, both deliberate. Sixteen steps rather than
    sixty-four in four pages: the block is one panel and paging inside a panel
    inside a plugin is a level of nesting too many — pattern length already
    covers most of what pages were for. And no parameter locks yet; those need
    a modulation system to lock *to*, which is the next piece of work. The step
    struct is laid out so they can be added without moving anything.

    Timing is sample-accurate within the block: the clock advances per sample
    and a step fires on the sample it lands on, not at the next block boundary.
    At 512 frames a boundary is 11ms, which is audible as a shuffle nobody asked
    for.
*/
class Sequencer
{
public:
    static constexpr int numSteps = 16;

    struct Step
    {
        bool active = false;
        int note = 60;          // MIDI, absolute
        float velocity = 0.9f;
        float gate = 0.5f;      // fraction of the step
        float chance = 1.0f;
    };

    void setSampleRate (double sr) noexcept
    {
        sampleRate = sr > 0.0 ? sr : 44100.0;
        reset();
    }

    void setSink (NoteSink* s) noexcept { sink = s; }

    /** Beats per minute. The transport is internal — Socket has no host. */
    void setTempo (float bpm) noexcept { tempo = clamp (bpm, 20.0f, 300.0f); }

    /** Clock division, as a multiple of a sixteenth: 1/4, 1/8, 1/8T, 1/16, 1/16T, 1/32. */
    void setDivision (int index) noexcept
    {
        static constexpr float table[6] { 4.0f, 2.0f, 4.0f / 3.0f, 1.0f, 2.0f / 3.0f, 0.5f };
        division = table[clamp (index, 0, 5)];
    }

    /** Delays every other step. The whole reason a pattern can groove. */
    void setSwing (float v01) noexcept { swing = clamp (v01, 0.0f, 1.0f) * 0.66f; }

    /** Scales every step's gate, so one knob shortens the whole pattern. */
    void setGateScale (float v01) noexcept { gateScale = 0.05f + clamp (v01, 0.0f, 1.0f) * 1.9f; }

    /** 1..16. Short odd lengths against a four-bar phrase is most of what a
        sequencer is for. */
    void setLength (int n) noexcept { length = clamp (n, 1, numSteps); }

    /** Transposes the whole pattern without rewriting it. */
    void setTranspose (int semitones) noexcept { transpose = clamp (semitones, -36, 36); }

    void setRunning (bool r) noexcept
    {
        if (r == running) return;
        running = r;
        if (! running) allOff();
        else { step = -1; clock = 0.0; }
    }

    bool isRunning() const noexcept { return running; }
    int currentStep() const noexcept { return running ? step : -1; }

    /**
        The sequencer as a modulation source: the current step's velocity while
        its gate is open, nothing between.

        A sequencer that can only play notes is half a sequencer. Velocity per
        step is already there, and pointing it at a cutoff is how a pattern
        gets an accent that is heard rather than counted.
    */
    float modValue() const noexcept { return gateLevel; }

    Step& stepAt (int i) noexcept { return steps[(size_t) clamp (i, 0, numSteps - 1)]; }
    const Step& stepAt (int i) const noexcept { return steps[(size_t) clamp (i, 0, numSteps - 1)]; }

    void reset() noexcept
    {
        clock = 0.0;
        step = -1;
        gateRemaining = 0;
        allOff();
    }

    /** Advance by `n` samples, firing steps as they land. */
    void advance (int n) noexcept
    {
        if (! running || sink == nullptr) return;

        const double stepSamples = sampleRate * 60.0 / (double) tempo / 4.0 * (double) division;
        if (stepSamples < 1.0) return;

        for (int i = 0; i < n; ++i)
        {
            if (gateRemaining > 0 && --gateRemaining == 0) { allOff(); gateLevel = 0.0f; }

            // Swing delays the odd steps only, which is what shuffle is. Applied
            // to the boundary rather than to the tempo, so the bar stays the
            // same length however hard it is swung.
            const bool oddNext = ((step + 1) & 1) != 0;
            const double boundary = stepSamples * (oddNext ? 1.0 + swing * 0.5 : 1.0 - swing * 0.5);

            if (clock >= boundary || step < 0)
            {
                clock -= step < 0 ? 0.0 : boundary;
                step = (step + 1) % length;
                fire (stepSamples);
            }
            clock += 1.0;
        }
    }

    /* ── Pattern generators ───────────────────────────────────────────────
       Ported from bleep, and the reason its sequencer is pleasant to use: a
       blank grid is a chore, and the Euclidean ones in particular produce
       patterns nobody would arrive at by clicking. Only the active flags
       change — notes and velocities you set are kept. */
    enum class Pattern { Fourth = 0, Offbeat, Eighths, Euclid3, Euclid5, Euclid7, Sparse, Dense, Clear };

    void generate (Pattern p) noexcept
    {
        for (auto& s : steps) s.active = false;

        auto euclid = [this] (int k)
        {
            // Spread k hits as evenly as sixteen steps allow. Not Bjorklund, but
            // the same result for every k that fits in one bar.
            for (int i = 0; i < k; ++i) steps[(size_t) (i * numSteps / k)].active = true;
        };

        switch (p)
        {
            case Pattern::Fourth:  for (int i = 0; i < numSteps; i += 4) steps[(size_t) i].active = true; break;
            case Pattern::Offbeat: for (int i = 2; i < numSteps; i += 4) steps[(size_t) i].active = true; break;
            case Pattern::Eighths: for (int i = 0; i < numSteps; i += 2) steps[(size_t) i].active = true; break;
            case Pattern::Euclid3: euclid (3); break;
            case Pattern::Euclid5: euclid (5); break;
            case Pattern::Euclid7: euclid (7); break;
            case Pattern::Sparse:
                for (int i = 0, hits = 3 + (int) (random() * 4.0f); i < hits; ++i)
                    steps[(size_t) (int) (random() * (float) numSteps)].active = true;
                break;
            case Pattern::Dense:
                for (auto& s : steps) s.active = random() > 0.5f;
                break;
            case Pattern::Clear: break;
        }
    }

private:
    void fire (double stepSamples) noexcept
    {
        const Step& s = steps[(size_t) step];
        if (! s.active) return;
        if (s.chance < 0.999f && random() > s.chance) return;

        allOff();
        held = clamp (s.note + transpose, 0, 127);
        gateLevel = s.velocity;
        sink->sinkNoteOn (held, s.velocity);

        // At least 32 samples, so a gate of zero is a very short note rather
        // than a note that never opens.
        gateRemaining = (int) std::fmax (32.0, stepSamples * (double) clamp (s.gate * gateScale, 0.02f, 1.0f));
    }

    void allOff() noexcept
    {
        if (held >= 0 && sink != nullptr) sink->sinkNoteOff (held);
        held = -1;
        gateRemaining = 0;
        gateLevel = 0.0f;
    }

    float random() noexcept
    {
        state ^= state << 13; state ^= state >> 17; state ^= state << 5;
        return (float) (state & 0xffffff) / (float) 0x1000000;
    }

    std::array<Step, numSteps> steps {};
    NoteSink* sink = nullptr;
    std::uint32_t state = 0x6d2b79f5u;
    double sampleRate = 44100.0, clock = 0.0;
    float tempo = 120.0f, division = 1.0f, swing = 0.0f, gateScale = 1.0f;
    int step = -1, length = numSteps, transpose = 0, held = -1, gateRemaining = 0;
    float gateLevel = 0.0f;
    bool running = false;
};

} // namespace aka::dsp
