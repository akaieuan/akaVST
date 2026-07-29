/**
 * akaSTYLE, as data.
 *
 * One source for the site's CSS custom properties and the plugins' C++ `Theme`
 * struct, so the two cannot drift. Same rule the rest of the repo lives by:
 * `demo/tokens` parses `globals.css` rather than restating it, `sync:facts`
 * reads each CMakeLists rather than retyping versions, and nothing is
 * hand-copied.
 *
 * Not everything here is computed, and it should not be. Pretending otherwise
 * produces a generator that fights its own palette. The split:
 *
 *   derived    the five light accents, by the gamut rule below
 *   declared   surfaces and text — hand-tuned lightness, but the shared hue and
 *              the alpha ramp are stated once instead of repeated in thirty
 *              string literals
 *   left alone the dark accents, which predate the rule and sit below their
 *              ceilings deliberately: against near-black, less chroma reads as
 *              more
 *
 * The value is one place, one vocabulary, and CSS and C++ that cannot diverge.
 * It is not maximal computation.
 */

import { gamutCeiling, type Oklch } from "./oklch.ts";

/* ── Primitives ───────────────────────────────────────────────────────── */

/** Every surface and text token sits here, at near-zero chroma. */
export const HUE_SURFACE = 107;

/**
 * Light-theme overlays use a slightly warmer, slightly more chromatic ink than
 * the surfaces do. Borders and inputs are the exception and stay on the surface
 * hue — they sit directly against text, where any warmth reads as a tint.
 */
export const HUE_OVERLAY = 95;

export const INK_BORDER: Oklch = { l: 0.19, c: 0.005, h: HUE_SURFACE };
export const INK_OVERLAY: Oklch = { l: 0.19, c: 0.01, h: HUE_OVERLAY };
/** Dark overlays are pure white; the ground is warm enough already. */
export const INK_DARK: Oklch = { l: 1, c: 0, h: 0 };

/* ── The accent rule ──────────────────────────────────────────────────── */

/**
 * sRGB's gamut ceiling swings wildly by hue at a fixed lightness — at L=0.52
 * violet holds a chroma of 0.286 and amber only 0.110 — so raising all five by
 * hand puts three of them outside the gamut. Hold one lightness and take
 *
 *     C = min(CAP, HEADROOM × ceiling)
 *
 * HEADROOM keeps each hue just inside its own ceiling. CAP stops violet and
 * rose, whose gamuts are enormous, from screaming next to amber, which has no
 * room to answer — without it the five stop reading as one family.
 */
export const ACCENT_L_LIGHT = 0.52;
export const ACCENT_CAP_LIGHT = 0.19;
export const ACCENT_HEADROOM = 0.93;

export const ACCENT_NAMES = ["blue", "green", "amber", "rose", "violet"] as const;
export type AccentName = (typeof ACCENT_NAMES)[number];

const ACCENT_HUES_LIGHT: Record<AccentName, number> = {
  blue: 259,
  green: 152,
  amber: 75,
  rose: 15,
  violet: 295,
};

export function deriveAccent(hue: number): Oklch {
  const ceiling = gamutCeiling(ACCENT_L_LIGHT, hue);
  const c = Math.min(ACCENT_CAP_LIGHT, ACCENT_HEADROOM * ceiling);
  return { l: ACCENT_L_LIGHT, c: Math.round(c * 1000) / 1000, h: hue };
}

export const LIGHT_ACCENTS = Object.fromEntries(
  ACCENT_NAMES.map((n) => [n, deriveAccent(ACCENT_HUES_LIGHT[n])]),
) as Record<AccentName, Oklch>;

/**
 * Dark accents, declared. They predate the rule and sit below their ceilings on
 * purpose. Note amber's hue differs from light's by 5° — the warm accent needs
 * to stay clear of the near-black ground without going green.
 */
export const DARK_ACCENTS: Record<AccentName, Oklch> = {
  blue: { l: 0.68, c: 0.15, h: 259 },
  green: { l: 0.71, c: 0.11, h: 152 },
  amber: { l: 0.83, c: 0.12, h: 80 },
  rose: { l: 0.7, c: 0.15, h: 15 },
  violet: { l: 0.75, c: 0.11, h: 295 },
};

/* ── Themes ───────────────────────────────────────────────────────────── */

/** An opaque token: [lightness, chroma] on the surface hue unless `h` is given. */
type Solid = { l: number; c: number; h?: number };
/** A translucent token: an ink plus an alpha percentage. */
type Alpha = { ink: Oklch; a: number };

/**
 * Surfaces the plugins need and the site has no equivalent for.
 *
 * `bgScreen` is a display inset into a chassis — deeper than the window on a
 * dark theme, recessed rather than black on a light one. There is no honest way
 * to derive it from a web token, so it is declared. Deriving it anyway would
 * produce a confident wrong answer on the light theme, where "further from the
 * text" and "darker" point in opposite directions.
 */
type PluginSurfaces = { bgScreen: Solid; monoFont: string };

