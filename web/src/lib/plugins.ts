import type { RackAccent, RackMode } from "@/components/site/rack";

export type PluginSlug = "bleep" | "enzyme" | "i4";

/** The accent tokens the mark can paint with, so the two cannot drift apart. */
export type PluginAccent = RackAccent;

export interface Plugin {
  slug: PluginSlug;
  /** The name as it appears in a plugin list. */
  name: string;
  /** What kind of instrument it is, in three or four words. */
  kind: string;
  /** The hook. Used as the h1 on the plugin page. */
  oneLiner: string;
  /** The hardware and the records it descends from. */
  lineage: string[];
  /** Why it exists, in a few paragraphs. */
  why: string[];
  /** The long read, sourced from each repo's own docs. */
  deepDive: { heading: string; paragraphs: string[] }[];
  features: { title: string; body: string }[];
  /** Monospace diagram, lifted verbatim from the plugin's README. */
  signalFlow?: string;
  presets?: { count: number; note: string; examples: string[] };
  /** Real screenshots in /public/plugins/<slug>/. Empty renders the mark alone. */
  gallery: { src: string; caption: string }[];
  /** Spec rows the CMakeLists cannot tell us. */
  specs: { label: string; value: string }[];
  /** Honest status: what works today, what is queued. */
  state: { shipping: string[]; next: string[] };
  /**
   * Section headings. The mono kicker keeps the structural label, so each of
   * these is a claim about this instrument rather than the name of a slot.
   */
  headings: {
    why: string;
    features: string;
    signalFlow: string;
    gallery: string;
    presets: string;
    specs: string;
    state: string;
  };
  /** One accent, spent on a single dot. Everything else is greyscale. */
  accent: PluginAccent;
  /** Which idle motion the mark runs. */
  mark: RackMode;
  repo: string;
}

/** Resolves a plugin's accent to a themeable custom-property reference. */
export const ACCENT_COLORS: Record<PluginAccent, string> = {
  blue: "var(--accent-blue)",
  amber: "var(--accent-amber)",
  rose: "var(--accent-rose)",
  violet: "var(--accent-violet)",
  green: "var(--accent-green)",
};

