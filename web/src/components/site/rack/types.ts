/**
 * The contract between the rack engine and the devices it draws.
 *
 * The engine owns everything generic: sampling the panel into cells, the
 * assemble/hold/dissolve timeline, visibility gating, theme colour, and the
 * paint loop. A device owns only what makes it that instrument.
 *
 * Devices are factories rather than objects with a layout parameter: each one
 * computes its geometry once for a given grid and closes over it, so the
 * engine never has to know or name a device's layout type.
 */

export type Cell = {
  /** Cell index in the grid. */
  i: number;
  j: number;
  /** Top-left in canvas pixels. */
  x: number;
  y: number;
  /** Inside the inset screen, so it may animate. Frame cells never move. */
  interior: boolean;
  seed: number;
  r1: number;
  r2: number;
  r3: number;
  /** Position in the dissolve stagger, 0..1. */
  delay: number;
};

/** A cell painted in the accent colour, over the top of the panel. */
export type AccentCell = { i: number; j: number; alpha?: number };

export const NO_MOVE = [0, 0] as const;

export type Device = {
  /** Is this cell cut away right now? Evaluated per painted frame. */
  carve(i: number, j: number, t: number): boolean;
  /** Whole-cell displacement while assembled, so the grid never softens. */
  idle(c: Cell, t: number): readonly [number, number];
  /** Cells drawn in the accent colour after the main pass. */
  overlay(t: number): AccentCell[];
  /**
   * The quantised state of the animation. An identical signature means an
   * identical frame, so the loop can skip the repaint entirely. Return a
   * constant for a device that does not animate.
   */
  signature(t: number): string;
};

export type DeviceFactory = (cols: number, rows: number) => Device;
