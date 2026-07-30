#include "Instrument.h"
#include <emscripten/emscripten.h>

/**
    The WebAssembly entry points.

    A flat C surface, because that is what crosses the boundary cheaply and
    because the same functions are what a JUCE plugin would call if it wanted to
    host an instrument built this way. Nothing here is web-specific except the
    EMSCRIPTEN_KEEPALIVE, which only stops the linker discarding it.

    One global instrument. The worklet is single-threaded and there is one
    plugin per window, so an instance handle would be ceremony around a
    singleton.
*/
namespace
{
aka::dsp::Instrument instrument;
std::vector<aka::dsp::BlockType> pendingTypes;
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
void aka_prepare (double sampleRate, int maxBlock)
{
    instrument.prepare (sampleRate, maxBlock);
}

/** Called once per rebuild, before aka_set_blocks. */
EMSCRIPTEN_KEEPALIVE
void aka_begin_blocks() { pendingTypes.clear(); }

EMSCRIPTEN_KEEPALIVE
void aka_push_block (int type)
{
    if (type > 0 && type < aka::dsp::numBlockTypes)
        pendingTypes.push_back ((aka::dsp::BlockType) type);
    else
        pendingTypes.push_back (aka::dsp::BlockType::none);
}

EMSCRIPTEN_KEEPALIVE
void aka_commit_blocks() { instrument.setAllTypes (pendingTypes); }

EMSCRIPTEN_KEEPALIVE
void aka_set_param (int block, int index, float value)
{
    instrument.setParam (block, index, value);
}

EMSCRIPTEN_KEEPALIVE
void aka_note_on (int note, float velocity) { instrument.noteOn (note, velocity); }

EMSCRIPTEN_KEEPALIVE
void aka_note_off (int note) { instrument.noteOff (note); }

EMSCRIPTEN_KEEPALIVE
void aka_all_notes_off() { instrument.allNotesOff(); }

EMSCRIPTEN_KEEPALIVE
void aka_process (float* left, float* right, int frames)
{
    instrument.process (left, right, frames);
}

EMSCRIPTEN_KEEPALIVE
int aka_active_voices() { return instrument.activeVoices(); }

/** One sequencer step, from the face. Note is absolute MIDI. */
EMSCRIPTEN_KEEPALIVE
void aka_set_step (int block, int index, int active, int note, float velocity, float gate)
{
    instrument.setStep (block, index, active != 0, note, velocity, gate);
}

/** Which step is playing, so the grid can draw its own playhead. */
EMSCRIPTEN_KEEPALIVE
int aka_current_step() { return instrument.currentStep(); }

} // extern "C"
