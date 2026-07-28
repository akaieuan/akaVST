# akaVST

**A living collection of three JUCE audio instruments for macOS, and the site that documents them.**

Not a storefront. Each instrument gets a page that says what it is, what it does, where it came
from, and honestly where it currently stands. Versions and formats are read out of the plugins
themselves rather than retyped, so the site cannot quietly drift from the code.

This is the parent repository. Each instrument lives in its own repository and is tracked here as a
submodule, so they can be worked on side by side and still ship independently.

---

## The instruments

### akaBleep · v0.4.0 · acid synth and sequencer

A monophonic instrument for the bleep-bloop lineage of hypnotic techno, the school where one acid
line mutating slowly over sixteen bars *is* the track. Two multi-mode oscillators with two-operator
FM, a sub, a ring modulator and noise through a `tanh` drive into a ladder filter, with an
exponential pitch decay for the blip that makes it an acid line rather than a bass note.

Wrapped around that voice: a 64-step sequencer across four pages, with roughly forty parameters
lockable per step, per-step chords, velocity, gate and probability, and Euclidean and random pattern
generators. A drag-to-wire patch bay routes the LFO, filter envelope, noise and velocity into pitch,
width, cutoff, resonance and amplitude. A master chain runs chorus into phaser into bitcrush into
ping-pong delay into reverb, all P-lockable per step.

39 factory presets, 8 UI themes, 81 automatable parameters. Universal binary.

