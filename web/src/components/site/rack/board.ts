import { blockAt, blockRun, hash, screen } from "./field";
import { NO_MOVE, type AccentCell, type Cell, type DeviceFactory } from "./types";

/**
 * akaBleep: a control board.
 *
 * Three bands filling the panel, the way the plugin stacks them: the step
 * sequencer, a row of knobs, and the FX fader bank underneath.
 *
 * The accent is structural rather than decorative. It is the step the playhead
 * is on, filled solid; the value arc around each knob, which is what the
 * plugin's own magenta-arc knobs draw; and the cap on each fader. Three uses,
 * each one a real control reading out its value, so the colour is telling you
 * something instead of speckling the panel.
 *
 * Bands drop from the bottom up as the screen shrinks, so the same device
 * degrades to a bare step row at chrome sizes.
 */

const KNOB_R = 3;
/** Sweep either side of vertical, in radians. About 270 degrees of travel. */
const SWEEP = 2.35;

/**
 * Ring offsets for a knob's value arc, with the angle each one sits at.
 *
 * The ring sits just *inside* the knob's carved face, so the arc reads as
 * painted on a dark control rather than floating in the panel beside it. A
 * spindle with the arc outside it does not survive this few cells: the solid
 * material between the two separates them and the knob stops being one object.
 */
const RING = (() => {
  const out: { dx: number; dy: number; angle: number }[] = [];
  for (let dy = -KNOB_R; dy <= KNOB_R; dy++) {
    for (let dx = -KNOB_R; dx <= KNOB_R; dx++) {
      const d = Math.hypot(dx, dy);
      if (d < KNOB_R - 0.9 || d > KNOB_R + 0.1) continue;
      // 0 at twelve o'clock, positive clockwise, matching a real knob.
      out.push({ dx, dy, angle: Math.atan2(dx, -dy) });
    }
  }
  return out;
})();

export const board: DeviceFactory = (cols, rows) => {
  const s = screen(cols, rows);
  const run = blockRun(s);

  // Bands, top down, each claiming space only if what is left can hold it.
  const stepH = Math.min(3, Math.max(2, Math.floor(s.h * 0.2)));
  const stepY0 = s.y0;
  const stepY1 = stepY0 + stepH - 1;

  let next = stepY1 + 2;

  const knobSpan = KNOB_R * 2 + 1;
  const hasKnobs = s.y1 - next + 1 >= knobSpan && s.w >= (KNOB_R * 2 + 2) * 2;
  const knobCY = hasKnobs ? next + KNOB_R : -1;
  if (hasKnobs) next = knobCY + KNOB_R + 2;

  const knobPitch = KNOB_R * 2 + 2;
  const knobCount = hasKnobs ? Math.floor(s.w / knobPitch) : 0;
  const knobX0 = s.x0 + Math.floor((s.w - (knobCount * knobPitch - 1)) / 2) + KNOB_R;

  const faderH = 3;
  const hasFaders = s.y1 - next + 1 >= faderH;
  const faderY0 = hasFaders ? next : -1;
  const faderY1 = hasFaders ? faderY0 + faderH - 1 : -1;
  const faderPitch = 3;
  const faderCount = hasFaders ? Math.floor(s.w / faderPitch) : 0;
  const faderX0 = s.x0 + Math.floor((s.w - (faderCount * faderPitch - 1)) / 2);

  const headAt = (t: number) => Math.floor(t * 3.2) % run.count;

  /** Knob value in -1..1, each turning at its own unhurried rate. */
  const knobValue = (k: number, t: number) =>
    Math.sin(t * (0.2 + hash(k * 5.3) * 0.42) + hash(k * 9.1) * Math.PI * 2);

  /** Fader level in 0..1. */
  const faderLevel = (f: number, t: number) =>
    0.5 + 0.5 * Math.sin(t * (0.3 + hash(f * 3.7) * 0.5) + hash(f * 11.9) * Math.PI * 2);

  const faderCapRow = (f: number, t: number) =>
    faderY0 + Math.round((1 - faderLevel(f, t)) * (faderH - 1));

  return {
    carve(i, j) {
      if (j >= stepY0 && j <= stepY1) return blockAt(i, run) >= 0;

      if (hasKnobs && Math.abs(j - knobCY) <= KNOB_R) {
        for (let k = 0; k < knobCount; k++) {
          // The whole face is cut away, so each knob is a dark disc. The value
          // arc is then painted inside its rim.
          if (Math.hypot(i - (knobX0 + k * knobPitch), j - knobCY) <= KNOB_R + 0.4) {
            return true;
          }
        }
      }

      if (hasFaders && j >= faderY0 && j <= faderY1) {
        const d = i - faderX0;
        if (d >= 0 && d < faderCount * faderPitch && d % faderPitch < faderPitch - 1) {
          return true;
        }
      }

      return false;
    },

    idle(c: Cell, t) {
      if (!c.interior) return NO_MOVE;
      // The material bracketing the active step drops a cell, so the
      // monochrome layer moves too rather than leaving all the motion to the
      // accent (akaSTYLE 04: motion moves space).
      if (
        (c.j === stepY0 - 1 || c.j === stepY1 + 1) &&
        blockAt(c.i, run) === headAt(t)
      ) {
        return [0, c.j === stepY0 - 1 ? 1 : -1];
      }
      return NO_MOVE;
    },

    overlay(t) {
      const out: AccentCell[] = [];

      // The playhead fills its whole step, so it reads as a lit block moving
      // along the row rather than a dot travelling past it.
      const headX = run.x0 + headAt(t) * 3;
      for (let j = stepY0; j <= stepY1; j++) {
        out.push({ i: headX, j }, { i: headX + 1, j });
      }

      // Value arcs: the plugin draws these in magenta around every knob.
      for (let k = 0; k < knobCount; k++) {
        const cx = knobX0 + k * knobPitch;
        const value = knobValue(k, t) * SWEEP;
        for (const r of RING) {
          if (r.angle < -SWEEP || r.angle > value) continue;
          out.push({ i: cx + r.dx, j: knobCY + r.dy });
        }
      }

      // Fader caps.
      for (let f = 0; f < faderCount; f++) {
        const x = faderX0 + f * faderPitch;
        const j = faderCapRow(f, t);
        out.push({ i: x, j }, { i: x + 1, j });
      }

      return out;
    },

    signature(t) {
      const arcs = Array.from({ length: knobCount }, (_, k) =>
        // Quantised the same way the arc is: one step per ring cell.
        Math.round(knobValue(k, t) * RING.length * 0.5),
      ).join(",");
      const caps = Array.from({ length: faderCount }, (_, f) =>
        faderCapRow(f, t),
      ).join("");
      return `b${headAt(t)}:${arcs}:${caps}`;
    },
  };
};
