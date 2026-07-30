#pragma once

#include "BlockCatalog.h"
#include "Blocks.h"
#include <algorithm>
#include <array>
#include <memory>
#include <vector>

namespace aka::dsp
{

/**
    Which engine a block type builds, if any.

    Every block in the catalogue has a BlockType; only some have an engine. The
    rest return nullptr and are skipped, which is how the tool stays honest
    while half the catalogue is still a drawing — you can place a Reverb, it
    just does not do anything yet, and nothing about the addressing changes when
    it does.
*/
inline std::unique_ptr<VoiceEngine> makeVoiceEngine (BlockType t)
{
    switch (t)
    {
        case BlockType::osc:       return std::make_unique<OscEngine>();
        case BlockType::sub:       return std::make_unique<SubEngine>();
        case BlockType::noise:     return std::make_unique<NoiseEngine>();
        case BlockType::wavetable: return std::make_unique<WavetableEngine>();
        case BlockType::sampler:   return std::make_unique<SamplerEngine>();
        case BlockType::fmop:      return std::make_unique<FmEngine>();
        case BlockType::string:    return std::make_unique<StringEngine>();

        case BlockType::filter:    return std::make_unique<FilterEngine>();
        case BlockType::formant:   return std::make_unique<FormantEngine>();
        case BlockType::comb:      return std::make_unique<CombEngine>();
        case BlockType::drive:     return std::make_unique<DriveEngine>();
        case BlockType::fold:      return std::make_unique<FoldEngine>();
        case BlockType::crush:     return std::make_unique<CrushEngine>();
        case BlockType::eq:        return std::make_unique<EqEngine>();
        case BlockType::gate:      return std::make_unique<GateEngine>();

        case BlockType::env:       return std::make_unique<EnvEngine>();
        case BlockType::env2:      return std::make_unique<ModEnvEngine>();
        case BlockType::keytrack:  return std::make_unique<KeyTrackEngine>();
        default:                   return nullptr;
    }
}

inline std::unique_ptr<Engine> makeBusEngine (BlockType t)
{
    switch (t)
    {
        case BlockType::lfo:     return std::make_unique<LfoEngine>();
        case BlockType::seq:     return std::make_unique<SeqEngine>();
        case BlockType::random:  return std::make_unique<RandomEngine>();
        case BlockType::follow:  return std::make_unique<FollowEngine>();
        case BlockType::arp:     return std::make_unique<ArpEngine>();

        case BlockType::delay:   return std::make_unique<DelayEngine>();
        case BlockType::reverb:  return std::make_unique<ReverbEngine>();
        case BlockType::chorus:  return std::make_unique<ChorusEngine>();
        case BlockType::phaser:  return std::make_unique<PhaserEngine>();
        case BlockType::flanger: return std::make_unique<FlangerEngine>();
        case BlockType::comp:    return std::make_unique<CompEngine>();
        case BlockType::limiter: return std::make_unique<LimiterEngine>();
        case BlockType::tape:    return std::make_unique<TapeEngine>();
        case BlockType::grain:   return std::make_unique<GrainEngine>();
        case BlockType::ring:    return std::make_unique<RingEngine>();
        case BlockType::width:   return std::make_unique<WidthEngine>();
        case BlockType::fxchain: return std::make_unique<FxChainEngine>();

        case BlockType::macros:  return std::make_unique<MacroEngine>();
        case BlockType::mixer:   return std::make_unique<MixerEngine>();
        case BlockType::split:   return std::make_unique<SplitEngine>();
        case BlockType::voice:   return std::make_unique<VoiceConfigEngine>();
        case BlockType::out:     return std::make_unique<OutEngine>();
        default:                 return nullptr;
    }
}

/**
    One voice: the per-voice blocks, in layout order, run as a chain.

    Layout order, deliberately. Socket has a Signal view for routing and it is
    not wired to the engine yet, so until it is, the order you see is the order
    you hear — which is at least honest, and is what a rack does. Phase 2 makes
    the wires real and this reads them instead.

    A voice with no envelope block never releases. That is not a bug to paper
    over: it is the tool telling you an instrument needs one, in the most direct
    way available.
*/
class Voice
{
public:
    void build (const std::vector<BlockType>& types, double sampleRate)
    {
        chain.clear();
        order.clear();
        for (auto t : types)
            if (auto e = makeVoiceEngine (t))
            {
                e->prepare (sampleRate, 0);
                order.push_back ((int) chain.size());
                chain.push_back (std::move (e));
            }
        envs.clear();
        filters.clear();
        for (auto& e : chain)
        {
            if (e->kind() == Kind::Envelope) envs.push_back (static_cast<EnvEngine*> (e.get()));
            if (e->kind() == Kind::Filter)   filters.push_back (static_cast<FilterEngine*> (e.get()));
        }
    }

