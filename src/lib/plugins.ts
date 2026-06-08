/**
 * The plugin catalog.
 *
 * This is the single source of truth for every product on the store.
 * Adding a new plugin = adding one entry to PLUGINS below.
 *
 * NOTE: the marketing copy (tagline / description / longDescription) is
 * placeholder text — swap it for your final wording. The structural data
 * (formats, specs, features, accent) is derived from each plugin's README.
 *
 * `priceId` is your Stripe Price ID (set later, e.g. price_123...). Until
 * it's filled in, the Buy button renders in a "coming soon" state.
 * `downloadKey` is the object key of the installer in your R2 bucket.
 */

export type PluginFormat = "VST3" | "AU" | "Standalone";

export type PluginSpec = { label: string; value: string };

export type Plugin = {
  slug: string;
  /** display name as it appears in the user's plugin list */
  name: string;
  /** marketing name (brand prefix) */
  fullName: string;
  /** one-line hook — PLACEHOLDER, edit me */
  tagline: string;
  /** ~2 sentence card/SEO description — PLACEHOLDER, edit me */
  description: string;
  /** longer hero paragraph for the product page — PLACEHOLDER, edit me */
  longDescription: string;
  /** category label, e.g. "Synthesizer" */
  category: string;
  /** display price, e.g. "$39". Keep in sync with your Stripe price. */
  price: string;
  /** Stripe Price ID — fill in later (price_...). Empty = "coming soon". */
  priceId: string;
  /** R2 object key for the installer delivered after purchase */
  downloadKey: string;
  /** OKLCH accent that themes the product page + card */
  accent: string;
  accentForeground: string;
  formats: PluginFormat[];
  platform: string;
  version: string;
  /** GitHub repo (for the "version source of truth" / changelog link) */
  repo: string;
  /** headline feature bullets — PLACEHOLDER wording, real structure */
  features: { title: string; body: string }[];
  /** quick technical spec chips */
  specs: PluginSpec[];
  /** screenshot filenames in /public/plugins/<slug>/ (add images later) */
  gallery: string[];
};

