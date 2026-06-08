/**
 * The plugin catalog — single source of truth for every product.
 * Adding a plugin = adding one entry to PLUGINS below.
 *
 * Copy here is written from each plugin's own README / manual, so it's
 * accurate to the actual feature set. `priceId` is intentionally left
 * empty for now — Buy buttons render as "coming soon" until you add one.
 */

export type PluginFormat = "VST3" | "AU" | "Standalone";
export type PluginSpec = { label: string; value: string };
export type Feature = { title: string; body: string };
export type GalleryItem = { src: string; caption: string };

export type Plugin = {
  slug: string;
  /** display name as it appears in the user's plugin list */
  name: string;
  /** marketing / brand name */
  fullName: string;
  category: string;
  /** very short hook for cards */
  oneLiner: string;
  /** one-line hook for the product hero */
  tagline: string;
  /** card / SEO description (~2 sentences) */
  description: string;
  /** rich intro paragraph(s) for the product page */
  overview: string;
  /** quick scannable bullets */
  highlights: string[];
  /** deep-dive feature blocks */
  features: Feature[];
  /** monospace signal-flow diagram, if the plugin has one */
  signalFlow?: string;
  /** factory preset info */
  presets?: { count: number; note: string; examples: string[] };
  /** real screenshots in /public/plugins/<slug>/ (empty = styled placeholder) */
  heroImage?: string;
  gallery: GalleryItem[];
  /** technical spec chips */
  specs: PluginSpec[];
  // --- commerce (stubbed for now) ---
  price: string;
  priceId: string;
  downloadKey: string;
  // --- theming ---
  accent: string;
  accentForeground: string;
  formats: PluginFormat[];
  platform: string;
  version: string;
  repo: string;
};

