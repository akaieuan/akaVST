"use client";

import { useEffect, useRef } from "react";

/**
 * The akaVST mark: a pixel *panel* that assembles, holds, dissolves and
 * reforms, with device geometry knocked out of it.
 *
 * Same engine grammar as akaOSS's PixelHead (deterministic hash PRNG, one
 * sampled cell set, a dissolve/reform timeline, colour tracking --foreground
 * across theme flips, RAF gated on visibility, one still frame under
 * prefers-reduced-motion). Three things are its own:
 *
 *   1. The field is a rounded rectangle, not a disc. akaOSS is heads; this is
 *      hardware.
 *   2. All device geometry is laid out in whole cells rather than normalized
 *      space, and block counts are derived from the grid. A row of steps is
 *      always exactly 2 cells on, 1 cell off, so the same component reads
 *      correctly at 26px in the nav and 360px in a hero without aliasing into
 *      mush at either end.
 *   3. Each plugin gets a `mode` whose idle motion is what that plugin
 *      actually does: a sequencer playhead, four layers shearing, a granular
 *      scrub. Only cells inside the inset screen move, so the silhouette never
 *      wobbles, and nothing here flashes or pulses opacity (akaSTYLE 04).
 */

export type RackMode = "step" | "layers" | "grain" | "rack";

