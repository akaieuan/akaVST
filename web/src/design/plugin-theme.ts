/**
 * The bridge between the site's token vocabulary and the plugins'.
 *
 * Both names are right for their context — the site talks about cards and
 * popovers, a plugin talks about panels and screens — so something has to own
 * the mapping. This does, and it is the only place that does: the C++ emitter
 * formats what comes out of here, and /demo/skeleton renders it. Neither
 * restates it.
 *
 * Two pieces of colour maths live here rather than in the token source, because
 * they exist only for the crossing:
 *
 *   flattening   CSS defers alpha to paint time; a juce::uint32 cannot, so
 *                every alpha-over-surface token is composited against whatever
 *                it actually sits on
 *   the mid rung the plugins want three levels of text where the site declares
 *                two, so the middle is interpolated
 */

import { flatten, srgbToHex8, toHex8, type Oklch } from "./oklch.ts";
import {
  ACCENT_GLOW_ALPHA,
  ACCENT_NAMES,
  ACCENT_SOFT_ALPHA,
  STATE_ACCENTS,
  resolve,
  type AccentName,
  type Theme,
} from "./tokens.ts";

/** One resolved plugin colour, and where it came from. */
export type PluginColour = {
  /** The field name in the generated C++ `Theme` struct. */
  name: string;
  /** `rrggbb`, opaque. */
  hex: string;
  /** Which site token it derives from, for the docs. */
  from: string;
};

export type PluginAccentRow = {
  name: AccentName;
  base: string;
  soft: string;
  glow: string;
};

export type PluginTheme = {
  name: string;
  scheme: "light" | "dark";
  /** In the order the C++ struct declares them. */
  chassis: PluginColour[];
  accents: PluginAccentRow[];
  monoFont: string;
};

/** Halfway between two colours, for the text ramp's middle rung. */
const midpoint = (a: Oklch, b: Oklch): Oklch => ({
  l: (a.l + b.l) / 2,
  c: (a.c + b.c) / 2,
  h: a.h,
});

export function toPluginTheme(theme: Theme): PluginTheme {
  const bgPanel = resolve(theme.solid.card!);
  const textDim = resolve(theme.solid["muted-foreground"]!);
  const textHi = resolve(theme.solid.foreground!);
  const border = theme.alpha.border!;

  const over = (fg: Oklch, alpha: number) => srgbToHex8(flatten(fg, alpha, bgPanel));
  const stateAccent = (which: keyof typeof STATE_ACCENTS) =>
    theme.accents[STATE_ACCENTS[which] as AccentName];

  const chassis: PluginColour[] = [
    { name: "bgDeep", hex: toHex8(resolve(theme.solid.background!)), from: "--background" },
    { name: "bgPanel", hex: toHex8(bgPanel), from: "--card" },
    { name: "bgScreen", hex: toHex8(resolve(theme.plugin.bgScreen)), from: "declared — plugins only" },
    { name: "divider", hex: over(border.ink, border.a / 100), from: `--border over --card` },
    { name: "trackDim", hex: toHex8(resolve(theme.solid.muted!)), from: "--muted" },
    { name: "textDim", hex: toHex8(textDim), from: "--muted-foreground" },
    { name: "textMid", hex: toHex8(midpoint(textDim, textHi)), from: "interpolated" },
    { name: "textHi", hex: toHex8(textHi), from: "--foreground" },
    {
      name: "textOnAccent",
      hex: toHex8(resolve(theme.solid["primary-foreground"]!)),
      from: "--primary-foreground",
    },
    { name: "record", hex: toHex8(stateAccent("record")), from: "--accent-rose" },
    { name: "recordSoft", hex: over(stateAccent("record"), ACCENT_SOFT_ALPHA), from: "--accent-rose, knocked back" },
    { name: "selected", hex: toHex8(stateAccent("selected")), from: "--accent-amber" },
    { name: "selectedSft", hex: over(stateAccent("selected"), ACCENT_SOFT_ALPHA), from: "--accent-amber, knocked back" },
    { name: "active", hex: toHex8(stateAccent("active")), from: "--accent-green" },
    { name: "activeSoft", hex: over(stateAccent("active"), ACCENT_SOFT_ALPHA), from: "--accent-green, knocked back" },
  ];

  const accents: PluginAccentRow[] = ACCENT_NAMES.map((name) => {
    const base = theme.accents[name];
    return {
      name,
      base: toHex8(base),
      soft: over(base, ACCENT_SOFT_ALPHA),
      glow: over(base, ACCENT_GLOW_ALPHA),
    };
  });

  return { name: theme.name, scheme: theme.scheme, chassis, accents, monoFont: theme.plugin.monoFont };
}
