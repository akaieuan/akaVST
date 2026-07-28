import { screen } from "./field";
import { NO_MOVE, type AccentCell, type DeviceFactory } from "./types";

/**
 * The logo: a waveform in a panel, held still.
 *
 * Deliberately not any one instrument's device. The board belongs to
 * akaBleep, so using it as the collection's mark said the wrong thing. Five
 * bars of a fixed waveform say "audio" without claiming to be a particular
 * synth, and the tallest bar carries the violet the hero paints in.
 *
 * The silhouette is a constant, not a hash: a logo has to be the same shape
 * every time it is drawn, at every size it is drawn at. Only the amplitude
 * scale changes with the panel, so this reads the same at 26px in the nav as
 * it does blown up on the brand pages.
 *
 * Keep in sync with app/icon.svg.
 */

/** Bar heights as a fraction of the half-height available. */
const WAVE = [0.45, 1, 0.3, 0.75, 0.55];
/** Which bar carries the accent. The peak. */
const LIT = 1;

export const chrome: DeviceFactory = (cols, rows) => {
  const s = screen(cols, rows);

  const pitch = Math.max(2, Math.floor((s.w + 1) / WAVE.length));
  const barW = Math.max(1, pitch - 1);
  const span = WAVE.length * pitch - (pitch - barW);
  const x0 = s.x0 + Math.floor((s.w - span) / 2);

  const mid = (s.y0 + s.y1) / 2;
  const maxAmp = Math.max(1, Math.floor((s.h - 1) / 2));

  const bars = WAVE.map((h, k) => ({
    x0: x0 + k * pitch,
    x1: x0 + k * pitch + barW - 1,
    amp: Math.max(1, Math.round(maxAmp * h)),
  }));

  return {
    carve(i, j) {
      for (const bar of bars) {
        if (i < bar.x0 || i > bar.x1) continue;
        return Math.abs(j - mid) <= bar.amp;
      }
      return false;
    },
    idle() {
      return NO_MOVE;
    },
    overlay() {
      const out: AccentCell[] = [];
      const bar = bars[LIT];
      for (let i = bar.x0; i <= bar.x1; i++) {
        for (let j = Math.ceil(mid - bar.amp); j <= Math.floor(mid + bar.amp); j++) {
          out.push({ i, j });
        }
      }
      return out;
    },
    signature() {
      return "chrome";
    },
  };
};
