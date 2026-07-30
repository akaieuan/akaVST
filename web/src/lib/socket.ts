import type { PluginAccent } from "@/lib/plugins";
import type { RackMode } from "@/components/site/rack";

/**
 * Socket, which is not a plugin.
 *
 * It sits beside the three instruments rather than among them: it is the tool
 * that makes one. That is why it has its own route instead of a slug under
 * /plugins — that page opens by claiming three instruments, and a fourth entry
 * that is a desktop app would make the claim false.
 *
 * The shape below deliberately mirrors a Plugin so the same section components
 * render it. What it cannot have is `facts`: those are read from a plugin's
 * CMakeLists at a commit, and Socket has no CMakeLists. Its specifications are
 * written here and say so.
 */
export type SocketEntry = {
  name: string;
  kind: string;
  oneLiner: string;
  /** Shown where a plugin shows its version. */
  status: string;
  why: string[];
  deepDive: { heading: string; paragraphs: string[] }[];
  features: { title: string; body: string }[];
  /** Same shape as a plugin's, so the same Gallery renders it. */
  gallery: { src: string; caption: string }[];
  specs: { label: string; value: string }[];
  state: { shipping: string[]; next: string[] };
  headings: { why: string; features: string; gallery: string; specs: string; state: string };
  accent: PluginAccent;
  mark: RackMode;
  repo: string;
};

export const SOCKET: SocketEntry = {
  name: "Socket",
  kind: "Plugin builder",
  oneLiner: "Build an instrument out of blocks, and hear it before it exists.",
  status: "In development · not released",

  why: [
    "The three instruments on this site share a design system, a look-and-feel and a widget library, and none of that is the hard part. The hard part is that each one still had to be assembled by hand — a window laid out in code, a voice wired in code, a chain of effects written once for that plugin and not reusable in the next.",
    "Socket is the answer to doing it a fourth time. You drag blocks onto a plugin window, lay them out on a grid, wire the signal path, patch modulation with cables, and hear the result immediately. What you compose is what the plugin is.",
    "It is aimed at someone who knows what they want an instrument to do and does not want to write C++ to find out whether it works. The blocks are the vocabulary; arranging them is the design work.",
  ],

  deepDive: [
    {
      heading: "The engine is the plugin's engine",
      paragraphs: [
        "A block's DSP has to run in two places: in Socket, so composing an instrument means hearing it, and in the plugin Socket generates, so what you export sounds like what you built.",
        "Writing it twice — once for the app, once for the plugin — is the fastest route to first sound and guarantees the two drift. This project already rejected that reasoning for colour: the design tokens are generated precisely because a copied palette is one that will be wrong within a month. A copied filter is worse, because you cannot see it drift, only hear it.",
        "So the DSP is written once in C++, lives in the shared skeleton alongside the look-and-feel, and is compiled to WebAssembly for the app. Socket previews the exact code the plugin will ship.",
      ],
    },
    {
      heading: "A constraint worth having",
      paragraphs: [
        "WebAssembly cannot link JUCE. That means nothing in the shared engine may include it — which sounds like a limitation and is actually the discipline that makes a shared library real rather than a thin wrapper over somebody else's.",
        "The survey that started the work made the case better than the argument does. akaBleep's oscillator ported in five minutes: it was already written against the standard library. Its effects chain could not port at all, because it is a shell over juce::dsp — so the delay, reverb, chorus, phaser, compressor and the rest were written rather than moved, and now belong to all three instruments instead of one.",
      ],
    },
    {
      heading: "Layout and signal are different questions",
      paragraphs: [
        "Where a panel sits on the face is a layout choice. What feeds what is a routing one. Conflating them was the deepest thing wrong with the first version of this — a filter drawn to the left of an oscillator tells you nothing about the order they run in.",
        "So there are two views over the same instrument. One is the face you are designing; the other is the chain, and it drives the engine: a topological sort over the wires decides what runs when. Blocks you have not wired keep their layout position, so a half-finished instrument still makes the sound it was making.",
      ],
    },
  ],

  features: [
    {
      title: "Forty-nine blocks",
      body: "Oscillators, wavetables, FM and a plucked string; filters, formants, folders and crushers; envelopes, LFOs, a sequencer and an arpeggiator; twelve effects. Every one makes a sound.",
    },
    {
      title: "A patch bay with cables",
      body: "Drag a cable from a source jack to a destination and it routes for real. Both ends resolve against your instrument, and a jack with nothing behind it says which block to place.",
    },
    {
      title: "akaBleep's sequencer",
      body: "Sixty-four steps across four pages, as pads. A step carries a note, a velocity and a gate length rather than a boolean — which is the whole difference between a sequencer and a metronome.",
    },
    {
      title: "Displays on the real signal",
      body: "The pixel screen, scope, analyser and meter read the output rather than animating a stand-in. The same PixelRack idiom the marks on this site are drawn in.",
    },
    {
      title: "Panels you lay out",
      body: "Move a panel by its header, resize it from its edges on a twelve-column grid. Controls grow into the room they are given, the way hardware does, so a wide panel is not four knobs and a gap.",
    },
    {
      title: "Eight starting points",
      body: "A preset is a whole instrument — layout, wiring, patch cables and pattern as well as every knob. Each shows a different corner of the catalogue rather than a different filter setting.",
    },
  ],

  gallery: [
    {
      src: "/socket/interface.png",
      caption:
        "Nine blocks on one page — oscillator into filter, delay and reverb, a compressor and limiter, an EQ and a spectrum, and bleep's sequencer along the bottom. Bottom left is the plugin's real size in pixels; the right panel is editing the one selected block.",
    },
  ],

  specs: [
    { label: "Kind", value: "Desktop application" },
    { label: "Built with", value: "Electron · React · TypeScript" },
    { label: "Engine", value: "C++ compiled to WebAssembly" },
    { label: "Shared with", value: "aka_skeleton — the plugins' own DSP" },
    { label: "Blocks", value: "49, all with engines" },
    { label: "Presets", value: "8 complete instruments" },
    { label: "Platform", value: "macOS (Ableton tested)" },
  ],

  state: {
    shipping: [
      "Forty-nine blocks, every one with a working audio engine",
      "Signal routing that drives the engine, not a diagram of it",
      "Modulation matrix, patched with cables on the face",
      "Sixty-four-step sequencer ported from akaBleep",
      "Undo, keyboard editing, eight preset instruments",
    ],
    next: [
      "Saving and loading — there is no file format yet",
      "Export: generating the JUCE project a composed instrument describes",
      "Parameter locks, which akaBleep's sequencer has and this one does not",
      "A sampler that can load a sample",
      "A public build",
    ],
  },

  headings: {
    why: "Doing it a fourth time should not mean starting again.",
    features: "The vocabulary you build an instrument out of.",
    gallery: "One page, nine blocks, and a sound coming out of it.",
    specs: "What it is, and what it shares with the plugins.",
    state: "Everything makes a sound. Nothing saves yet.",
  },

  // Green is the one accent the three instruments do not spend, so Socket reads
  // as a fourth thing rather than a fourth instrument. The collection mark is
  // the many-cells one, which is what a rack of blocks is.
  accent: "green",
  mark: "collection",
  repo: "https://github.com/akaieuan/Socket",
};
