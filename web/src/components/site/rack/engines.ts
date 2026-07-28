import { blockAt, blockRun, screen } from "./field";
import { NO_MOVE, type Cell, type DeviceFactory } from "./types";

/**
 * The waveform envelope at a point in the sample, 0..1.
 *
 * Four partials at unrelated frequencies, drifting against each other, so the
 * window both travels along the sample and changes shape while it travels. A
 * fixed hash walk would scroll rigidly, like a texture on a belt; detuned
 * partials read as an actual signal, which is the point of the mark.
 */
export function envelope(pos: number, t: number) {
  const v =
    0.5 * Math.sin(pos * 0.62 + t * 0.85) +
    0.28 * Math.sin(pos * 1.37 - t * 0.53) +
    0.22 * Math.sin(pos * 2.53 + t * 1.31) +
    0.12 * Math.sin(pos * 4.11 - t * 0.9);
  const n = 0.5 + 0.5 * (v / 1.12);
  // Smoothstep for contrast: without it the partials average out around the
  // middle and the wave reads as a slab with a wobbly edge rather than
  // something with quiet passages and peaks.
  return n * n * (3 - 2 * n);
}

/**
 * i4: a travelling waveform, carved every frame rather than sampled out once,
 * with a read head crossing it and plucking grains loose from its edge.
 */
export const engines: DeviceFactory = (cols, rows) => {
  const s = screen(cols, rows);
  const run = blockRun(s);
  const mid = (s.y0 + s.y1) / 2;
  const maxAmp = Math.max(1, Math.floor((s.h / 2) * 0.88));

  /** Wave amplitude in cells at a column, or -1 between bars. */
  const ampAt = (i: number, t: number) => {
    const bar = blockAt(i, run);
    if (bar < 0) return -1;
    // `t * 2.1` is the read position travelling along the sample; the partials
    // drift on t as well, so the shape changes as the window moves through it.
    return Math.max(1, Math.round(maxAmp * (0.1 + 0.9 * envelope(bar + t * 2.1, t))));
  };

  return {
    carve(i, j, t) {
      const amp = ampAt(i, t);
      if (amp < 0) return false;
      return Math.abs(j - mid) <= amp;
    },

    idle(c: Cell, t) {
      if (!c.interior) return NO_MOVE;
      // Interpolate between the first and last column centres, so f=0 lands on
      // x0 and f=1 lands on x1. Using the column *count* here would overshoot
      // the screen by one cell at each end.
      const span = s.x1 - s.x0;
      const scrub = s.x0 + (0.5 + 0.5 * Math.sin(t * 0.29)) * span;
      const reach = Math.max(1.5, span * 0.1);
      const d = Math.abs(c.i - scrub);
      if (d > reach) return NO_MOVE;
      // Only cells sitting on the wave's edge move; the field stays put.
      const edge = Math.abs(Math.abs(c.j - mid) - ampAt(c.i, t));
      if (edge > 2.5) return NO_MOVE;
      return [0, Math.round((c.r3 - 0.5) * 5 * (1 - d / reach))];
    },

    overlay() {
      return [];
    },

    // The wave travels continuously, so its signature is just a clock. 18Hz is
    // past the point where whole-cell amplitude steps read as smooth.
    signature(t) {
      return `e${Math.floor(t * 18)}`;
    },
  };
};