export const PLUGINS: Plugin[] = [
  {
    slug: "bleep",
    name: "akaBleep",
    kind: "Acid synth and sequencer",
    oneLiner: "An acid voice and a 64-step sequencer in one window.",
    lineage: [
      "Donato Dozzy",
      "Surgeon",
      "Plastikman",
      "Elektron parameter locks",
      "Moog Grandmother",
    ],
    why: [
      "akaBleep is a monophonic instrument for the bleep-bloop lineage of hypnotic techno, the school where one acid line mutating slowly over sixteen bars is the track.",
      "Stock racks can get you there, but it means wiring a synth to a sequencer to a fistful of utilities and automation lanes. akaBleep folds the whole loop into one window: one plugin, on one MIDI track, that you can perform.",
      "A short pitch blip into a resonant low-pass is the acid bloop. Push cutoff down and resonance up and the filter starts to talk.",
    ],
    deepDive: [
      {
        heading: "The voice",
        paragraphs: [
          "Two multi-mode oscillators, each with tune, level, pulse width and a two-operator FM pair. A sub oscillator, a ring modulator and white noise feed the same mixer, then a tanh drive stage runs into a ladder filter.",
          "Three envelopes shape it. An amp ADSR, a filter ADSR sweeping five octaves either way, and an exponential pitch decay, which is the one that makes the blip. Glide and an LFO round the voice out.",
          "An akaElders mode opens a Grandmother-inspired expanded patch: oscillator sync, extra noise, and modulation routes the standard panel does not expose.",
        ],
      },
      {
        heading: "Parameter locks, across 64 steps",
        paragraphs: [
          "Four pages of sixteen steps, with variable pattern length and around forty parameters lockable per step. There are two ways in. REC captures locks live as you twist, and EDIT selects a step so that any knob you touch locks to it.",
          "Each step carries a chord of up to four notes, plus velocity, gate and a probability. Generators cover four-on-the-floor, off-beats, eighths, Euclidean 3, 5 and 7, and sparse or dense random fills.",
          "The sequencer phase-syncs to host PPQ, so patterns land where the transport says they should rather than where the plugin happened to start. Probability is what keeps a static loop alive over time.",
        ],
      },
      {
        heading: "Ruining it",
        paragraphs: [
          "The drag-to-wire patch bay has left. Wiring modulation by hand is a different instrument from an acid box with a sequencer, and it was sharing an editor with one; it is becoming akaPatch, which keeps this voice and gives the cables a window of their own.",
          "After the voice, the master chain runs chorus into phaser into bitcrush into ping-pong delay into reverb. Each stage auto-bypasses at zero mix, each is P-lockable per step, and the whole rack has its own preset bank and a randomiser.",
          "That is the fast route from a clean bleep to a ruined, perfect dub-techno smear.",
        ],
      },
    ],
    features: [
      {
        title: "Monophonic acid voice",
        body: "Two oscillators, sub and ring mod through a tanh drive into a ladder filter, with an exponential pitch decay for the blip.",
      },
      {
        title: "64 steps, ~40 lockable parameters",
        body: "Four pages of sixteen, REC and EDIT workflows, and per-step chords, velocity, gate and chance.",
      },
      {
        title: "A screen that watches the output",
        body: "The display beside the step grid is a live spectral field, blooming from the centre and driven by the instrument's own filterbank rather than by a clock.",
      },
      {
        title: "Master FX chain",
        body: "Chorus, phaser, bitcrush, ping-pong delay and reverb, all P-lockable, with a preset bank and a randomiser.",
      },
      {
        title: "Pattern generators",
        body: "Four-on-the-floor, off-beats, eighths, Euclidean 3, 5 and 7, and sparse or dense random fills.",
      },
      {
        title: "Locked to the host",
        body: "Phase-syncs to host PPQ, with undo and redo across the sequencer and the voice.",
      },
    ],
    signalFlow: `        ┌─ osc 1 ─┐
        ├─ osc 2 ─┤
 MIDI ─▶┤  sub    ├─▶ mix ─▶ tanh drive ─▶ ladder filter ─▶ amp env ─▶┐
        └─ ring ──┘              ▲              ▲                       │
                                 │              │                       │
        LFO · filter env · noise · velocity  ──▶ modulation             │
                                                                        ▼
        out ◀── reverb ◀── ping-pong delay ◀── bitcrush ◀── phaser ◀── chorus`,
    presets: {
      count: 39,
      note: "Genre-curated factory patches, plus a user store with favourites.",
      examples: [
        "Acid Wobble",
        "Liquid Acid",
        "Detroit Stab",
        "Aphex Bell",
        "Sub Bleep",
        "R2D2",
        "Cosmic Drift",
        "Warp Bleep",
        "Vinyl Bell",
        "Phase Walker",
        "Crystal Pluck",
        "Vapor Wash",
      ],
    },
    gallery: [
      {
        src: "/plugins/bleep/akableep-ui.png",
        caption: "The synth page, running. The display left of the step grid is a live spectral field, and the lit steps decay behind the playhead",
      },
      {
        src: "/plugins/bleep/light-theme.png",
        caption: "The same panel on the light theme — every colour is derived, so neither theme is the afterthought",
      },
      {
        src: "/plugins/bleep/sequencer.png",
        caption: "Stopped. A Euclidean 5/16 pattern, with parameter locks marked on the steps that hold them",
      },
    ],
    specs: [
      { label: "Voice", value: "Monophonic" },
      { label: "Sequencer", value: "64 steps across 4 pages" },
      { label: "Parameters", value: "81 automatable" },
      { label: "UI themes", value: "2 (light and dark)" },
      { label: "Engine", value: "JUCE 8 · C++17" },
      { label: "Tested in", value: "Ableton Live" },
    ],
    state: {
      shipping: [
        "Acid voice, 64-step sequencer and master FX chain",
        "39 factory presets and a user store",
        "Universal binary, Apple Silicon and Intel",
      ],
      next: [
        "A modulation section, replacing what the patch bay used to reach",
        "Developer ID signing and notarisation",
        "A signed .pkg installer",
        "A pluginval strict pass across a multi-DAW matrix",
      ],
    },
    headings: {
      why: "One acid line, mutating over sixteen bars, is the track.",
      features: "Forty parameters, lockable per step.",
      signalFlow: "Two oscillators in. One ruined bleep out.",
      gallery: "Eight themes ship. This is Magenta.",
      presets: "Thirty-nine patches, and somewhere to keep your own.",
      specs: "Eighty-one parameters, and the codes your DAW files it under.",
      state: "v0.4.0, and not yet notarised.",
    },
    accent: "rose",
    mark: "board",
    repo: "https://github.com/akaieuan/akaBleep-VST",
  },
  {
    slug: "enzyme",
    name: "Enzyme",
    kind: "Lo-fi multi-timbral synth",
    oneLiner: "Four lo-fi layers drawing on one shared voice pool.",
    lineage: ["Waldorf Protein"],
    why: [
      "Enzyme reimagines the Protein's 8-bit tabletop character as a modern plugin. The grit comes from bitcrush, sample-rate reduction and drive waveshaping, so it evokes the hardware's lo-fi bite rather than emulating a wavetable engine.",
      "Four layers, A through D, draw on one shared eight-voice pool with global voice stealing, exactly like the hardware. It is one instrument with four timbres, not four synths in a rack.",
      "Designed to be stacked, split and mangled quickly, live, without a rack of utilities around it.",
    ],
    deepDive: [
      {
        heading: "One voice pool, five modes",
        paragraphs: [
          "Single, Layered, Round-Robin, Random-Robin and MIDI-Split. Three key split points, per-layer enable, level and pan, and channel-tagged routing carried on a per-note bitmask.",
          "The important part is what they share. Voice stealing is global, so a four-layer stack and a four-zone split both draw from the same eight voices, and the instrument runs out of polyphony the way the hardware does.",
        ],
      },
      {
        heading: "Where the grit comes from",
        paragraphs: [
          "Each layer is a full voice: two multi-mode oscillators with PolyBLEP band-limited saw and square, a sub, a ring modulator, a ladder filter in LPF24, LPF12, HPF12 or BPF12, three envelopes, tanh drive and glide.",
          "Then Dirt, a per-layer noise character mixed in ahead of the filter, in five flavours: Static, Crackle, Geiger, Click and Burst. It is the difference between a clean digital layer and one that sounds like it came off a table.",
          "The mangle section is where it breaks properly. Five drive waveshapers (PNP, Tube, Pickup, Diode, Crunch), bit crush from 1 to 16 bits, sample-rate reduction up to 64 times, and a free-running stutter that does not care about your grid.",
        ],
      },
      {
        heading: "Finished, not a prototype",
        paragraphs: [
          "Enzyme passes auval on both architectures, reports correct tail and latency, smooths automation, and guards its output bus with a DC blocker and a soft clipper above a 0.9 knee. Parameter IDs are frozen on an L{0..3} scheme, so presets and automation survive future versions.",
          "It deliberately has no step sequencer. Layer targeting was ambiguous, the serialization risk was real, and the arpeggiator turned out to be the cleaner and higher-value half of that idea.",
          "What is still open is honest: an eight-slot-per-layer modulation matrix, a settings page, and per-parameter smoothing inside the voice, which is audible today on fast cutoff automation.",
        ],
      },
    ],
    features: [
      {
        title: "Four layers, one voice pool",
        body: "Eight voices shared across A to D with global stealing, in five multi modes including a three-point MIDI split.",
      },
      {
        title: "Dirt",
        body: "Per-layer noise grit mixed ahead of the filter: Static, Crackle, Geiger, Click and Burst.",
      },
      {
        title: "Two-slot FX rack",
        body: "Series slots, each one of nine: chorus, flanger, phaser, tremolo, drive, compressor, EQ, delay, reverb.",
      },
      {
        title: "Sample breaking",
        body: "Five drive waveshapers, 1 to 16 bit crush, sample-rate reduction to 64x, and a free-running stutter.",
      },
      {
        title: "Host-synced arpeggiator",
        body: "Up, down, up-down, random and as-played, 1/2 to 1/32 with triplets, four octaves, gate and swing.",
      },
      {
        title: "Output safety",
        body: "DC blocker, soft clipper, ramped master gain and denormal guards, so nothing surprises the master bus.",
      },
    ],
    presets: {
      count: 18,
      note: "Across eight categories, exposed to the host as programs.",
      examples: [
        "Sub Bass",
        "Reese Growl",
        "Square Lead",
        "FM Bells",
        "E-Piano",
        "Clav Pluck",
        "Warm Pad",
        "Glass Pad",
        "Split 4-Zone",
        "Round-Robin Pluck",
        "Arp Trance",
        "Ambient Drone",
      ],
    },
    gallery: [
      {
        src: "/plugins/enzyme/enzyme-ui.png",
        caption: "Layer A. The POOL panel bottom-right blooms with the output and takes the colour of whichever layer is holding the most voices",
      },
    ],
    specs: [
      { label: "Layers", value: "4 (A/B/C/D)" },
      { label: "Voices", value: "8, shared with global stealing" },
      { label: "FX", value: "2 series slots, 1 of 9 each" },
      { label: "Parameters", value: "76, frozen IDs" },
      { label: "UI themes", value: "2 (light and dark)" },
      { label: "Engine", value: "JUCE 8 · C++17" },
      { label: "Tested in", value: "Ableton Live" },
    ],
    state: {
      shipping: [
        "Voice engine, four layers and the Multi modes",
        "FX rack, mangle section and Dirt",
        "Arpeggiator, 18 presets, output safety",
        "A live spectral screen, coloured by whichever layer holds the pool",
        "Universal binary passing auval on both architectures",
      ],
      next: [
        "An eight-slot-per-layer modulation matrix",
        "A settings page for MIDI channel, transpose, master tune and MPE",
        "Per-parameter smoothing in the voice",
      ],
    },
    headings: {
      why: "Four timbres. Eight voices. One instrument.",
      features: "Everything that makes it sound like a table, not a laptop.",
      signalFlow: "One voice, four times over.",
      gallery: "One window, four timbres deep.",
      presets: "Eighteen patches, exposed to the host as programs.",
      specs: "Frozen parameter IDs, so today's presets still open next year.",
      state: "v1.0.0, and specific about what is still missing.",
    },
    accent: "blue",
    mark: "keys",
    repo: "https://github.com/akaieuan/akaEnzyme-VST",
  },
  {
    slug: "i4",
    name: "i4",
    kind: "Sculpting sampler",
    oneLiner: "One sample, five engines, resampled back into itself.",
    lineage: ["Torso S-4", "Elektron Digitone II"],
    why: [
      "i4 takes one sample, or sixteen, runs them through a series of sculpting engines, lets you modulate any of it, and resamples the result straight back into the instrument.",
      "Tape is the master clip and the sixteen pads sum in immediately after it, so every pad runs through the full chain too. Nothing bypasses what follows.",
      "Built to be performed: granular textures, resonant tones, destruction and space, all under a four-slot modulation matrix.",
    ],
    deepDive: [
      {
        heading: "The chain",
        paragraphs: [
          "Tape is a varispeed player. Scrub start and length, rotate the loop, glide between speeds, reverse, freeze the playhead, keylock the pitch, and layer sound-on-sound. The sixteen pads trigger from MIDI or on screen and sum in right after it.",
          "Mosaic is the granular cloud: rate, size, contour, spray, warp and detune, with grain pitch quantized to a scale. Ring is a 48-band resonator bank with cutoff, resonance, decay, pitch, detune, tilt and tone, plus noise injection, for harmonic, bell-like or vocal resonances.",
          "Deform handles destruction and dynamics: drive, compression, bit crush, spectral tilt, a noise layer with its own decay and colour, and a gate. Vast is time and space in one, a synced delay and reverb sharing feedback, spread, damp, decay and size, with an infinite freeze.",
        ],
      },
      {
        heading: "Modulation and performance",
        paragraphs: [
          "Four slots, each a Wave LFO, a Random source or an ADSR, with multiple routes per slot into around fifty destinations and tempo-syncable rates. Right-click any knob to assign it.",
          "Beat Repeat replaces the output rather than mixing into it, which is what makes the stutter resample exactly as heard. Tape Stop does the turntable spin-down. The Master Filter morphs low-pass to bypass to high-pass on one knob.",
          "The Loop Recorder closes the circle: capture up to thirty seconds of post-effect stereo and drop it onto a pad, where it re-enters the chain from the top.",
        ],
      },
      {
        heading: "Where it is",
        paragraphs: [
          "v0.1 and in active development. It is the largest of the three codebases and the youngest: seven pages, seventy-six automatable parameters, five factory presets and three UI themes.",
          "Two gaps worth naming. The build is not yet configured for a universal binary the way akaBleep and Enzyme are, so it currently targets the architecture it is built on. And the factory sample library it expects is not in the repository yet.",
        ],
      },
    ],
    features: [
      {
        title: "Tape",
        body: "A varispeed master clip: scrub, rotate, glide, reverse, freeze, keylock and sound-on-sound layering.",
      },
      {
        title: "Mosaic",
        body: "A granular cloud with rate, size, contour, spray, warp and detune, grain pitch quantized to a scale.",
      },
      {
        title: "Ring",
        body: "A 48-band resonator bank with noise injection, for harmonic, bell-like or vocal resonances.",
      },
      {
        title: "Deform and Vast",
        body: "Drive, compression, bit crush, spectral tilt and a gate, then a synced delay and reverb with infinite freeze.",
      },
      {
        title: "Four-slot mod matrix",
        body: "Wave LFO, Random and ADSR into around fifty destinations. Right-click any knob to assign it.",
      },
      {
        title: "The resampling loop",
        body: "Beat Repeat replaces the output, and the Loop Recorder drops thirty seconds of post-effect stereo onto a pad.",
      },
    ],
    signalFlow: `        ┌──────────────── Mod Matrix · 4 slots ────────────────┐
        │       Wave LFO · Random · ADSR  →  ~50 targets        │
        ▼                                                       ▼
 Tape + 16 Pads ─▶ Mosaic ─▶ Ring ─▶ Deform ─▶ Vast ─▶ Beat Repeat ─▶ Master Filter ─▶ out
   (source)       (granular)(reson.) (deform) (space)  (stutter)              │
                                                                              └▶ Loop Recorder ─▶ new Pad`,
    presets: {
      count: 5,
      note: "A starting set, expanding as the engines settle.",
      examples: [
        "Init",
        "Granular Pad",
        "Ring Cavern",
        "Tape Loop Mangler",
        "Frozen Echo",
      ],
    },
    gallery: [],
    specs: [
      { label: "Pages", value: "7 (Tape, Mosaic, Ring, Deform, Vast, Mods, Live)" },
      { label: "Pads", value: "16, post-Tape" },
      { label: "Resonator", value: "48 bands" },
      { label: "Parameters", value: "76 automatable" },
      { label: "Engine", value: "JUCE 8 · C++17" },
      { label: "Tested in", value: "Ableton Live" },
    ],
    state: {
      shipping: [
        "Tape, Mosaic, Ring, Deform and Vast",
        "Four-slot modulation matrix into ~50 destinations",
        "Beat Repeat, Tape Stop and the Loop Recorder",
      ],
      next: [
        "A universal binary build, matching the other two",
        "The factory sample library",
        "More than five factory presets",
      ],
    },
    headings: {
      why: "One sample, run through everything, then fed back to the start.",
      features: "Five engines, and a matrix sitting over all of them.",
      signalFlow: "Tape in. Resampled back onto a pad.",
      gallery: "One window, four timbres deep.",
      presets: "Five, for now.",
      specs: "Seven pages and seventy-six parameters.",
      state: "v0.1.0, the youngest and the largest.",
    },
    accent: "amber",
    mark: "engines",
    repo: "https://github.com/akaieuan/akaI4-VST",
  },
];

export function getPlugin(slug: string): Plugin | undefined {
  return PLUGINS.find((p) => p.slug === slug);
}

export function pluginSlugs(): PluginSlug[] {
  return PLUGINS.map((p) => p.slug);
}
