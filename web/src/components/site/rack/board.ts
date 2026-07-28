import { blockAt, blockRun, hash, screen } from "./field";
import { NO_MOVE, type AccentCell, type Cell, type DeviceFactory } from "./types";

/**
 * akaBleep: a control board.
 *
 * Laid out the way the plugin is, top to bottom: a display bar, the sequencer
 * row, then rows of knobs. A playhead runs the sequence, the knobs are turned,
 * and a fixed sparse set of steps carries a parameter lock, which is exactly
 * what the red dots above the knobs do in the plugin's own UI.
 *
 * Knob rows drop out when the screen is too short for them, so the same device
 * degrades to a display bar and a step row at chrome sizes rather than
 * aliasing into mush.
 */

/** Cells across and down for one knob. It gets a one-cell gutter. */
const KNOB = 5;
const KNOB_R = 2;

/** How far an indicator sweeps either side of vertical, in radians. */
const SWEEP = 2.35;

export const board: DeviceFactory = (cols, rows) => {
  const s = screen(cols, rows);
  const run = blockRun(s);

  const displayY = s.y0;
  const stepY0 = s.y0 + 2;
  const stepY1 = stepY0 + 1;

  // Whatever is left under the step row becomes knob rows.
  const spare = s.y1 - stepY1 - 1;
  const knobRows = Math.max(0, Math.floor(spare / (KNOB + 1)));
  const perRow = Math.max(0, Math.floor(s.w / (KNOB + 1)));

  type Knob = { cx: number; cy: number; rate: number; phase: number };
  const knobs: Knob[] = [];
  if (knobRows > 0 && perRow > 0) {
    const usedW = perRow * (KNOB + 1) - 1;
    const startX = s.x0 + Math.floor((s.w - usedW) / 2);
    for (let r = 0; r < knobRows; r++) {
      for (let k = 0; k < perRow; k++) {
        const id = r * perRow + k;
        knobs.push({
          cx: startX + k * (KNOB + 1) + KNOB_R,
          cy: stepY1 + 2 + r * (KNOB + 1) + KNOB_R,
          // Every knob turns at its own rate, so the board reads as a row of
          // controls being worked rather than one thing moving.
          rate: 0.22 + hash(id * 5.3) * 0.5,
          phase: hash(id * 9.1) * Math.PI * 2,
        });
      }
    }
  }

  /** Locks are a fixed set, so they do not flicker between frames. */
  const locked = (step: number) => hash(step * 17.3) > 0.62;

  const headAt = (t: number) => Math.floor(t * 3.2) % run.count;

  /** Where a knob's indicator sits on its rim, as cell offsets from centre. */
  const pointer = (knob: Knob, t: number) => {
    const angle = Math.sin(t * knob.rate + knob.phase) * SWEEP;
    return {
      dx: Math.round(KNOB_R * Math.sin(angle)),
      dy: Math.round(-KNOB_R * Math.cos(angle)),
    };
  };

  return {
    carve(i, j) {
      if (j === displayY && i > s.x0 && i < s.x1) return true;
      if (j >= stepY0 && j <= stepY1) return blockAt(i, run) >= 0;
      for (const knob of knobs) {
        if (Math.hypot(i - knob.cx, j - knob.cy) <= KNOB_R + 0.35) return true;
      }
      return false;
    },

    idle(c: Cell, t) {
      if (!c.interior) return NO_MOVE;
      // The material around the step under the playhead drops a cell, so the
      // monochrome layer moves too rather than leaving every bit of motion to
      // the accent (akaSTYLE 04: motion moves space).
      if (c.j >= stepY0 - 1 && c.j <= stepY1 + 1 && blockAt(c.i, run) === headAt(t)) {
        return [0, 1];
      }
      return NO_MOVE;
    },

    overlay(t) {
      const out: AccentCell[] = [];
      const head = headAt(t);

      // The playhead, filling the step it is currently on.
      const headX = run.x0 + head * 3;
      out.push({ i: headX, j: stepY0 }, { i: headX, j: stepY1 });

      // Locks, one row above the step they hold.
      for (let step = 0; step < run.count; step++) {
        if (!locked(step)) continue;
        out.push({
          i: run.x0 + step * 3,
          j: stepY0 - 1,
          alpha: step === head ? 1 : 0.5,
        });
      }

      // Knob indicators.
      for (const knob of knobs) {
        const { dx, dy } = pointer(knob, t);
        out.push({ i: knob.cx + dx, j: knob.cy + dy });
      }

      return out;
    },

    signature(t) {
      const turns = knobs
        .map((knob) => {
          const { dx, dy } = pointer(knob, t);
          return `${dx}${dy}`;
        })
        .join("");
      return `b${headAt(t)}:${turns}`;
    },
  };
};
