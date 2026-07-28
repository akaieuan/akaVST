import { blockAt, blockRun, screen } from "./field";
import { NO_MOVE, type Cell, type DeviceFactory } from "./types";

/**
 * akaBleep: a display bar over a step row, with a playhead sweeping it and a
 * sparse set of parameter locks lifting behind it.
 */
export const board: DeviceFactory = (cols, rows) => {
  const s = screen(cols, rows);
  const run = blockRun(s);

  const displayH = Math.max(1, Math.round(s.h * 0.2));
  const barY1 = s.y0 + displayH - 1;
  const stepH = Math.max(2, Math.round(s.h * 0.3));
  const stepY0 = s.y1 - stepH + 1;

  const headAt = (t: number) => Math.floor(t * 3.2) % run.count;

  return {
    carve(i, j) {
      if (j >= s.y0 && j <= barY1 && i > s.x0 && i < s.x1) return true;
      if (j >= stepY0 && j <= s.y1) return blockAt(i, run) >= 0;
      return false;
    },

    idle(c: Cell, t) {
      if (!c.interior) return NO_MOVE;
      const block = blockAt(c.i, run);
      const head = headAt(t);
      // The column under the playhead drops a cell.
      if (block === head) return [0, 1];
      // Locks lift on the step behind it.
      if (block === (head + run.count - 1) % run.count && c.r2 > 0.72) {
        return [0, -1];
      }
      return NO_MOVE;
    },

    overlay() {
      return [];
    },

    signature(t) {
      return `b${headAt(t)}`;
    },
  };
};