    void setParam (int block, int index, float v)
    {
        if (block >= 0 && block < (int) chain.size()) chain[(size_t) block]->setParam (index, v);
    }

    void noteOn (int midiNote, float velocity)
    {
        ctx.note = (float) midiNote;
        ctx.velocity = velocity;
        ctx.gate = true;
        note = midiNote;
        age = 0;
        for (auto& e : chain) { e->reset(); e->noteOn (midiNote, velocity); }
    }

    void noteOff()
    {
        ctx.gate = false;
        for (auto& e : chain) e->noteOff (note);
        // Without an envelope there is nothing to fade, so the voice ends here.
        if (envs.empty()) note = -1;
    }

    bool isActive() const
    {
        if (note < 0 && envs.empty()) return false;
        for (auto* e : envs) if (e->isActive()) return true;
        return envs.empty() && ctx.gate;
    }

    int currentNote() const noexcept { return note; }
    int& ageRef() noexcept { return age; }

    float tick()
    {
        // The filter reads the envelope from the same sample, so filter sweeps
        // track the amp contour instead of lagging a block behind it.
        if (! envs.empty() && ! filters.empty())
        {
            const float e = envs.front()->modValue();
            for (auto* f : filters) f->setEnvelope (e);
        }

        float x = 0.0f;
        for (int i : order) x = chain[(size_t) i]->tick (x, ctx);
        return x;
    }

    /**
        The order to run them in.

        Layout order until told otherwise, which is what a rack does and is at
        least honest — but it is a layout decision standing in for a routing
        one, and Socket has a whole view for the second. Anything not listed
        keeps its place, so a half-wired instrument still makes a sound.
    */
    void setOrder (const std::vector<int>& slots)
    {
        order.clear();
        for (int i : slots) if (i >= 0 && i < (int) chain.size()) order.push_back (i);
        for (int i = 0; i < (int) chain.size(); ++i)
            if (std::find (order.begin(), order.end(), i) == order.end()) order.push_back (i);
    }

private:
    std::vector<std::unique_ptr<VoiceEngine>> chain;
    std::vector<int> order;
    std::vector<EnvEngine*> envs;
    std::vector<FilterEngine*> filters;
    VoiceContext ctx;
    int note = -1, age = 0;
};

/**
    The instrument: a pool of voices and a bus.

    Eight voices with oldest-stolen allocation, which is what enzyme does. Fixed
    at build so nothing allocates on the audio thread; stealing the oldest rather
    than the quietest because it is predictable, and a player can hear
    predictable and play around it.
*/
class Instrument : public NoteSink
{
public:
    static constexpr int numVoices = 8;

    void prepare (double sr, int maxBlock)
    {
        sampleRate = sr;
        block = maxBlock;
        for (auto& v : voices) v.build (voiceTypes, sr);
        for (auto& e : bus) e->prepare (sr, maxBlock);
    }

