#pragma once

#include "BlockCatalog.h"
#include "Blocks.h"
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
        default:                   return nullptr;
    }
}

inline std::unique_ptr<Engine> makeBusEngine (BlockType t)
{
    switch (t)
    {
        case BlockType::lfo: return std::make_unique<LfoEngine>();
        case BlockType::seq: return std::make_unique<SeqEngine>();
        case BlockType::out: return std::make_unique<OutEngine>();
        default:             return nullptr;
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
        for (auto t : types)
            if (auto e = makeVoiceEngine (t))
            {
                e->prepare (sampleRate, 0);
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
        for (auto& e : chain) x = static_cast<VoiceEngine*> (e.get())->tick (x, ctx);
        return x;
    }

private:
    std::vector<std::unique_ptr<VoiceEngine>> chain;
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
        sequencer = nullptr;
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
                slots.push_back ({ false, (int) bus.size() });
                bus.push_back (std::move (e));
                continue;
            }
            slots.push_back ({ false, -1 });   // drawn, but silent
        }

        for (auto& v : voices) v.build (voiceTypes, sampleRate);
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

        if (s.voice) { for (auto& v : voices) v.setParam (s.index, paramIndex, value); }
        else if (s.index < (int) bus.size()) bus[(size_t) s.index]->setParam (paramIndex, value);
    }

    void setAllTypes (const std::vector<BlockType>& types) { setBlocks (types); }

    void noteOn (int note, float velocity)
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

    void noteOff (int note)
    {
        for (auto& v : voices) if (v.currentNote() == note) v.noteOff();
    }

    void allNotesOff() { for (auto& v : voices) v.noteOff(); }

    // NoteSink — the sequencer's way in. Same path as a key press, deliberately:
    // a sequenced note and a played note should steal voices by the same rule.
    void sinkNoteOn (int note, float velocity) override { noteOn (note, velocity); }
    void sinkNoteOff (int note) override { noteOff (note); }

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
            float mix = 0.0f;
            for (auto& v : voices) if (v.isActive()) mix += v.tick();
            // Headroom for eight voices without normalising by voice count,
            // which would make a chord quieter than a note.
            mix *= 0.22f;
            l[i] = mix;
            r[i] = mix;
        }

        for (auto& e : bus) e->process (l, r, n);
    }

    int activeVoices() const
    {
        int n = 0;
        for (auto& v : voices) if (v.isActive()) ++n;
        return n;
    }

private:
    /** Where a block's engine ended up. index < 0 means it has none. */
    struct Slot { bool voice; int index; };

    /** The sequencer is the one bus engine the instrument knows by name. */
    SeqEngine* dynamicSeq (Engine* e) const noexcept
    {
        return e == static_cast<Engine*> (sequencer) ? sequencer : nullptr;
    }

    Voice voices[numVoices];
    SeqEngine* sequencer = nullptr;
    std::vector<std::unique_ptr<Engine>> bus;
    std::vector<Slot> slots;
    std::vector<BlockType> voiceTypes;
    double sampleRate = 44100.0;
    int block = 512;
};

} // namespace aka::dsp
