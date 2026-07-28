import { hash, screen } from "./field";
import { NO_MOVE, type AccentCell, type Cell, type DeviceFactory } from "./types";

/**
 * Enzyme: a keyboard, split four ways.
 *
 * A layer strip across the top, A through D, over a piano keyboard. Notes
 * arrive in round-robin, which is one of the plugin's actual multi modes: each
 * lands on the next layer in turn, and because notes overlap you see more than
 * one layer lit at once, which is the four-layers-one-voice-pool idea.
 *
 * The keyboard is drawn the way a keyboard looks rather than as abstract bars.
 * White keys are the panel material itself, separated by carved lines; black
 * keys are shorter, narrower carved blocks sitting over those lines in the real
 * C-D-E-F-G-A-B pattern, so the two gaps per octave are there. A struck key
 * depresses.
 */

/** Which key boundaries carry a black key, as white-key index within an octave. */
const BLACK_AFTER = new Set([0, 1, 3, 4, 5]);

/** A white key is 3 cells of body plus a 1 cell separator. */
const WHITE_BODY = 3;
const WHITE_PITCH = WHITE_BODY + 1;
/** Narrower than a white key, as on the real thing. */
const BLACK_W = 2;

/** Seconds between note onsets, and how long each is held. Overlap is the point. */
const STEP = 0.5;
const HOLD = 0.85;

export const keys: DeviceFactory = (cols, rows) => {
  const s = screen(cols, rows);

  // The layer strip only earns its space if the keyboard still has room.
  const layerH = s.h >= 9 ? 2 : 0;
  const layerY0 = s.y0;
  const layerY1 = layerY0 + layerH - 1;

  const keyY0 = layerH > 0 ? layerY1 + 2 : s.y0;
  const keyY1 = s.y1;
  const keyH = keyY1 - keyY0 + 1;
  const blackY1 = keyY0 + Math.max(1, Math.round(keyH * 0.55)) - 1;

  // +1 because the last key needs no trailing separator.
  const whiteCount = Math.max(2, Math.floor((s.w + 1) / WHITE_PITCH));
  const keySpan = whiteCount * WHITE_PITCH - 1;
  const keyX0 = s.x0 + Math.floor((s.w - keySpan) / 2);

  /** Column of the separator to the right of white key k. */
  const sepCol = (k: number) => keyX0 + k * WHITE_PITCH + WHITE_BODY;

  const layerPitch = Math.floor(s.w / 4);
  // Two cells of gutter, not one: at a single cell the four blocks merge into
  // one bar at card size and stop reading as four separate layers.
  const layerW = Math.max(1, layerPitch - 2);
  const layerX0 = s.x0 + Math.floor((s.w - (layerPitch * 4 - 1)) / 2);

  /** Notes sounding at t. Onsets are fixed, so playback is deterministic. */
  const sounding = (t: number) => {
    const out: { key: number; layer: number }[] = [];
    const n = Math.floor(t / STEP);
    for (const k of [n - 1, n]) {
      if (k < 0) continue;
      const start = k * STEP;
      if (t < start || t >= start + HOLD) continue;
      out.push({
        key: Math.floor(hash(k * 7.7) * whiteCount),
        // Round-robin: each note takes the next layer in turn.
        layer: k % 4,
      });
    }
    return out;
  };

  /** Which white key's body a column falls in, or -1 on a separator. */
  const whiteAt = (i: number) => {
    const d = i - keyX0;
    if (d < 0 || d >= keySpan) return -1;
    if (d % WHITE_PITCH >= WHITE_BODY) return -1;
    return Math.floor(d / WHITE_PITCH);
  };

  return {
    carve(i, j) {
      if (layerH > 0 && j >= layerY0 && j <= layerY1) {
        const d = i - layerX0;
        if (d < 0 || d >= layerPitch * 4) return false;
        return d % layerPitch < layerW;
      }

      if (j < keyY0 || j > keyY1) return false;

      if (j <= blackY1) {
        for (let k = 0; k < whiteCount - 1; k++) {
          if (!BLACK_AFTER.has(k % 7)) continue;
          const sep = sepCol(k);
          if (i > sep - BLACK_W && i <= sep) return true;
        }
      }

      // Separators between white keys, full height.
      const d = i - keyX0;
      return d >= 0 && d < keySpan && d % WHITE_PITCH >= WHITE_BODY;
    },

    idle(c: Cell, t) {
      if (!c.interior) return NO_MOVE;
      // Only the exposed part of a white key travels, below where the black
      // keys end. That is the part of a real key you actually see move.
      if (c.j <= blackY1 || c.j > keyY1) return NO_MOVE;
      const white = whiteAt(c.i);
      if (white < 0) return NO_MOVE;
      return sounding(t).some((n) => n.key === white) ? [0, 1] : NO_MOVE;
    },

    overlay(t) {
      const out: AccentCell[] = [];
      const notes = sounding(t);

      // The layers currently carrying a note.
      if (layerH > 0) {
        for (const note of notes) {
          const x = layerX0 + note.layer * layerPitch;
          for (let dx = 0; dx < layerW; dx++) {
            for (let j = layerY0; j <= layerY1; j++) out.push({ i: x + dx, j });
          }
        }
      }

      // The struck key, marked across its lip, so the note and the layer it
      // landed on read as one event rather than two unrelated lights.
      for (const note of notes) {
        const x = keyX0 + note.key * WHITE_PITCH;
        for (let dx = 0; dx < WHITE_BODY; dx++) out.push({ i: x + dx, j: keyY1 });
      }

      return out;
    },

    signature(t) {
      return `k${sounding(t)
        .map((n) => `${n.key}.${n.layer}`)
        .join(",")}`;
    },
  };
};
