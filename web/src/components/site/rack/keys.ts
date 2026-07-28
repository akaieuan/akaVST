import { inRect, screen } from "./field";
import { NO_MOVE, type Cell, type DeviceFactory } from "./types";

/**
 * Enzyme: four stacked bars at four different lengths, shearing against each
 * other at unrelated rates. The bar ends are what you actually see move,
 * which is why they are bars rather than the thin gaps this started as.
 */
export const keys: DeviceFactory = (cols, rows) => {
  const s = screen(cols, rows);

  const bandH = Math.max(2, Math.floor(s.h / 4));
  const barH = Math.max(1, bandH - 1);
  const barX0 = s.x0 + 1;
  const barSpan = s.x1 - 1 - barX0 + 1;

  const bars = [0.9, 0.58, 1, 0.72].map((frac, b) => {
    const bandTop = s.y0 + b * bandH;
    const top = bandTop + Math.floor((bandH - barH) / 2);
    return {
      bandTop,
      y0: top,
      y1: top + barH - 1,
      x0: barX0,
      x1: barX0 + Math.max(2, Math.round(barSpan * frac)) - 1,
    };
  });

  const bandOf = (j: number) => {
    let band = 0;
    for (let b = 1; b < bars.length; b++) if (j >= bars[b].bandTop) band = b;
    return band;
  };

  const shear = (band: number, t: number) =>
    Math.round(Math.sin(t * (0.34 + band * 0.15) + band * 1.7) * (1 + band * 0.6));

  return {
    carve(i, j) {
      return bars.some((bar) => inRect(i, j, bar.x0, bar.y0, bar.x1, bar.y1));
    },

    idle(c: Cell, t) {
      if (!c.interior) return NO_MOVE;
      return [shear(bandOf(c.j), t), 0];
    },

    overlay() {
      return [];
    },

    signature(t) {
      return `k${[0, 1, 2, 3].map((b) => shear(b, t)).join(",")}`;
    },
  };
};