    /**
        Rebuild from a fresh block list, and record where each block landed.

        Off the audio thread. The slot table is the whole point: it is built
        while the engines are, so it cannot disagree with them.
    */
    void setBlocks (const std::vector<BlockType>& types)
    {
        voiceTypes.clear();
        bus.clear();
        busOrder_.clear();
        sequencer = nullptr;
        arp = nullptr;
        slots.clear();
        slots.reserve (types.size());

        // Try voice, then bus. The factories are the source of truth for where
        // a block runs, and asking them cannot disagree with them.
        //
        // The catalogue derives a stage from the group, and the group is wrong
        // for two blocks that matter: an LFO and a sequencer are both Modulate,
        // but a free-running LFO is shared and a sequencer *plays* the
        // instrument rather than living inside one voice. Gating on the derived
        // stage meant neither was ever built — the sequencer's Run did nothing
        // and there was no clue why, because a block with no engine is exactly
        // as silent as a block whose engine is not running.
        for (auto t : types)
        {
            if (makeVoiceEngine (t) != nullptr)
            {
                slots.push_back ({ true, (int) voiceTypes.size() });
                voiceTypes.push_back (t);
                continue;
            }
            if (auto e = makeBusEngine (t))
            {
                e->prepare (sampleRate, block);
                // The sequencer plays the instrument, so it needs a way back in.
                if (t == BlockType::seq)
                {
                    sequencer = static_cast<SeqEngine*> (e.get());
                    sequencer->setSink (this);
                }
                // The arpeggiator plays the instrument too, and unlike the
                // sequencer it plays what *you* play — so it also has to hear
                // the keyboard before the voices do.
                if (t == BlockType::arp)
                {
                    arp = static_cast<ArpEngine*> (e.get());
                    arp->setSink (this);
                }
                slots.push_back ({ false, (int) bus.size() });
                bus.push_back (std::move (e));
                continue;
            }
            slots.push_back ({ false, -1 });   // drawn, but silent
        }

        for (int i = 0; i < (int) bus.size(); ++i) busOrder_.push_back (i);
        for (auto& v : voices) v.build (voiceTypes, sampleRate);
    }

    /** Wire one modulation route. depth 0 removes it. */
    void setMod (int slot, int sourceBlock, int destBlock, int destParam, float depth)
    {
        if (slot < 0 || slot >= maxRoutes) return;
        routes[(size_t) slot] = { sourceBlock, destBlock, destParam, depth };
    }

    /**
        Pull every cable, and put every destination back where it was.

        Without the restore, unpatching a cable leaves its destination wherever
        the modulation happened to abandon it — the knob still reads 0.7 and the
        filter is sitting at 0.3, which is the kind of bug you chase for an hour.
    */
    void clearMods()
    {
        for (const auto& r : routes)
            if (r.depth != 0.0f && r.destBlock >= 0 && r.destParam >= 0)
            {
                apply (r.destBlock, r.destParam, base[(size_t) r.destBlock][(size_t) r.destParam]);
                current[(size_t) r.destBlock][(size_t) r.destParam] = base[(size_t) r.destBlock][(size_t) r.destParam];
                lastSent[(size_t) r.destBlock][(size_t) r.destParam] = -1.0f;
            }
        for (auto& r : routes) r = {};
    }

    /** How hard the whole matrix pushes, and how fast it is allowed to move. */
    void setModDepth (float d) noexcept { modDepth = clamp (d, 0.0f, 1.0f); }
    void setModSlew (float v01) noexcept
    {
        // 0 is immediate, 1 is about a fifth of a second. Slew is what turns a
        // square LFO into something that can be pointed at a cutoff without
        // clicking on every edge.
        const float seconds = 0.0005f + clamp (v01, 0.0f, 1.0f) * 0.2f;
        modSlew = 1.0f - std::exp (-1.0f / (seconds * (float) sampleRate / (float) modInterval));
    }

    /**
        A parameter, addressed the way the UI has it: block index in the whole
        list, then parameter index. Fanned out to every voice, because a voice
        is a copy of the same instrument and not a separate one.

        Through a lookup built once, not by re-walking the list. The first
        version counted a slot for every block as it went, which is right until
        a block produces no engine — then the count and the vector disagree, and
        every parameter after the first unimplemented block lands on the wrong
        one. With most of the catalogue still unimplemented that is the common
        case, not the edge case.
    */
    void setParam (int blockIndex, int paramIndex, float value)
    {
        if (blockIndex < 0 || blockIndex >= (int) slots.size()) return;
        const Slot s = slots[(size_t) blockIndex];
        if (s.index < 0) return;   // no engine for this block

        // Remembered, because modulation is an offset from what you set — not
        // a replacement for it. Without a base the first modulated frame
        // becomes the new resting value and the knob quietly stops meaning
        // anything.
        if (paramIndex >= 0 && paramIndex < maxParams)
            base[(size_t) blockIndex][(size_t) paramIndex] = value;

        apply (blockIndex, paramIndex, value);
    }

