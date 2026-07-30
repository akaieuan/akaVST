#pragma once

#include "Blocks.h"
#include <memory>
#include <vector>

namespace aka::dsp
{

/** The block types the engine knows how to build. Matches the catalogue's ids. */
enum class BlockType
{
    None = 0, Osc, Sub, Noise, Filter, Drive, Env, Lfo, Out, numTypes
};

/** Where a block runs. Derived from the catalogue's group. */
inline bool isVoiceBlock (BlockType t) noexcept
{
    switch (t)
    {
        case BlockType::Osc:
        case BlockType::Sub:
        case BlockType::Noise:
        case BlockType::Filter:
        case BlockType::Drive:
        case BlockType::Env:  return true;
        default:              return false;
    }
}

inline std::unique_ptr<VoiceEngine> makeVoiceEngine (BlockType t)
{
    switch (t)
    {
        case BlockType::Osc:    return std::make_unique<OscEngine>();
        case BlockType::Sub:    return std::make_unique<SubEngine>();
        case BlockType::Noise:  return std::make_unique<NoiseEngine>();
        case BlockType::Filter: return std::make_unique<FilterEngine>();
        case BlockType::Drive:  return std::make_unique<DriveEngine>();
        case BlockType::Env:    return std::make_unique<EnvEngine>();
        default:                return nullptr;
    }
}

inline std::unique_ptr<Engine> makeBusEngine (BlockType t)
{
    switch (t)
    {
        case BlockType::Lfo: return std::make_unique<LfoEngine>();
        case BlockType::Out: return std::make_unique<OutEngine>();
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
class Instrument
{
public:
    static constexpr int numVoices = 8;

    void prepare (double sr, int maxBlock)
    {
        sampleRate = sr;
        block = maxBlock;
        for (auto& v : voices) v.build (voiceTypes, sr);
        for (auto& e : bus) e->prepare (sr, maxBlock);
        scratchL.assign ((size_t) maxBlock, 0.0f);
        scratchR.assign ((size_t) maxBlock, 0.0f);
    }

    /** Rebuild from a fresh block list. Called off the audio thread. */
    void setBlocks (const std::vector<BlockType>& types)
    {
        voiceTypes.clear();
        busTypes.clear();
        for (auto t : types) (isVoiceBlock (t) ? voiceTypes : busTypes).push_back (t);

        bus.clear();
        for (auto t : busTypes)
            if (auto e = makeBusEngine (t)) { e->prepare (sampleRate, block); bus.push_back (std::move (e)); }

        for (auto& v : voices) v.build (voiceTypes, sampleRate);
    }

    /**
        A parameter, addressed the way the UI has it: block index in the whole
        list, then parameter index. Fanned out to every voice, because a voice
        is a copy of the same instrument and not a separate one.
    */
    void setParam (int blockIndex, int paramIndex, float value)
    {
        int voiceSlot = 0, busSlot = 0, seen = 0;
        for (auto t : allTypes)
        {
            const bool voiceBlock = isVoiceBlock (t);
            if (seen == blockIndex)
            {
                if (voiceBlock) { for (auto& v : voices) v.setParam (voiceSlot, paramIndex, value); }
                else if (busSlot < (int) bus.size()) bus[(size_t) busSlot]->setParam (paramIndex, value);
                return;
            }
            voiceBlock ? ++voiceSlot : ++busSlot;
            ++seen;
        }
    }

    void setAllTypes (const std::vector<BlockType>& types)
    {
        allTypes = types;
        setBlocks (types);
    }

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
    Voice voices[numVoices];
    std::vector<std::unique_ptr<Engine>> bus;
    std::vector<BlockType> allTypes, voiceTypes, busTypes;
    std::vector<float> scratchL, scratchR;
    double sampleRate = 44100.0;
    int block = 512;
};

} // namespace aka::dsp
