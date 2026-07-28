import { blockAt, blockRun, screen } from "./field";
import { NO_MOVE, type AccentCell, type DeviceFactory } from "./types";

/**
 * The chrome mark: the board's face, held still, with one step lit.
 *
 * This is the logo. It runs in the nav and the dropdown and is the shape the
 * favicon is drawn from, so it has to stay legible down to about 26px, where
 * the screen is only a handful of cells across. The lit step is the one piece
 * of colour the collection carries into its chrome, and it is the same cell
 * the favicon paints violet.
 *
 * Keep in sync with app/icon.svg.
 */
export const chrome: DeviceFactory = (cols, rows) => {
  const s = screen(cols, rows);
  const run = blockRun(s);

  const displayH = Math.max(1, Math.round(s.h * 0.2));
  const barY1 = s.y0 + displayH - 1;
  const stepH = Math.max(2, Math.round(s.h * 0.3));
  const stepY0 = s.y1 - stepH + 1;

  /** Second step from the left, so the mark is not symmetrical. */
  const litStep = Math.min(1, run.count - 1);

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
      const out: AccentCell[] = [];
      const x = run.x0 + litStep * 3;
      for (let j = stepY0; j <= s.y1; j++) out.push({ i: x, j }, { i: x + 1, j });
      return out;
    },
    signature() {
      return "chrome";
    },
  };
};