    /** Straight through, with no base bookkeeping. */
    void apply (int blockIndex, int paramIndex, float value)
    {
        if (blockIndex < 0 || blockIndex >= (int) slots.size()) return;
        const Slot s = slots[(size_t) blockIndex];
        if (s.index < 0) return;

        if (s.voice) { for (auto& v : voices) v.setParam (s.index, paramIndex, value); }
        else if (s.index < (int) bus.size()) bus[(size_t) s.index]->setParam (paramIndex, value);
    }

    void setAllTypes (const std::vector<BlockType>& types) { setBlocks (types); }

    /**
        A note from outside.

        With an arpeggiator present it takes the note instead of a voice: you
        are holding a chord for it to play, not playing the chord. Notes the
        arpeggiator itself produces arrive through sinkNoteOn and go straight to
        the pool, which is what stops it feeding itself.
    */
    void noteOn (int note, float velocity)
    {
        if (arp && ! fromSink) { arp->noteOn (note, velocity); return; }
        playNote (note, velocity);
    }

    void noteOff (int note)
    {
        if (arp && ! fromSink) { arp->noteOff (note); return; }
        for (auto& v : voices) if (v.currentNote() == note) v.noteOff();
    }

    void playNote (int note, float velocity)
    {
        for (auto& v : voices) ++v.ageRef();

        Voice* target = nullptr;
        for (auto& v : voices) if (! v.isActive()) { target = &v; break; }
        if (! target)
        {
            target = &voices[0];
            for (auto& v : voices) if (v.ageRef() > target->ageRef()) target = &v;
        }
        target->noteOn (note, velocity);
    }

    void allNotesOff() { for (auto& v : voices) v.noteOff(); }

    /**
        Signal order, as block indices.

        Sent separately from the block list rather than reordering it, because
        the interface addresses a parameter by its position in that list. Sort
        the list and every knob points at the wrong block.
    */
    void setChain (const std::vector<int>& blockOrder)
    {
        std::vector<int> voiceOrder, busOrder;
        for (int b : blockOrder)
        {
            if (b < 0 || b >= (int) slots.size()) continue;
            const Slot s = slots[(size_t) b];
            if (s.index < 0) continue;
            (s.voice ? voiceOrder : busOrder).push_back (s.index);
        }

        for (auto& v : voices) v.setOrder (voiceOrder);

        busOrder_.clear();
        for (int i : busOrder) busOrder_.push_back (i);
        for (int i = 0; i < (int) bus.size(); ++i)
            if (std::find (busOrder_.begin(), busOrder_.end(), i) == busOrder_.end()) busOrder_.push_back (i);
    }

    // NoteSink — the sequencer's way in. Same path as a key press, deliberately:
    // a sequenced note and a played note should steal voices by the same rule.
    void sinkNoteOn (int note, float velocity) override { playNote (note, velocity); }
    void sinkNoteOff (int note) override
    {
        for (auto& v : voices) if (v.currentNote() == note) v.noteOff();
    }

    /** Which step is playing, for the interface to draw. -1 when stopped. */
    int currentStep() const noexcept { return sequencer ? sequencer->currentStep() : -1; }

    /** A step, from the face. Addressed by block so a second sequencer works. */
    void setStep (int blockIndex, int index, bool active, int note, float velocity, float gate)
    {
        if (blockIndex < 0 || blockIndex >= (int) slots.size()) return;
        const Slot s = slots[(size_t) blockIndex];
        if (s.voice || s.index < 0 || s.index >= (int) bus.size()) return;
        if (auto* seq = dynamicSeq (bus[(size_t) s.index].get()))
            seq->setStep (index, active, note, velocity, gate);
    }

