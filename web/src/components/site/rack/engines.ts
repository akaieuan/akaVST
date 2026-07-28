import { blockAt, blockRun, hash, screen } from "./field";
import { NO_MOVE, type AccentCell, type Cell, type DeviceFactory } from "./types";

/**
 * i4: five engines, five waveforms.
 *
 * A strip of five engine blocks over a waveform display. The engine changes
 * every few seconds with a fast glitch cut, and each one draws a shape that
 * could not be mistaken for the others, because the point of the mark is that
 * this is a chain of genuinely different processes rather than one effect with
 * its knobs moved:
 *
 *   tape    a smooth continuous wave, travelling
 *   mosaic  granular, mostly dust with a few tall grains
 *   ring    evenly spaced resonant spikes decaying between strikes
 *   deform  clipped flat-topped plateaus at a few discrete levels
 *   vast    one transient into a long decay with echo bumps
 *
 * The accent lights the engine currently running, so the label and the shape
 * change together.
 */

export const ENGINE_NAMES = ["tape", "mosaic", "ring", "deform", "vast"] as const;
export type EngineName = (typeof ENGINE_NAMES)[number];

/** Seconds each engine holds, and how long the cut between them lasts. */
const DWELL = 2.9;
const CUT = 0.26;

/**
 * Tape's envelope: four partials at unrelated frequencies drifting against each
 * other, so the window both travels along the sample and changes shape while it
 * travels. A fixed hash walk would scroll rigidly, like a texture on a belt.
 */
function tapeEnvelope(pos: number, t: number) {
  const v =
    0.5 * Math.sin(pos * 0.62 + t * 0.85) +
    0.28 * Math.sin(pos * 1.37 - t * 0.53) +
    0.22 * Math.sin(pos * 2.53 + t * 1.31) +
    0.12 * Math.sin(pos * 4.11 - t * 0.9);
  const n = 0.5 + 0.5 * (v / 1.12);
  // Smoothstep for contrast: without it the partials average out around the
  // middle and the wave reads as a slab with a wobbly edge.
  return n * n * (3 - 2 * n);
}

/** Each engine's amplitude at bar `b` of `count`, normalised 0..1. */
function shapeOf(engine: EngineName, b: number, count: number, t: number): number {
  switch (engine) {
    case "tape":
      return tapeEnvelope(b + t * 2.1, t);

    case "mosaic": {
      // Grains: mostly dust, with a sparse few that spike. The seed walks with
      // time so the cloud keeps reforming rather than sitting still.
      const g = hash(b * 3.7 + Math.floor(t * 6) * 13.1);
      return g > 0.7 ? 0.5 + g * 0.5 : g * 0.16;
    }

    case "ring": {
      // Resonant strikes at a fixed spacing, decaying between them.
      const period = Math.max(3, Math.round(count / 4));
      const since = (b + Math.floor(t * 3)) % period;
      return Math.exp(-since * 0.85) * (0.55 + 0.45 * hash(Math.floor((b + t) / period)));
    }

    case "deform": {
      // Bitcrushed: a smooth curve quantised hard to a few levels, so it reads
      // as flat-topped plateaus rather than a curve.
      const raw = 0.5 + 0.5 * Math.sin(b * 0.55 + t * 1.1);
      return Math.round(raw * 3) / 3;
    }

    case "vast": {
      // A transient, then a long decay carrying echo bumps.
      const head = (b + t * 3.4) % count;
      const decay = Math.exp(-head * (2.4 / count));
      const echo = 0.35 * Math.exp(-((head % (count / 3)) * (6 / count)));
      return Math.min(1, decay + echo);
    }
  }
}

export const engines: DeviceFactory = (cols, rows) => {
  const s = screen(cols, rows);

  // The engine strip only earns its space if the wave still has room.
  const stripH = s.h >= 9 ? 2 : 0;
  const stripY0 = s.y0;
  const stripY1 = stripY0 + stripH - 1;

  const waveY0 = stripH > 0 ? stripY1 + 2 : s.y0;
  const waveY1 = s.y1;
  const mid = (waveY0 + waveY1) / 2;
  const maxAmp = Math.max(1, Math.floor(((waveY1 - waveY0 + 1) / 2) * 0.92));

  const run = blockRun(s);

  const stripPitch = Math.floor(s.w / 5);
  const stripW = Math.max(1, stripPitch - 1);
  const stripX0 = s.x0 + Math.floor((s.w - (stripPitch * 5 - 1)) / 2);

  /** Which engine is running, and how far into the cut out of it we are. */
  const engineAt = (t: number) => {
    const slot = Math.floor(t / DWELL);
    const phase = t - slot * DWELL;
    return {
      index: ((slot % 5) + 5) % 5,
      name: ENGINE_NAMES[((slot % 5) + 5) % 5],
      /** 0 while settled, ramping to 1 across the cut at the end of the slot. */
      cut: phase > DWELL - CUT ? (phase - (DWELL - CUT)) / CUT : 0,
    };
  };

  /** Wave amplitude in cells at a column, or -1 between bars. */
  const ampAt = (i: number, t: number) => {
    const bar = blockAt(i, run);
    if (bar < 0) return -1;
    const { name, cut } = engineAt(t);
    let v = shapeOf(name, bar, run.count, t);
    if (cut > 0) {
      // Tear the shape apart on the way out rather than crossfading it: a hard
      // cut suits a pixel medium better than a dissolve.
      v = v * (1 - cut) + hash(bar * 7.1 + Math.floor(t * 40)) * cut;
    }
    return Math.max(1, Math.round(maxAmp * (0.08 + 0.92 * v)));
  };

  return {
    carve(i, j, t) {
      if (stripH > 0 && j >= stripY0 && j <= stripY1) {
        const d = i - stripX0;
        if (d < 0 || d >= stripPitch * 5) return false;
        return d % stripPitch < stripW;
      }
      if (j < waveY0 || j > waveY1) return false;
      const amp = ampAt(i, t);
      if (amp < 0) return false;
      return Math.abs(j - mid) <= amp;
    },

    idle(c: Cell, t) {
      if (!c.interior || c.j < waveY0) return NO_MOVE;
      // A read head crosses the wave, plucking grains loose from its edge.
      // Narrow and shallow on purpose: the wave is the subject.
      const span = s.x1 - s.x0;
      const scrub = s.x0 + (0.5 + 0.5 * Math.sin(t * 0.29)) * span;
      const reach = Math.max(1.5, span * 0.1);
      const d = Math.abs(c.i - scrub);
      if (d > reach) return NO_MOVE;
      const edge = Math.abs(Math.abs(c.j - mid) - ampAt(c.i, t));
      if (edge > 2.5) return NO_MOVE;
      return [0, Math.round((c.r3 - 0.5) * 5 * (1 - d / reach))];
    },

    overlay(t) {
      if (stripH === 0) return [];
      const { index } = engineAt(t);
      const out: AccentCell[] = [];
      const x = stripX0 + index * stripPitch;
      for (let dx = 0; dx < stripW; dx++) {
        for (let j = stripY0; j <= stripY1; j++) out.push({ i: x + dx, j });
      }
      return out;
    },

    // The wave moves continuously, so its signature is a clock. 18Hz is past
    // the point where whole-cell amplitude steps read as smooth.
    signature(t) {
      return `e${engineAt(t).index}.${Math.floor(t * 18)}`;
    },
  };
};