export type Theme = {
  name: string;
  scheme: "light" | "dark";
  solid: Record<string, Solid>;
  alpha: Record<string, Alpha>;
  accents: Record<AccentName, Oklch>;
  plugin: PluginSurfaces;
};

/**
 * How far an accent is knocked back for its soft and glow variants, as alpha
 * over the panel it sits on. C++ needs an opaque word, so these are composited
 * at generation time rather than left as alpha.
 */
export const ACCENT_SOFT_ALPHA = 0.45;
export const ACCENT_GLOW_ALPHA = 0.18;

/**
 * Which accent carries which plugin state.
 *
 * State is not identity. An instrument spends its own accent on what makes it
 * itself; these three mean the same thing in every plugin and are the same
 * colour everywhere, so that transport muscle memory survives moving between
 * them. bleep proved the need for `active` — it kept a green outside its theme
 * system entirely, precisely so PLAY never changed colour.
 */
export const STATE_ACCENTS = {
  record: "rose",
  selected: "amber",
  active: "green",
} as const;

export const LIGHT: Theme = {
  name: "warm paper",
  scheme: "light",
  solid: {
    background: { l: 0.955, c: 0.003 },
    foreground: { l: 0.16, c: 0.002 },
    card: { l: 0.993, c: 0.002 },
    "card-foreground": { l: 0.16, c: 0.002 },
    popover: { l: 0.993, c: 0.002 },
    "popover-foreground": { l: 0.16, c: 0.002 },
    primary: { l: 0.2, c: 0.003 },
    "primary-foreground": { l: 0.985, c: 0.002 },
    secondary: { l: 0.925, c: 0.003 },
    "secondary-foreground": { l: 0.21, c: 0.003 },
    muted: { l: 0.925, c: 0.003 },
    "muted-foreground": { l: 0.48, c: 0.004 },
    accent: { l: 0.925, c: 0.003 },
    "accent-foreground": { l: 0.21, c: 0.003 },
    destructive: { l: 0.577, c: 0.245, h: 27.325 },
    ring: { l: 0.48, c: 0.004 },
  },
  alpha: {
    border: { ink: INK_BORDER, a: 14 },
    input: { ink: INK_BORDER, a: 18 },
    "border-strong": { ink: INK_OVERLAY, a: 20 },
    "card-alpha": { ink: INK_OVERLAY, a: 3 },
    "card-border": { ink: INK_OVERLAY, a: 8 },
    "card-border-hover": { ink: INK_OVERLAY, a: 14 },
    hairline: { ink: INK_OVERLAY, a: 8 },
    "mark-panel": { ink: INK_OVERLAY, a: 6 },
    "mark-screen": { ink: INK_OVERLAY, a: 12 },
  },
  accents: LIGHT_ACCENTS,
  plugin: { bgScreen: { l: 0.9, c: 0.004 }, monoFont: "Menlo" },
};

export const DARK: Theme = {
  name: "warm near-black",
  scheme: "dark",
  solid: {
    background: { l: 0.146, c: 0.002 },
    foreground: { l: 0.937, c: 0.003 },
    card: { l: 0.176, c: 0.002 },
    "card-foreground": { l: 0.937, c: 0.003 },
    popover: { l: 0.176, c: 0.002 },
    "popover-foreground": { l: 0.937, c: 0.003 },
    primary: { l: 0.937, c: 0.003 },
    "primary-foreground": { l: 0.155, c: 0.002 },
    secondary: { l: 0.22, c: 0.002 },
    "secondary-foreground": { l: 0.937, c: 0.003 },
    muted: { l: 0.21, c: 0.002 },
    "muted-foreground": { l: 0.63, c: 0.004 },
    accent: { l: 0.22, c: 0.002 },
    "accent-foreground": { l: 0.937, c: 0.003 },
    destructive: { l: 0.704, c: 0.191, h: 22.216 },
    ring: { l: 0.6, c: 0.004 },
  },
  alpha: {
    border: { ink: INK_DARK, a: 10 },
    input: { ink: INK_DARK, a: 13 },
    "border-strong": { ink: INK_DARK, a: 18 },
    "card-alpha": { ink: INK_DARK, a: 3 },
    "card-border": { ink: INK_DARK, a: 6 },
    "card-border-hover": { ink: INK_DARK, a: 10 },
    hairline: { ink: INK_DARK, a: 6 },
    "mark-panel": { ink: INK_DARK, a: 4 },
    "mark-screen": { ink: INK_DARK, a: 8 },
  },
  accents: DARK_ACCENTS,
  plugin: { bgScreen: { l: 0.08, c: 0.002 }, monoFont: "Menlo" },
};

export const THEMES = [DARK, LIGHT] as const;

/** Radii live on :root only; .dark inherits them. */
export const RADII: Record<string, string> = {
  radius: "0.625rem",
  "radius-card": "1.0625rem",
  "radius-pill": "0.5rem",
};

/** Emission order, so a regenerated stylesheet diffs cleanly against the old. */
export const SOLID_ORDER = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
] as const;

export const resolve = (t: Solid): Oklch => ({
  l: t.l,
  c: t.c,
  h: t.h ?? HUE_SURFACE,
});