    void process (float* l, float* r, int n)
    {
        for (int i = 0; i < n; ++i)
        {
            // Every sixteen samples, not every block. At 48kHz a block boundary
            // is 2.7ms — a 370Hz staircase, which on a cutoff is an audible
            // buzz rather than a sweep. Sixteen puts the steps above 1.5kHz and
            // costs nothing at these route counts.
            if (--modCountdown <= 0) { modCountdown = modInterval; updateMods(); }

            float mix = 0.0f;
            for (auto& v : voices) if (v.isActive()) mix += v.tick();
            // Headroom for eight voices without normalising by voice count,
            // which would make a chord quieter than a note.
            mix *= 0.22f;
            l[i] = mix;
            r[i] = mix;
        }

        for (int i : busOrder_) bus[(size_t) i]->process (l, r, n);
    }

    int activeVoices() const
    {
        int n = 0;
        for (auto& v : voices) if (v.isActive()) ++n;
        return n;
    }

private:
    /**
        Read every source, sum what lands on each destination, write it once.

        Summed rather than last-wins: two things pointed at one cutoff should
        add up, which is what a modular patch does and what anyone wiring a
        second cable expects. Applied only where something changed, because
        setParam on a filter recomputes its coefficients and doing that for
        every parameter of every block sixteen times a sample is real work.
    */
    void updateMods()
    {
        if (routes.empty()) return;

        for (const auto& r : routes)
        {
            if (r.depth == 0.0f || r.destParam < 0 || r.destParam >= maxParams) continue;
            if (r.destBlock < 0 || r.destBlock >= (int) slots.size()) continue;

            const float source = modValueOf (r.sourceBlock);
            const float want = clamp (base[(size_t) r.destBlock][(size_t) r.destParam]
                                        + source * r.depth * modDepth,
                                      0.0f, 1.0f);

            float& held = current[(size_t) r.destBlock][(size_t) r.destParam];
            held += (want - held) * modSlew;
            if (std::fabs (held - lastSent[(size_t) r.destBlock][(size_t) r.destParam]) < 0.0005f) continue;

            lastSent[(size_t) r.destBlock][(size_t) r.destParam] = held;
            apply (r.destBlock, r.destParam, held);
        }
    }

    /** A block's modulation output, whatever kind of block it is. */
    float modValueOf (int blockIndex) const
    {
        if (blockIndex < 0 || blockIndex >= (int) slots.size()) return 0.0f;
        const Slot s = slots[(size_t) blockIndex];
        if (s.index < 0) return 0.0f;
        // Voice-stage sources report from voice zero. A per-voice envelope
        // pointed at a shared destination is ambiguous by nature — the filter
        // already handles the case that matters, per voice, inside the voice.
        return s.voice ? 0.0f : bus[(size_t) s.index]->modValue();
    }

    /** Where a block's engine ended up. index < 0 means it has none. */
    struct Slot { bool voice; int index; };

    /** One cable. */
    struct ModRoute { int sourceBlock = -1, destBlock = -1, destParam = -1; float depth = 0.0f; };

    static constexpr int maxRoutes = 32;
    static constexpr int maxParams = 12;
    static constexpr int maxBlocks = 128;
    static constexpr int modInterval = 16;

    /** The sequencer is the one bus engine the instrument knows by name. */
    SeqEngine* dynamicSeq (Engine* e) const noexcept
    {
        return e == static_cast<Engine*> (sequencer) ? sequencer : nullptr;
    }

    Voice voices[numVoices];
    SeqEngine* sequencer = nullptr;
    ArpEngine* arp = nullptr;
    bool fromSink = false;
    std::vector<std::unique_ptr<Engine>> bus;
    std::vector<int> busOrder_;
    std::vector<Slot> slots;
    std::vector<BlockType> voiceTypes;
    std::array<ModRoute, maxRoutes> routes {};
    std::array<std::array<float, maxParams>, maxBlocks> base {};
    std::array<std::array<float, maxParams>, maxBlocks> current {};
    std::array<std::array<float, maxParams>, maxBlocks> lastSent {};
    float modDepth = 1.0f, modSlew = 1.0f;
    int modCountdown = 0;
    double sampleRate = 44100.0;
    int block = 512;
};

} // namespace aka::dsp