export const PLUGINS: Plugin[] = [
  /* ------------------------------------------------------------------ *
   * akaBleep
   * ------------------------------------------------------------------ */
  {
    slug: "bleep",
    name: "akaBleep",
    fullName: "akaBleep",
    category: "Acid synth + sequencer",
    oneLiner: "Acid voice + 64-step P-lock sequencer.",
    tagline: "A hypnotic-techno acid voice and step sequencer in a single plugin.",
    description:
      "A squelchy two-oscillator acid synth wrapped around an Elektron-style 64-step sequencer with per-step parameter locks, a drag-to-wire modulation patch bay, and a master FX chain. Built to be performed live in Ableton.",
    overview:
      "akaBleep is a monophonic instrument for the bleep-bloop lineage of hypnotic techno — the Donato Dozzy / Surgeon / Plastikman school where one acid line, slowly mutating over sixteen bars, is the track. Instead of wiring a synth to a sequencer to a fistful of utilities, akaBleep folds the whole loop into one window: a voice that squelches, a sequencer that locks a different sound to every step, a patch bay to set it breathing, and an FX chain to smear it into the room.",
    highlights: [
      "Monophonic acid voice with the classic resonant ‘bloop’",
      "64 steps across 4 pages with per-step parameter locks",
      "Drag-to-wire modulation patch bay",
      "Master FX chain, P-lockable per step",
      "Phase-syncs to your host transport",
    ],
    features: [
      {
        title: "The acid voice",
        body: "Two multi-mode oscillators (saw / square / sine and more), each with tune, level, pulse-width and FM, plus a sub and ring mod. Everything sums into a tanh drive stage and a ladder filter. Three envelopes sculpt it — amp ADSR, a filter ADSR with ±5 octaves of sweep, and the exponential pitch-decay envelope that is the secret to the genre’s resonant ‘bloop’.",
      },
      {
        title: "64-step sequencer with parameter locks",
        body: "The heart of the instrument. Hit REC and twist any knob while it plays to lock that value live to the current step, or select a step in EDIT and dial it by hand. Around 40 parameters are P-lockable, so step 3 can be a dark sub thud and step 11 a screaming resonant chirp — from one voice.",
      },
      {
        title: "Chords, chance & generators",
        body: "Per step you get chords (up to 4 notes), velocity, gate length and probability. Set chance below 100% and the line never repeats the same way twice. Pattern generators seed ideas instantly — four-on-the-floor, off-beats, 8ths, Euclidean 3/5/7, or sparse / dense random.",
      },
      {
        title: "Modulation patch bay",
        body: "Flip to the patch bay and wire modulation like a modular: drag a cable from a source jack to a destination. Route LFO, filter envelope, noise or velocity into oscillator pitch & PW, filter cutoff & resonance, or amplitude — bipolar where it matters. Drag a jack to set depth, right-click a cable to pull it.",
      },
      {
        title: "Master FX chain",
        body: "A built-in chain runs after the voice: chorus → phaser → bitcrush → ping-pong delay → reverb. Each stage bypasses itself at zero mix, every FX parameter is P-lockable per step, and a live spectrum analyzer shows what you’re doing. The bitcrush + ping-pong delay pair is the fast route from clean bleep to ruined dub-techno smear.",
      },
      {
        title: "Built to perform",
        body: "Hit PLAY to run standalone, or it phase-syncs to the host transport — drop it on an Ableton track, hit space, and it locks to the grid. An Ableton-style computer-keyboard piano lets you play without a controller, with undo / redo across edits, locks and preset loads.",
      },
    ],
    signalFlow: `        ┌─ osc 1 ─┐
        ├─ osc 2 ─┤
 MIDI ─▶┤  sub    ├─▶ mix ─▶ tanh drive ─▶ ladder filter ─▶ amp env ─▶┐
        └─ ring ──┘              ▲              ▲                       │
                                 │              │                       │
        LFO · filter env · noise · velocity  ──▶ patch bay              │
                                                                        ▼
        out ◀── reverb ◀── ping-pong delay ◀── bitcrush ◀── phaser ◀── chorus`,
    presets: {
      count: 38,
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
    heroImage: "/plugins/bleep/akableep-ui.png",
    gallery: [
      { src: "/plugins/bleep/akableep-ui.png", caption: "The synth voice — oscillators, envelopes, ladder filter" },
      { src: "/plugins/bleep/sequencer.png", caption: "64-step sequencer in EDIT mode with per-step locks" },
      { src: "/plugins/bleep/patchbay.png", caption: "Modulation patch bay — drag-to-wire cable matrix" },
      { src: "/plugins/bleep/fx-chain.png", caption: "Master FX chain with live spectrum analyzer" },
      { src: "/plugins/bleep/presets.png", caption: "Preset browser — genre-curated factory patches" },
    ],
    specs: [
      { label: "Voice", value: "Monophonic acid" },
      { label: "Sequencer", value: "64 steps / 4 pages" },
      { label: "Presets", value: "38 factory" },
      { label: "Engine", value: "JUCE 8 · C++17" },
    ],
    price: "$39",
    priceId: "",
    downloadKey: "releases/bleep/akaBleep-latest.zip",
    accent: "oklch(0.65 0.21 350)",
    accentForeground: "oklch(0.16 0.004 285)",
    formats: ["VST3", "AU", "Standalone"],
    platform: "macOS 11+ · Apple Silicon + Intel",
    version: "v0.4.0",
    repo: "akaieuan/akaBleep-VST",
  },

  /* ------------------------------------------------------------------ *
   * akaEnzyme
   * ------------------------------------------------------------------ */
  {
    slug: "enzyme",
    name: "Enzyme",
    fullName: "akaEnzyme",
    category: "Lo-fi multi-timbral synth",
    oneLiner: "4-layer lo-fi synth, Protein-inspired.",
    tagline: "A 4-layer lo-fi multi-timbral synth inspired by the Waldorf Protein.",
    description:
      "Four independent layers sharing a single 8-voice pool, routed by a hardware-style Multi engine, then smeared through a switchable FX rack and a dedicated lo-fi mangle section. Signed, universal, and DAW-ready.",
    overview:
      "akaEnzyme reimagines the Waldorf Protein’s 8-bit tabletop character as a modern plugin. Four layers (A/B/C/D) share one 8-voice pool, routed by a hardware-style Multi engine, then run through a switchable FX rack and a dedicated ‘sample-breaking’ mangle section. The grit comes from bitcrush, sample-rate reduction and drive waveshaping — it evokes the hardware’s lo-fi bite rather than emulating a wavetable engine. Designed to be stacked, split and mangled fast, live, inside Ableton.",
    highlights: [
      "4 layers (A/B/C/D) over one shared 8-voice pool",
      "Five Multi modes — layered, round-robin, MIDI-split & more",
      "Two switchable FX slots, 1-of-9 each",
      "Lo-fi mangle: bitcrush, SRR, drive, stutter",
      "Host-synced arpeggiator + per-layer Dirt",
    ],
    features: [
      {
        title: "Voice engine, per layer",
        body: "Each layer gets two multi-mode oscillators with 2-op FM, PolyBLEP band-limited saw & square, a sub and ring mod, a ladder filter (LPF24 / LPF12 / HPF12 / BPF12), three envelopes, a tanh drive stage and log-scale glide. Per-layer ‘Dirt’ adds noise grit — Static / Crackle / Geiger / Click / Burst — mixed pre-filter so the ladder shapes it.",
      },
      {
        title: "The Multi engine",
        body: "One shared 8-voice pool with global voice-stealing, exactly like the hardware — not four separate synths. Five modes: Single, Layered, Round-Robin, Random-Robin and MIDI-Split, with three key-split points. Channel-tagging routing guarantees note-offs release exactly the layers a note-on hit, even if the mode changes mid-note.",
      },
      {
        title: "Switchable FX rack",
        body: "Two series slots, each switchable 1-of-9: Chorus, Flanger, Phaser, Tremolo, Drive, Compressor, EQ, Delay, Reverb. Generic macro controls (mix / rate / depth / feedback / drive / tone / time) are reinterpreted per type, and each slot bypasses itself when its mix is at zero.",
      },
      {
        title: "Lo-fi / mangle",
        body: "The sample-breaking section, in series: drive waveshapers (PNP / Tube / Pickup / Diode / Crunch), 1–16 bit bitcrush, sample-rate reduction up to 64×, and a free-running stutter / glitch buffer-repeat. The fast route from a clean stack to a broken, vinyl-bitten texture.",
      },
      {
        title: "Host-synced arpeggiator",
        body: "Up / Down / Up-Down / Random / As-Played patterns, note-division rate (1/2 … 1/32 + triplets), up to 4 octaves, gate length and swing. Locks to host tempo and feeds the Multi engine, so the arp follows your layer routing.",
      },
      {
        title: "Finished-instrument feel",
        body: "Ships as a signed universal VST3 / AU that passes Apple’s auval on both architectures. Click-free smoothed master gain, a master output-safety stage (DC blocker + soft clipper), correct tail & latency reporting, a resizable aspect-locked UI, and a fully host-automatable, per-layer parameter tree.",
      },
    ],
    presets: {
      count: 0,
      note: "A factory bank spanning every category, exercising all four layers — from layered pads and 4-zone MIDI splits to round-robin plucks and bitcrush textures.",
      examples: ["Bass", "Lead", "Keys", "Pad", "Multi", "Arp", "Texture"],
    },
    gallery: [],
    specs: [
      { label: "Layers", value: "4 (A/B/C/D)" },
      { label: "Voices", value: "8 shared" },
      { label: "FX slots", value: "2 × 1-of-9" },
      { label: "Validation", value: "Passes auval" },
    ],
    price: "$49",
    priceId: "",
    downloadKey: "releases/enzyme/Enzyme-latest.zip",
    accent: "oklch(0.62 0.17 255)",
    accentForeground: "oklch(0.97 0 0)",
    formats: ["VST3", "AU", "Standalone"],
    platform: "macOS 11+ · Apple Silicon + Intel",
    version: "v1.0.0",
    repo: "akaieuan/akaEnzyme-VST",
  },

  /* ------------------------------------------------------------------ *
   * i4
   * ------------------------------------------------------------------ */
  {
    slug: "i4",
    name: "i4",
    fullName: "akaI4",
    category: "Sculpting sampler",
    oneLiner: "Sculpting sampler, Torso S-4-inspired.",
    tagline: "A sculpting sampler inspired by the Torso S-4.",
    description:
      "Take one sample (or sixteen) and run it through granular, resonant, destruction and space engines under a 4-slot modulation matrix — then resample the mangled result straight back into the instrument.",
    overview:
      "i4 takes a sample and runs it through a series of sound-sculpting engines, lets you modulate any of it, and resamples the result straight back into the instrument. Built for performance: granular textures, resonant tones, destruction and space — all under a 4-slot modulation matrix reaching nearly 50 targets. Tape is the master clip; sixteen pads sum in right after it, so every pad runs through the full effect chain too.",
    highlights: [
      "Varispeed tape source + 16 sample pads",
      "Mosaic granular & a 48-band resonator",
      "Deform destruction + Vast time & space",
      "Beat Repeat, Tape Stop & a Loop Recorder",
      "4-slot mod matrix to ~50 destinations",
    ],
    features: [
      {
        title: "Tape — the source",
        body: "A varispeed tape-style player. Scrub start / length, rotate the loop, glide between speeds, reverse, freeze the playhead, and keylock for pitch-independent stretching. SOS (sound-on-sound) layers passes into the loop.",
      },
      {
        title: "16-slot pad sampler",
        body: "Sixteen sample pads triggered from MIDI or the on-screen keys. Pads feed the same chain as Tape, so they get granulated, resonated, deformed and spaced alongside it.",
      },
      {
        title: "Mosaic & Ring",
        body: "Mosaic is a granular cloud — set grain rate, size and contour, spray and warp the cloud, detune and quantize grain pitch to a scale. Ring is a 48-band resonator bank: tune cutoff, resonance and decay, pitch and detune the partials, inject waves and noise for harmonic, bell-like or vocal resonances.",
      },
      {
        title: "Deform & Vast",
        body: "Deform handles destruction and dynamics — drive/saturation, compression, bitcrush, spectral tilt, a noise layer and a gate. Vast is a synced delay and a reverb in one: feedback, stereo spread, damp, decay, size, and an infinite freeze.",
      },
      {
        title: "Resample anything",
        body: "Beat Repeat is a tempo-synced stutter that replaces the output with a repeating slice — what you hear is exactly what gets resampled. Tape Stop gives a turntable spin-down, and the Loop Recorder captures up to 30 seconds of the full post-effect stereo output and drops it onto a pad.",
      },
      {
        title: "Deep modulation",
        body: "Four mod slots — each a Wave LFO, Random, or ADSR envelope — with multiple routes per slot to nearly 50 destinations spanning every engine. Rates are tempo-syncable; right-click any knob to assign it to a slot. A one-knob Master Filter morphs lowpass → bypass → highpass across the mix.",
      },
    ],
    signalFlow: `        ┌──────────────── Mod Matrix · 4 slots ────────────────┐
        │       Wave LFO · Random · ADSR  →  ~50 targets        │
        ▼                                                       ▼
 Tape + 16 Pads ─▶ Mosaic ─▶ Ring ─▶ Deform ─▶ Vast ─▶ Beat Repeat ─▶ Master Filter ─▶ out
   (source)       (granular)(reson.) (deform) (space)  (stutter)              │
                                                                              └▶ Loop Recorder ─▶ new Pad`,
    gallery: [],
    specs: [
      { label: "Source", value: "Tape + 16 pads" },
      { label: "Resonator", value: "48 bands" },
      { label: "Mod targets", value: "~50" },
      { label: "Engine", value: "JUCE 8 · C++17" },
    ],
    price: "$59",
    priceId: "",
    downloadKey: "releases/i4/i4-latest.zip",
    accent: "oklch(0.72 0.16 60)",
    accentForeground: "oklch(0.16 0.004 285)",
    formats: ["VST3", "AU", "Standalone"],
    platform: "macOS 11+ · Apple Silicon + Intel",
    version: "v0.1.0",
    repo: "akaieuan/akaI4-VST",
  },
];

export function getPlugin(slug: string): Plugin | undefined {
  return PLUGINS.find((p) => p.slug === slug);
}

export function pluginSlugs(): string[] {
  return PLUGINS.map((p) => p.slug);
}
