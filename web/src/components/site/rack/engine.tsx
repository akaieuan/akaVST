"use client";

import { useEffect, useRef } from "react";
import { board } from "./board";
import { chrome } from "./chrome";
import { engines } from "./engines";
import { keys } from "./keys";
import {
  clamp01,
  easeInCubic,
  easeOutCubic,
  hash,
  inPanel,
} from "./field";
import type { AccentCell, Cell, DeviceFactory } from "./types";

/**
 * The akaVST mark: a pixel *panel* that assembles, holds, dissolves and
 * reforms, with device geometry knocked out of it.
 *
 * Same engine grammar as akaOSS's PixelHead: deterministic hash PRNG, one
 * sampled cell set, an assemble-and-hold timeline, colour tracking
 * --foreground across theme flips, RAF gated on visibility, and one still
 * frame under prefers-reduced-motion.
 *
 * What is its own: the field is a rounded rectangle rather than a disc, all
 * geometry is laid out in whole cells so nothing aliases at small sizes, and
 * each instrument's device draws its own face and moves it the way that
 * instrument actually moves. Devices live in sibling modules and are pure
 * closures over their geometry; this file never knows what any of them are.
 */

export type RackMode = "board" | "keys" | "engines" | "chrome";

/** Accent tokens from globals.css. One per plugin, spent inside the mark. */
export type RackAccent = "rose" | "blue" | "amber" | "violet" | "green";

const DEVICES: Record<RackMode, DeviceFactory> = {
  board,
  keys,
  engines,
  chrome,
};

type PixelRackProps = {
  /** Canvas width in CSS px. */
  size: number;
  /** Height as a fraction of width. Panels are landscape; chrome squarer. */
  ratio?: number;
  /** Cells across. Rows follow from `ratio`. */
  grid?: number;
  /** Which instrument's device to draw. */
  mode?: RackMode;
  /** Colour for the device's accent cells. Omit for a monochrome mark. */
  accent?: RackAccent;
  /** Dissolve style for the loop's exit. */
  dissolve?: "glitch" | "scatter" | "ash";
  /** Gap between pixels, as a fraction of a cell. */
  gap?: number;
  /** Render one assembled frame and never animate. */
  still?: boolean;
  /** Assemble once when first visible, then hold and idle. No dissolve loop. */
  once?: boolean;
  /** Scale down with the container (canvas caps at `size`). */
  fluid?: boolean;
  /** Override the pixel colour (default: the theme foreground). */
  color?: string;
  speed?: number;
  className?: string;
};

