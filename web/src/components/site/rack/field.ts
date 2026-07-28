/**
 * Shared geometry and maths for every rack device.
 *
 * Two rules hold across all of them. Everything is laid out in whole cells
 * rather than normalized space, so a block is always an exact number of cells
 * and nothing aliases into mush at small sizes. And every device draws inside
 * an inset screen, so the panel keeps an unbroken frame: that frame is what
 * makes these read as hardware, and it is what idle motion is clipped to.
 */

export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const easeInCubic = (t: number) => t * t * t;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** The panel outline: a rounded rectangle, tested in aspect-corrected space. */
export function inPanel(nx: number, ny: number, ratio: number) {
  const halfW = 0.94;
  const halfH = 0.94 * ratio;
  const r = Math.min(halfW, halfH) * 0.26;
  const ax = Math.abs(nx);
  const ay = Math.abs(ny * ratio);
  if (ax > halfW || ay > halfH) return false;
  const cx = halfW - r;
  const cy = halfH - r;
  if (ax <= cx || ay <= cy) return true;
  return Math.hypot(ax - cx, ay - cy) <= r;
}

/** The inset area a device draws into, in cell indices, inclusive. */
export type Screen = {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** Width and height in cells. */
  w: number;
  h: number;
};

export function screen(cols: number, rows: number): Screen {
  const padX = Math.max(2, Math.round(cols * 0.13));
  const padY = Math.max(1, Math.round(rows * 0.15));
  const x0 = padX;
  const x1 = cols - 1 - padX;
  const y0 = padY;
  const y1 = rows - 1 - padY;
  return { x0, x1, y0, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** 2 cells on, 1 cell off: the smallest block that still reads as a block. */
export const UNIT = 3;

/** A centred row of equal blocks, sized to whatever the screen can hold. */
export type BlockRun = {
  /** First column of the first block. */
  x0: number;
  /** Total width in cells, trailing gap trimmed. */
  span: number;
  count: number;
};

export function blockRun(s: Screen, minCount = 3, unit = UNIT): BlockRun {
  const count = Math.max(minCount, Math.floor(s.w / unit));
  const span = count * unit - 1;
  return { x0: s.x0 + Math.floor((s.w - span) / 2), span, count };
}

/** Index of the block a column falls in, or -1 in a gap or outside the run. */
export function blockAt(i: number, run: BlockRun, unit = UNIT) {
  const d = i - run.x0;
  if (d < 0 || d > run.span) return -1;
  if (d % unit >= unit - 1) return -1;
  return Math.floor(d / unit);
}

/** Is this cell inside a rectangle given in cell indices, inclusive? */
export function inRect(
  i: number,
  j: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  return i >= x0 && i <= x1 && j >= y0 && j <= y1;
}