[`bleep/`](bleep) · [akaBleep-VST](https://github.com/akaieuan/akaBleep-VST)

### Enzyme · v1.0.0 · lo-fi multi-timbral synth

Four layers, A through D, drawing on a single eight-voice pool with global voice stealing, exactly
like the Waldorf Protein it descends from. It is one instrument with four timbres rather than four
synths in a rack, and it runs out of polyphony the way the hardware does.

Five multi modes: Single, Layered, Round-Robin, Random-Robin and MIDI-Split, with three key split
points. Each layer is a full voice with PolyBLEP band-limited oscillators, a four-mode ladder filter,
three envelopes and glide, plus **Dirt**, a per-layer noise character mixed in ahead of the filter in
five flavours. The grit comes from bitcrush, sample-rate reduction to 64x and five drive waveshapers,
so it evokes the hardware's 8-bit bite rather than emulating a wavetable engine.

Passes `auval` on both architectures, guards its output with a DC blocker and soft clipper, and
freezes its parameter IDs so presets survive future versions. 18 presets across eight categories.

[`enzyme/`](enzyme) · [akaEnzyme-VST](https://github.com/akaieuan/akaEnzyme-VST)

### i4 · v0.1.0 · sculpting sampler

Takes one sample, or sixteen, runs them through a chain of sculpting engines, lets you modulate any
of it, and resamples the result straight back into the instrument.

Tape is the varispeed master clip: scrub, rotate, glide, reverse, freeze, keylock, sound-on-sound.
Sixteen pads sum in immediately after it, so nothing bypasses what follows. Then Mosaic (a granular
cloud with grain pitch quantized to a scale), Ring (a 48-band resonator bank), Deform (drive,
compression, bit crush, spectral tilt, gate) and Vast (a synced delay and reverb sharing one control
set, with infinite freeze).

Over the top, a four-slot modulation matrix into roughly fifty destinations; right-click any knob to
assign it. Beat Repeat replaces the output rather than mixing into it, which is what lets a stutter
resample exactly as heard, and the Loop Recorder drops thirty seconds of post-effect stereo onto a
pad, closing the circle.

The largest of the three codebases and the youngest. Currently builds for the host architecture only.

[`i4/`](i4) · [akaI4-VST](https://github.com/akaieuan/akaI4-VST)

---

## Layout

```
akaVST/
├── web/          the site: Next.js App Router, Tailwind v4, akaSTYLE
├── bleep/        submodule → akaBleep-VST
├── enzyme/       submodule → akaEnzyme-VST
├── i4/           submodule → akaI4-VST
└── scripts/      cross-repo helpers
```

| | akaBleep | Enzyme | i4 |
|---|---|---|---|
| Version | 0.4.0 | 1.0.0 | 0.1.0 |
| Formats | VST3 · AU · Standalone | VST3 · AU · Standalone | VST3 · AU · Standalone |
| Category | Instrument · Synth | Instrument · Synth | Instrument · Sampler |
| Platform | macOS 11+ universal | macOS 11+ universal | macOS 11+ Apple Silicon |
| Presets | 39 | 18 | 5 |
| Framework | JUCE 8 · C++17 | JUCE 8 · C++17 | JUCE 8 · C++17 |

None of the three are code-signed or notarised yet, which is why the site offers no downloads.

---

## Getting set up

```bash
git clone --recurse-submodules https://github.com/akaieuan/akaVST.git
```

Already cloned without them:

```bash
git submodule update --init --recursive
```

## Working across the repositories

Each plugin directory is a full checkout of its own repository, so the normal workflow is unchanged.
`cd bleep`, commit, `git push`, and it lands in akaBleep-VST. What the parent adds is a record of
*which commit* of each plugin the site currently describes.

`scripts/vst.sh` covers the spans:

```bash
./scripts/vst.sh status                  # working tree + ahead/behind for all three
./scripts/vst.sh pull                    # fast-forward every plugin
./scripts/vst.sh push                    # push every plugin that is ahead
./scripts/vst.sh sync                    # restage parent pointers after a plugin moves
./scripts/vst.sh foreach git log --oneline -3
```

**Push the plugin first, then `sync` and commit the parent.** A parent commit pointing at an unpushed
plugin commit is the one submodule failure mode worth remembering.

---

## The site

```bash
cd web
pnpm install
pnpm dev          # http://localhost:3000
pnpm verify       # typecheck + lint + build
```

Runs with no environment variables and calls no APIs. Every route is statically prerendered.

Server-first: every page and section is a Server Component, and the only client code is the theme
provider, the theme toggle and the canvas mark. The design language is akaSTYLE, shared with
[akaOSS](https://www.akaoss.dev): mono for structure and sans for prose, depth from a hairline border
rather than a shadow, greyscale on a warm near-black ground with one accent per instrument. Light and
dark are both real themes; press <kbd>D</kbd> to flip.

Full detail in [`web/README.md`](web/README.md).

### Facts come from the plugins

Versions, product names, formats, plugin codes, categories and platform support are not written by
hand. They are read out of each submodule's `CMakeLists.txt`:

```bash
cd web && pnpm sync:facts
```

That writes `web/src/content/plugins/<slug>.generated.json`, stamped with the plugin commit it came
from, and copies any screenshots the plugin repository ships into `web/public/`. The output is
committed, so the production build never reads the submodules and a deploy does not depend on them
being checked out.

Where a README and a build disagree, the build wins. i4's README claims a universal binary; its
`CMakeLists.txt` does not set `CMAKE_OSX_ARCHITECTURES`, so the site says Apple Silicon.

### The mark

Every mark on the site is one canvas component, `PixelRack`, in the same grammar as akaOSS's
PixelHead: a deterministic hash PRNG, one sampled cell set, an assemble-and-hold timeline, colour
resolved from the theme and repainted when the theme flips, the loop gated on an IntersectionObserver
plus `visibilitychange`, and a single still frame under `prefers-reduced-motion`.

What differs is that each instrument gets a device whose idle motion is what that instrument actually
does: a control board with a running sequencer and knobs reading out their values, a keyboard split
four ways, a window travelling along a waveform. All geometry is laid out in whole cells, so the same
component reads correctly at 26px in the nav and 360px in a hero.

---

## Deploying

Vercel, from this repository, with two settings that matter:

- **Root Directory** must be `web`. Without it the build fails at framework detection, since the
  repository root has no `package.json`.
- The Vercel GitHub App needs read access to the three plugin repositories, or the submodule fetch
  warns. It is not fatal: nothing is read from the submodules at build time.

---

## Licence

Each plugin repository carries its own licence; the compiled plugins are covered separately by their
own EULAs. The site is not licensed for reuse.

© 2026 akaieuan.