export function PixelRack({
  size,
  ratio = 0.625,
  grid = 34,
  mode = "chrome",
  accent,
  dissolve = "glitch",
  gap = 0.16,
  still = false,
  once = false,
  fluid = false,
  color,
  speed = 1,
  className,
}: PixelRackProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const cols = grid;
    const rows = Math.max(6, Math.round(grid * ratio));
    const device = DEVICES[mode](cols, rows);

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(size * dpr);
    const H = Math.round(size * ratio * dpr);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Loop state, declared up here because the theme observer below reaches
    // into it and the reduced-motion path returns before the loop is built.
    let raf = 0;
    let running = false;
    let lastSig = "";

    // Colour follows the theme. The host carries color: var(--foreground), and
    // accents are read straight off the root, where they are declared per
    // theme rather than behind a var() indirection.
    let fg = "";
    let accentColor = "";
    const readColors = () => {
      fg = getComputedStyle(host).color;
      accentColor = accent
        ? getComputedStyle(document.documentElement)
            .getPropertyValue(`--accent-${accent}`)
            .trim()
        : "";
    };
    readColors();

    const themeObserver = new MutationObserver(() => {
      readColors();
      // Defeat the idle throttle so a running loop repaints on its next frame.
      lastSig = "";
      // A paused mark has no next frame: offscreen, hidden tab, or reduced
      // motion. Without this, a mark below the fold keeps the old theme's
      // colour until it scrolls into view.
      if (!running) paintStill();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    /* ---- sample cells ------------------------------------------------- */
    const cellW = W / cols;
    const cellH = H / rows;
    const px = Math.min(cellW, cellH) * (1 - gap);
    const offX = (cellW - px) / 2;
    const offY = (cellH - px) / 2;

    // The screen bounds are recomputed here rather than exported from the
    // device: the engine only needs to know which cells are allowed to move.
    const padX = Math.max(2, Math.round(cols * 0.13));
    const padY = Math.max(1, Math.round(rows * 0.15));
    const sx0 = padX;
    const sx1 = cols - 1 - padX;
    const sy0 = padY;
    const sy1 = rows - 1 - padY;

    const cells: Cell[] = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const nx = ((i + 0.5) / cols) * 2 - 1;
        const ny = ((j + 0.5) / rows) * 2 - 1;
        // Negative treatment throughout: solid panel, device carved out of it.
        // The carve itself runs per frame in drawCell, so a device is free to
        // change its face over time without the cell set being resampled.
        if (!inPanel(nx, ny, ratio)) continue;
        const seed = i * 37 + j * 101;
        const r1 = hash(seed);
        const delay =
          dissolve === "ash"
            ? ((ny + 1) / 2) * 0.75 + r1 * 0.25
            : dissolve === "scatter"
              ? r1
              : hash(Math.floor((nx + 1) * 6)) * 0.7 + r1 * 0.3;
        cells.push({
          i,
          j,
          x: i * cellW,
          y: j * cellH,
          interior: i >= sx0 && i <= sx1 && j >= sy0 && j <= sy1,
          seed,
          r1,
          r2: hash(seed + 1),
          r3: hash(seed + 2),
          delay,
        });
      }
    }

    /* ---- timeline (seconds) ------------------------------------------- */
    const HOLD = 9;
    const DISSOLVE = 1.9;
    const GONE = 0.5;
    const REFORM = 1.6;
    const TOTAL = HOLD + DISSOLVE + GONE + REFORM;
    const SPREAD = 0.55;

    const drawCell = (c: Cell, t: number, hold: number) => {
      // t: 0 assembled, 1 fully dissolved. `hold` drives idle motion at t=0.
      let x = c.x;
      let y = c.y;
      let a = 1;
      let scale = 1;

      // The device's face is carved every frame, including mid-reform, so the
      // shape is already there as the panel lands rather than popping in.
      if (c.interior && device.carve(c.i, c.j, hold)) return;

      if (t <= 0) {
        const [dx, dy] = device.idle(c, hold);
        if (dx || dy) {
          // Interior cells slide under the frame rather than over it: once a
          // cell leaves the screen it is simply not drawn, so the outline
          // stays exactly as sampled.
          const i = c.i + dx;
          const j = c.j + dy;
          if (i < sx0 || i > sx1 || j < sy0 || j > sy1) return;
          x += dx * cellW;
          y += dy * cellH;
        }
      } else if (dissolve === "ash") {
        const e = easeInCubic(t);
        y -= e * H * (0.55 + c.r2 * 0.5);
        x += Math.sin(t * (4 + c.r2 * 5) + c.seed) * W * 0.045 * t;
        a = 1 - t;
        scale = 1 - t * 0.5;
      } else if (dissolve === "scatter") {
        const e = easeOutCubic(t);
        y += 0.85 * H * e * (0.8 + c.r2 * 0.6);
        x += (c.r3 - 0.5) * W * 0.3 * e;
        a = 1 - easeInCubic(t) * 0.9;
      } else {
        // glitch: horizontal tearing in whole cells, the house default
        const stepped = Math.floor(t * 9) / 9;
        if (stepped > 0) {
          x += Math.round((hash(c.seed + stepped * 53) - 0.5) * 9 * stepped) * cellW;
          if (hash(c.seed + stepped * 17) > 0.82) {
            y += Math.round((hash(c.seed + stepped * 29) - 0.5) * 4) * cellH;
          }
        }
        const flick = hash(c.seed + Math.floor(t * 14) * 7);
        a = t >= 0.99 ? 0 : flick > t * 0.9 ? 1 : 0.15;
      }

      if (a <= 0.01) return;
      ctx.globalAlpha = a;
      const sz = px * scale;
      ctx.fillRect(x + offX + (px - sz) / 2, y + offY + (px - sz) / 2, sz, sz);
    };

    /**
     * Accent cells sit on top of the panel, each clearing a halo first so it
     * reads against the surrounding material rather than merging into it.
     * Drawn only while assembled: mid-dissolve they would be the one thing
     * standing still.
     */
    const drawAccents = (list: AccentCell[]) => {
      if (!accentColor || list.length === 0) return;
      // Clear exactly the cell, not a halo around it: an accent cell should
      // read as replacing one pixel of the panel, not blowing a hole in it.
      for (const a of list) {
        ctx.clearRect(a.i * cellW, a.j * cellH, cellW, cellH);
      }
      ctx.fillStyle = accentColor;
      for (const a of list) {
        ctx.globalAlpha = a.alpha ?? 1;
        ctx.fillRect(a.i * cellW + offX, a.j * cellH + offY, px, px);
      }
      ctx.globalAlpha = 1;
    };

    const paint = (t: number, hold: number) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = fg;
      for (const c of cells) {
        drawCell(c, clamp01(t * (1 + SPREAD) - c.delay * SPREAD), hold);
      }
      ctx.globalAlpha = 1;
      if (t <= 0) drawAccents(device.overlay(hold));
    };

    const paintStill = () => paint(0, 0);

    /* ---- loop, with the house pause / reduced-motion machinery --------- */
    const reduced =
      still ||
      mode === "chrome" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      paintStill();
      return () => themeObserver.disconnect();
    }

    let visible = false;
    let started = false;
    let t0 = 0;

    const frame = (now: number) => {
      if (!t0) t0 = now;
      const elapsed = ((now - t0) / 1000) * speed;

      if (once) {
        // Assemble on first sight, then hold and idle forever.
        const g = Math.max(0, 1 - elapsed / REFORM);
        if (g > 0) {
          lastSig = "";
          paint(g, 0);
          raf = requestAnimationFrame(frame);
          return;
        }
        const hold = elapsed - REFORM;
        const sig = device.signature(hold);
        if (sig !== lastSig) {
          lastSig = sig;
          paint(0, hold);
        }
        raf = requestAnimationFrame(frame);
        return;
      }

      const time = elapsed % TOTAL;
      let g: number;
      let hold = 0;
      if (time < REFORM) {
        g = 1 - time / REFORM;
      } else if (time < REFORM + HOLD) {
        g = 0;
        hold = time - REFORM + Math.floor(elapsed / TOTAL) * HOLD;
      } else if (time < REFORM + HOLD + DISSOLVE) {
        g = (time - REFORM - HOLD) / DISSOLVE;
      } else {
        g = 1;
      }

      // Only the assembled window is throttleable; dissolve and reform run at
      // full rate (empty signature).
      const sig = g === 0 ? device.signature(hold) : "";
      if (sig !== "" && sig === lastSig) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastSig = sig;
      paint(g, hold);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const sync = () => {
      if (visible && !document.hidden) {
        started = true;
        start();
      } else if (started) {
        stop();
      }
    };

    const observer = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? true;
      sync();
    });
    observer.observe(host);
    document.addEventListener("visibilitychange", sync);

    // Assembled from the first paint, so a card below the fold costs nothing
    // and still looks finished the moment it scrolls in.
    paintStill();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      themeObserver.disconnect();
    };
  }, [size, ratio, grid, mode, accent, dissolve, gap, still, once, fluid, color, speed]);

  return (
    <span
      ref={hostRef}
      className={className}
      aria-hidden
      style={{
        display: "inline-block",
        lineHeight: 0,
        color: color ?? "var(--foreground)",
        ...(fluid ? { width: "100%", maxWidth: size } : null),
      }}
    >
      <canvas
        ref={canvasRef}
        style={
          fluid
            ? { width: "100%", height: "auto", display: "block" }
            : { width: size, height: Math.round(size * ratio), display: "block" }
        }
      />
    </span>
  );
}
