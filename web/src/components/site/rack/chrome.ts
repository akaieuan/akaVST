import { blockAt, blockRun, screen } from "./field";
import { NO_MOVE, type DeviceFactory } from "./types";

/**
 * The chrome mark: the board's face, held still. Used in the nav, the dropdown
 * and the favicon, so it has to stay legible down to about 26px, where the
 * screen is only a handful of cells across.
 */
export const chrome: DeviceFactory = (cols, rows) => {
  const s = screen(cols, rows);
  const run = blockRun(s);

  const displayH = Math.max(1, Math.round(s.h * 0.2));
  const barY1 = s.y0 + displayH - 1;
  const stepH = Math.max(2, Math.round(s.h * 0.3));
  const stepY0 = s.y1 - stepH + 1;

  return {
    carve(i, j) {
      if (j >= s.y0 && j <= barY1 && i > s.x0 && i < s.x1) return true;
      if (j >= stepY0 && j <= s.y1) return blockAt(i, run) >= 0;
      return false;
    },
    idle() {
      return NO_MOVE;
    },
    overlay() {
      return [];
    },
    signature() {
      return "chrome";
    },
  };
};