type PixelRackProps = {
  /** Canvas width in CSS px. */
  size: number;
  /** Height as a fraction of width. Panels are landscape; chrome marks squarer. */
  ratio?: number;
  /** Cells across. Rows follow from `ratio`. */
  grid?: number;
  /** Which device the knockout and the idle motion describe. */
  mode?: RackMode;
  /** Dissolve style for the loop's exit. */
  dissolve?: "glitch" | "scatter" | "ash";
  /** Gap between pixels, as a fraction of a cell. */
  gap?: number;
  /** Render one assembled frame and never animate (chrome, favicon). */
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

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeInCubic = (t: number) => t * t * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** The panel outline: a rounded rectangle, tested in aspect-corrected space. */
function inPanel(nx: number, ny: number, ratio: number) {
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

/* ---- device geometry, in whole cells ------------------------------------ *
 * Everything a mode draws lives inside an inset screen, so the panel keeps an
 * unbroken frame around it. That frame is what makes this read as hardware
 * rather than a torn grid, and it is what the idle motion is clipped to.
 */

/** 2 cells on, 1 cell off: the smallest block that still reads as a block. */
const UNIT = 3;

type Layout = {
  /** Screen bounds in cell indices, inclusive. */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** Block row: first column, total width, and how many blocks. */
  rowX: number;
  rowW: number;
  blocks: number;
  /** Display bar rows. */
  barY0: number;
  barY1: number;
  /** Block row rows. */
  blockY0: number;
  blockY1: number;
  /** Four layer bars: row range, column range, and the band's full row span. */
  bars: { y0: number; y1: number; x0: number; x1: number; bandTop: number }[];
  /** Waveform centre row and peak amplitude in cells. */
  waveMid: number;
  waveAmp: number;
};

function layout(cols: number, rows: number): Layout {
  const padX = Math.max(2, Math.round(cols * 0.13));
  const padY = Math.max(1, Math.round(rows * 0.15));
  const x0 = padX;
  const x1 = cols - 1 - padX;
  const y0 = padY;
  const y1 = rows - 1 - padY;

  const availW = x1 - x0 + 1;
  const availH = y1 - y0 + 1;

  // Blocks are whole units, centred in whatever width is left over.
  const blocks = Math.max(3, Math.floor(availW / UNIT));
  const rowW = blocks * UNIT - 1; // trailing gap trimmed
  const rowX = x0 + Math.floor((availW - rowW) / 2);

  const displayH = Math.max(1, Math.round(availH * 0.2));
  const blockH = Math.max(2, Math.round(availH * 0.3));

  // Four layer bars of differing lengths, one per band, so a horizontal shear
  // is legible: the bar ends are what you actually see move.
  const bandH = Math.max(2, Math.floor(availH / 4));
  const barH = Math.max(1, bandH - 1);
  const barX0 = x0 + 1;
  const barSpan = x1 - 1 - barX0 + 1;
  const bars = [0.9, 0.58, 1, 0.72].map((frac, b) => {
    const bandTop = y0 + b * bandH;
    const top = bandTop + Math.floor((bandH - barH) / 2);
    return {
      bandTop,
      y0: top,
      y1: top + barH - 1,
      x0: barX0,
      x1: barX0 + Math.max(2, Math.round(barSpan * frac)) - 1,
    };
  });

  return {
    x0,
    x1,
    y0,
    y1,
    rowX,
    rowW,
    blocks,
    barY0: y0,
    barY1: y0 + displayH - 1,
    blockY0: y1 - blockH + 1,
    blockY1: y1,
    bars,
    waveMid: (y0 + y1) / 2,
    waveAmp: Math.max(1, Math.floor((availH / 2) * 0.88)),
  };
}

/** Index of the block a column falls in, or -1 between or outside them. */
function blockIndex(i: number, l: Layout) {
  const d = i - l.rowX;
  if (d < 0 || d > l.rowW) return -1;
  if (d % UNIT >= UNIT - 1) return -1; // the gap cell
  return Math.floor(d / UNIT);
}

/**
 * The waveform envelope at a point in the sample, 0..1.
 *
 * Three partials at unrelated frequencies, drifting against each other, so the
 * window both travels along the sample and changes shape while it travels.
 * A fixed hash walk would scroll rigidly, like a texture on a belt; detuned
 * partials read as an actual signal, which is the point of the mark.
 */
function envelope(pos: number, t: number) {
  const v =
    0.5 * Math.sin(pos * 0.62 + t * 0.85) +
    0.28 * Math.sin(pos * 1.37 - t * 0.53) +
    0.22 * Math.sin(pos * 2.53 + t * 1.31) +
    0.12 * Math.sin(pos * 4.11 - t * 0.9);
  const n = 0.5 + 0.5 * (v / 1.12);
  // Smoothstep for contrast: without it the partials average out around the
  // middle and the wave reads as a slab with a wobbly edge rather than
  // something with quiet passages and peaks.
  return n * n * (3 - 2 * n);
}

/** akaBleep (and the chrome mark): a display bar over a row of steps. */
function knockSequencer(i: number, j: number, l: Layout) {
  if (j >= l.barY0 && j <= l.barY1 && i > l.x0 && i < l.x1) return true;
  if (j >= l.blockY0 && j <= l.blockY1) return blockIndex(i, l) >= 0;
  return false;
}

/** Enzyme: four stacked bars, one per layer, at four different lengths. */
function knockLayers(i: number, j: number, l: Layout) {
  return l.bars.some(
    (bar) => j >= bar.y0 && j <= bar.y1 && i >= bar.x0 && i <= bar.x1,
  );
}

/**
 * i4's waveform is carved at draw time rather than sampled out, because it
 * moves: the window travels along the sample and the silhouette changes with
 * it. Bars are the comb columns only, so material always survives between
 * them and the shape stays legible instead of reading as a morphing blob.
 *
 * `pos` advances the read position; `t` also drives the partials' drift.
 */
function waveAmpAt(i: number, l: Layout, t: number) {
  const bar = blockIndex(i, l);
  if (bar < 0) return -1;
  // `t * 2.1` is the read position travelling along the sample; the partials
  // drift on t as well, so the shape changes as the window moves through it.
  return Math.max(
    1,
    Math.round(l.waveAmp * (0.1 + 0.9 * envelope(bar + t * 2.1, t))),
  );
}

function inWave(i: number, j: number, l: Layout, t: number) {
  const amp = waveAmpAt(i, l, t);
  if (amp < 0) return false;
  return Math.abs(j - l.waveMid) <= amp;
}

/** Static knockouts, evaluated once when cells are sampled. */
const KNOCKOUTS: Record<RackMode, (i: number, j: number, l: Layout) => boolean> = {
  step: knockSequencer,
  rack: knockSequencer,
  layers: knockLayers,
  // grain carves dynamically in drawCell; nothing is removed up front.
  grain: () => false,
};

/** Which of the four layer bands a row sits in. */
function bandOf(j: number, l: Layout) {
  let band = 0;
  for (let b = 1; b < l.bars.length; b++) if (j >= l.bars[b].bandTop) band = b;
  return band;
}

export function PixelRack({
  size,
  ratio = 0.625,
  grid = 34,
  mode = "rack",
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
    const l = layout(cols, rows);
    const knockout = KNOCKOUTS[mode];

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

    // Pixel colour follows the theme: the host carries color: var(--foreground)
    // (set in JSX), so resolve it now and again whenever the html class flips.
    let fg = getComputedStyle(host).color;
    const themeObserver = new MutationObserver(() => {
      fg = getComputedStyle(host).color;
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

    type Cell = {
      i: number;
      j: number;
      x: number;
      y: number;
      block: number;
      band: number;
      /** Inside the screen, so it animates. Frame cells never move. */
      interior: boolean;
      seed: number;
      r2: number;
      r3: number;
      delay: number;
    };

    const cells: Cell[] = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const nx = ((i + 0.5) / cols) * 2 - 1;
        const ny = ((j + 0.5) / rows) * 2 - 1;
        // Negative treatment throughout: solid panel, device knocked out of it.
        if (!inPanel(nx, ny, ratio)) continue;
        const interior = i >= l.x0 && i <= l.x1 && j >= l.y0 && j <= l.y1;
        if (interior && knockout(i, j, l)) continue;
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
          block: blockIndex(i, l),
          band: bandOf(j, l),
          interior,
          seed,
          r2: hash(seed + 1),
          r3: hash(seed + 2),
          delay,
        });
      }
    }

    /* ---- idle motion: what the plugin does, in whole cells ------------- */

    const idle = (c: Cell, t: number): [number, number] => {
      if (!c.interior) return [0, 0];
      if (mode === "step") {
        // A playhead sweeps the step row; the column under it drops a cell.
        const head = Math.floor(t * 3.2) % l.blocks;
        if (c.block === head) return [0, 1];
        // Parameter locks: a fixed sparse set lifts on the step behind it.
        if (c.block === (head + l.blocks - 1) % l.blocks && c.r2 > 0.72) {
          return [0, -1];
        }
        return [0, 0];
      }
      if (mode === "layers") {
        // Four layers shearing against each other at unrelated rates.
        const rate = 0.34 + c.band * 0.15;
        const amp = 1 + c.band * 0.6;
        return [Math.round(Math.sin(t * rate + c.band * 1.7) * amp), 0];
      }
      if (mode === "grain") {
        // A read head crosses the travelling wave, plucking grains loose from
        // its edge. Narrow and shallow on purpose: the wave is the subject and
        // the scatter is punctuation, not the other way round.
        const span = l.x1 - l.x0;
        const scrub = l.x0 + (0.5 + 0.5 * Math.sin(t * 0.29)) * span;
        const reach = Math.max(1.5, span * 0.1);
        const d = Math.abs(c.i - scrub);
        if (d > reach) return [0, 0];
        const m = 1 - d / reach;
        // Only cells sitting on the wave's edge move; the field stays put.
        const edge = Math.abs(Math.abs(c.j - l.waveMid) - waveAmpAt(c.i, l, t));
        if (edge > 2.5) return [0, 0];
        return [0, Math.round((c.r3 - 0.5) * 5 * m)];
      }
      return [0, 0];
    };

    /**
     * The quantised state of the idle motion. An identical signature means an
     * identical frame, so the loop can skip the repaint entirely, the same
     * throttle PixelHead applies to its face clock.
     */
    const idleSignature = (t: number) => {
      if (mode === "step") return `s${Math.floor(t * 3.2) % l.blocks}`;
      if (mode === "layers")
        return `l${[0, 1, 2, 3]
          .map((b) => Math.round(Math.sin(t * (0.34 + b * 0.15) + b * 1.7) * (1 + b * 0.6)))
          .join(",")}`;
      // The wave travels continuously, so its signature is just a clock. 18Hz
      // is past the point where whole-cell amplitude steps read as smooth.
      if (mode === "grain") return `g${Math.floor(t * 18)}`;
      return "hold";
    };

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

      // The travelling waveform is carved every frame, including mid-reform,
      // so the shape is already there as the panel lands rather than popping
      // in once it settles.
      if (mode === "grain" && c.interior && inWave(c.i, c.j, l, hold)) return;

      if (t <= 0) {
        const [dx, dy] = idle(c, hold);
        if (dx || dy) {
          // Interior cells slide under the frame rather than over it: once a
          // cell leaves the screen it is simply not drawn, so the outline
          // stays exactly as sampled.
          const i = c.i + dx;
          const j = c.j + dy;
          if (i < l.x0 || i > l.x1 || j < l.y0 || j > l.y1) return;
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

    const paint = (t: number, hold: number) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = fg;
      for (const c of cells) {
        drawCell(c, clamp01(t * (1 + SPREAD) - c.delay * SPREAD), hold);
      }
      ctx.globalAlpha = 1;
    };

    const paintStill = () => paint(0, 0);

    /* ---- loop, with the house pause / reduced-motion machinery --------- */
    const reduced =
      still ||
      mode === "rack" ||
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
        const sig = idleSignature(hold);
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
      const sig = g === 0 ? idleSignature(hold) : "";
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
  }, [size, ratio, grid, mode, dissolve, gap, still, once, fluid, color, speed]);

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
