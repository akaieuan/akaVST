import { board } from "./board";
import { engines } from "./engines";
import { hash } from "./field";
import { keys } from "./keys";
import type { DeviceFactory } from "./types";

/**
 * The collection itself: the three instruments in turn, in one panel.
 *
 * This device owns no geometry. It builds the other three for the same grid
 * and hands off to whichever is currently on, holding each for a few seconds
 * and tearing between them. Because every device carves per frame rather than
 * at sample time, the panel can change face mid-loop without resampling.
 *
 * The hero paints this in violet rather than any instrument's own accent, so
 * it reads as the collection rather than as one of its members.
 */

/** Seconds each instrument holds, and how long the tear between them lasts. */
const DWELL = 4.6;
const TEAR = 0.34;

export const collection: DeviceFactory = (cols, rows) => {
  const faces = [board(cols, rows), keys(cols, rows), engines(cols, rows)];

  const at = (t: number) => {
    const slot = Math.floor(t / DWELL);
    const phase = t - slot * DWELL;
    const index = ((slot % faces.length) + faces.length) % faces.length;
    return {
      face: faces[index],
      index,
      slot,
      /** 0 while settled, ramping to 1 across the tear at the end of the slot. */
      tear: phase > DWELL - TEAR ? (phase - (DWELL - TEAR)) / TEAR : 0,
    };
  };

  return {
    carve(i, j, t) {
      const { face, tear } = at(t);
      const carved = face.carve(i, j, t);
      if (tear === 0) return carved;
      // Invert a growing share of cells on the way out. A hard tear reads
      // better than a crossfade when the two faces share no geometry.
      return hash(i * 31.1 + j * 17.7 + Math.floor(t * 40) * 3.3) < tear * 0.85
        ? !carved
        : carved;
    },

    idle(c, t) {
      const { face, tear } = at(t);
      return tear > 0 ? [0, 0] : face.idle(c, t);
    },

    overlay(t) {
      const { face, tear } = at(t);
      return tear > 0 ? [] : face.overlay(t);
    },

    signature(t) {
      const { face, slot, tear } = at(t);
      return tear > 0
        ? `c${slot}t${Math.floor(t * 40)}`
        : `c${slot}:${face.signature(t)}`;
    },
  };
};