export const PLUGINS: Plugin[] = [
  {
    slug: "bleep",
    name: "akaBleep",
    fullName: "akaBleep",
    category: "Acid synth + sequencer",
    tagline: "A hypnotic-techno acid voice and step sequencer in one plugin.",
    description:
      "Squelchy two-oscillator synth, an Elektron-style 64-step sequencer with per-step parameter locks, a drag-to-wire modulation patch bay, and a master FX chain — built to be performed live in Ableton.",
    longDescription:
      "akaBleep folds an entire acid loop into one window: a voice that squelches, a sequencer that locks a different sound to every step, a patch bay to set it breathing, and an FX chain to smear it into the room. One plugin, on one MIDI track, that you can perform.",
    price: "$39",
    priceId: "",
    downloadKey: "releases/bleep/akaBleep-latest.zip",
    accent: "oklch(0.65 0.21 350)",
    accentForeground: "oklch(0.16 0.004 285)",
    formats: ["VST3", "AU", "Standalone"],
    platform: "macOS 11+ · Apple Silicon + Intel",
    version: "v0.4.0",
    repo: "akaieuan/akaBleep-VST",
    features: [
      {
        title: "Acid voice",
        body: "Two multi-mode oscillators with FM, sub + ring mod, tanh drive into a ladder filter, and the exponential pitch-decay envelope that makes the bloop.",
      },
      {
        title: "64-step P-lock sequencer",
        body: "Lock ~40 parameters per step — live in REC or by hand in EDIT. Chords, velocity, gate, probability, and pattern generators including Euclidean.",
      },
      {
        title: "Modulation patch bay",
        body: "Drag cables from LFO, filter envelope, noise, or velocity into pitch, cutoff, resonance, and amplitude. Drag to set depth, right-click to pull.",
      },
      {
        title: "Master FX chain",
        body: "Chorus → phaser → bitcrush → ping-pong delay → reverb. Every stage auto-bypasses at zero mix and every parameter is P-lockable per step.",
      },
    ],
    specs: [
      { label: "Voice", value: "Monophonic acid" },
      { label: "Sequencer", value: "64 steps / 4 pages" },
      { label: "Presets", value: "39 factory" },
      { label: "Engine", value: "JUCE 8 · C++17" },
    ],
    gallery: ["akableep-ui.png", "sequencer.png", "patchbay.png", "fx-chain.png"],
  },
  {
    slug: "enzyme",
    name: "Enzyme",
    fullName: "akaEnzyme",
    category: "Lo-fi multi-timbral synth",
    tagline: "A 4-layer lo-fi multi-timbral synth inspired by the Waldorf Protein.",
    description:
      "Four independent layers sharing an 8-voice pool, routed by a hardware-style Multi engine, then smeared through a switchable FX rack and a dedicated lo-fi mangle section. Signed, universal, DAW-ready.",
    longDescription:
      "akaEnzyme reimagines the Protein's 8-bit tabletop character as a modern plugin: four layers (A/B/C/D) sharing one voice pool, five Multi modes from layered to MIDI-split, two series FX slots, and a sample-breaking mangle section built from bitcrush, sample-rate reduction, and drive. Designed to be stacked, split, and mangled fast.",
    price: "$49",
    priceId: "",
    downloadKey: "releases/enzyme/Enzyme-latest.zip",
    accent: "oklch(0.62 0.17 255)",
    accentForeground: "oklch(0.97 0 0)",
    formats: ["VST3", "AU", "Standalone"],
    platform: "macOS 11+ · Apple Silicon + Intel",
    version: "v1.0.0",
    repo: "akaieuan/akaEnzyme-VST",
    features: [
      {
        title: "Four-layer voice engine",
        body: "Per layer: two multi-mode oscillators with FM, sub + ring, ladder filter, three envelopes, drive, glide, and per-layer Dirt grit.",
      },
      {
        title: "Hardware-style Multi engine",
        body: "One shared 8-voice pool with global voice-stealing across five modes — Single, Layered, Round-Robin, Random-Robin, and MIDI-Split.",
      },
      {
        title: "Switchable FX rack",
        body: "Two series slots, each 1-of-9: chorus, flanger, phaser, tremolo, drive, compressor, EQ, delay, reverb — auto-bypassed at zero mix.",
      },
      {
        title: "Lo-fi mangle",
        body: "Drive waveshapers, 1–16 bit bitcrush, sample-rate reduction up to 64×, and a free-running stutter for breaking the signal apart.",
      },
    ],
    specs: [
      { label: "Layers", value: "4 (A/B/C/D)" },
      { label: "Voices", value: "8 shared" },
      { label: "Arp", value: "Host-synced" },
      { label: "Validation", value: "Passes auval" },
    ],
    gallery: [],
  },
  {
    slug: "i4",
    name: "i4",
    fullName: "akaI4",
    category: "Sculpting sampler",
    tagline: "A sculpting sampler inspired by the Torso S-4.",
    description:
      "Take one sample (or sixteen) and run it through granular, resonant, destruction, and space engines, modulate any of it under a 4-slot matrix, then resample the result straight back into the instrument.",
    longDescription:
      "i4 takes a sample and runs it through a series of sound-sculpting engines — Mosaic granular, a 48-band Ring resonator, Deform destruction, and Vast time-and-space — all under a 4-slot modulation matrix reaching nearly 50 targets. Beat Repeat and a Loop Recorder let you resample your own mangled output back onto a pad. Built for performance.",
    price: "$59",
    priceId: "",
    downloadKey: "releases/i4/i4-latest.zip",
    accent: "oklch(0.72 0.16 60)",
    accentForeground: "oklch(0.16 0.004 285)",
    formats: ["VST3", "AU", "Standalone"],
    platform: "macOS 11+ · Apple Silicon + Intel",
    version: "v0.1.0",
    repo: "akaieuan/akaI4-VST",
    features: [
      {
        title: "Tape + 16 pads",
        body: "A varispeed tape-style source with scrub, rotate, glide, reverse, freeze, and keylock — plus sixteen sample pads feeding the same chain.",
      },
      {
        title: "Sculpting engines",
        body: "Mosaic granular cloud, a 48-band Ring resonator, Deform destruction and dynamics, and Vast — a synced delay and reverb in one.",
      },
      {
        title: "Resample anything",
        body: "Beat Repeat replaces the output with a synced slice, and the Loop Recorder captures 30s of post-FX audio onto a new pad.",
      },
      {
        title: "Deep modulation",
        body: "Four mod slots — Wave LFO, Random, or ADSR — routing to nearly 50 destinations across every engine, all tempo-syncable.",
      },
    ],
    specs: [
      { label: "Source", value: "Tape + 16 pads" },
      { label: "Resonator", value: "48 bands" },
      { label: "Mod targets", value: "~50" },
      { label: "Engine", value: "JUCE 8 · C++17" },
    ],
    gallery: [],
  },
];

export function getPlugin(slug: string): Plugin | undefined {
  return PLUGINS.find((p) => p.slug === slug);
}

export function pluginSlugs(): string[] {
  return PLUGINS.map((p) => p.slug);
}
