/**
 * Emit the design system into the two places that consume it, from one source.
 *
 * Sibling of sync-plugin-facts.mts and follows the same contract: output is
 * committed, and no build ever depends on this having run. The site reads the
 * generated CSS; the plugins read the generated header.
 *
 *   pnpm sync:tokens     rewrite both outputs
 *   pnpm check:tokens    regenerate and fail if the tree disagrees
 */

import fs from "node:fs";
import path from "node:path";
import {
  ACCENT_NAMES,
  DARK,
  LIGHT,
  RADII,
  SOLID_ORDER,
  THEMES,
  resolve,
  type Theme,
} from "../src/design/tokens.ts";
import { toPluginTheme } from "../src/design/plugin-theme.ts";
import type { Oklch } from "../src/design/oklch.ts";

const WEB = path.resolve(import.meta.dirname, "..");
const ROOT = path.resolve(WEB, "..");
const CSS = path.join(WEB, "src", "app", "globals.css");
const HEADER = path.join(ROOT, "skeleton", "modules", "aka_skeleton", "theme", "Tokens.h");
const JSON_OUT = path.join(WEB, "src", "content", "tokens.generated.json");

const START = "/* @generated-tokens-start";
const END = "/* @generated-tokens-end */";

/* ── CSS ──────────────────────────────────────────────────────────────── */

/** Minimal decimal form: 0.2 not 0.200, 1 not 1.0. */
const n = (v: number) => String(v);

const css = (c: Oklch) => `oklch(${n(c.l)} ${n(c.c)} ${n(c.h)})`;
const cssAlpha = (ink: Oklch, a: number) =>
  `oklch(${n(ink.l)} ${n(ink.c)} ${n(ink.h)} / ${a}%)`;

function emitTheme(theme: Theme, selector: string, withRadii: boolean): string {
  const out: string[] = [];
  out.push(`${selector} {`);
  out.push(`  color-scheme: ${theme.scheme};`);
  out.push("");

  for (const key of SOLID_ORDER) {
    out.push(`  --${key}: ${css(resolve(theme.solid[key]!))};`);
  }
  out.push(`  --border: ${cssAlpha(theme.alpha.border!.ink, theme.alpha.border!.a)};`);
  out.push(`  --input: ${cssAlpha(theme.alpha.input!.ink, theme.alpha.input!.a)};`);
  out.push(`  --ring: ${css(resolve(theme.solid.ring!))};`);
  out.push("");

  for (const name of ACCENT_NAMES) {
    out.push(`  --accent-${name}: ${css(theme.accents[name])};`);
  }
  out.push("");

  if (withRadii) {
    out.push(`  --radius: ${RADII.radius};`);
    out.push("");
  }

  for (const key of ["border-strong", "card-alpha", "card-border", "card-border-hover", "hairline"]) {
    const t = theme.alpha[key]!;
    out.push(`  --${key}: ${cssAlpha(t.ink, t.a)};`);
  }
  if (withRadii) {
    out.push(`  --radius-card: ${RADII["radius-card"]};`);
    out.push(`  --radius-pill: ${RADII["radius-pill"]};`);
  }
  out.push("");

  out.push(
    theme.scheme === "light"
      ? `  /* The mark's chassis. PixelRack paints only pixels, so without these the
     carved device face, the gaps between pixels and the area outside the panel
     all show the same card fill and the device stops reading as a device.
     --mark-panel fills every sampled cell, so it shows in the gaps and binds
     the grid into one plate; --mark-screen fills the carved cells. On paper the
     screen is the darker of the two, because it is recessed. */`
      : `  /* Inverted here: the ink is white, so the screen is the *lighter* of the two.
     That is what makes the carved face read as a lit display rather than a
     hole, and it keeps the dark mark close to what it was before the plate. */`,
  );
  for (const key of ["mark-panel", "mark-screen"]) {
    const t = theme.alpha[key]!;
    out.push(`  --${key}: ${cssAlpha(t.ink, t.a)};`);
  }
  out.push("}");
  return out.join("\n");
}

function emitCss(): string {
  return `${START} — \`pnpm sync:tokens\` owns everything to the matching
   end marker. Source: src/design/tokens.ts. Hand edits here are reverted by the
   next run and caught by \`pnpm check:tokens\`. */

/* ── Tokens ──────────────────────────────────────────────────────────────
   akaSTYLE, shared with akaOSS. Light is the "warm paper" theme, .dark the
   "warm near-black" default. Hierarchy comes from alpha, not hue: every
   surface sits on the same 107 hue at near-zero chroma, so nothing reads
   tinted. The five accents are punctuation, never fills. On this site each
   plugin owns exactly one of them and spends it on a single status dot.

   The light accents are derived, not picked. sRGB's gamut ceiling swings
   wildly by hue at a fixed lightness — at L=0.52 violet allows a chroma of
   0.286 and amber only 0.110 — so raising all five by hand puts three of them
   outside the gamut. They hold one lightness and take

       C = min(0.19, 0.93 * sRGB gamut ceiling at that L and hue)

   The 0.93 keeps each hue just inside its own ceiling; the 0.19 cap stops
   violet and rose, whose gamuts are enormous, from screaming next to amber,
   which has no room to answer. Re-derive rather than nudge: a hand-tuned value
   here is a value that clips somewhere.

   The dark accents predate that rule and sit below their ceilings on purpose —
   against near-black, less chroma reads as more. They are left alone. */

/* Light theme: warm paper. */
${emitTheme(LIGHT, ":root", true)}

/* Dark theme: warm near-black. Site default. */
${emitTheme(DARK, ".dark", false)}

${END}`;
}

/* ── C++ ──────────────────────────────────────────────────────────────── */

const argb = (hex: string) => `0xff${hex}`;

/** Struct field groups, so the emitted table stays readable at a glance. */
const GROUPS = [3, 2, 4, 6];

function emitThemeStruct(theme: Theme): string {
  const p = toPluginTheme(theme);

  const words = p.chassis.map((c) => argb(c.hex));
  const rows: string[] = [];
  let at = 0;
  for (const size of GROUPS) {
    rows.push(`        ${words.slice(at, at + size).join(", ")},`);
    at += size;
  }

  const accentRows = p.accents
    .map((a) => `        { ${argb(a.base)}, ${argb(a.soft)}, ${argb(a.glow)} }, // ${a.name}`)
    .join("\n");

  return `    {
        "${p.name}",
${rows.join("\n")}
        {
${accentRows}
        },
        "${p.monoFont}"
    },`;
}

function emitHeader(): string {
  return `#pragma once

// GENERATED by web/scripts/sync-design-tokens.mts — do not edit.
// Source of truth: web/src/design/tokens.ts. Run \`pnpm sync:tokens\` in web/.
//
// Same palette the website ships, mapped into the vocabulary the plugins use.
// Alpha-over-surface tokens are composited against the surface they sit on at
// generation time, because C++ needs an opaque ARGB word where CSS can defer
// the blend to paint time.

#include <juce_core/juce_core.h>

namespace aka
{

/** One accent at three strengths: full, knocked back, and a glow. */
struct Accent
{
    juce::uint32 base;
    juce::uint32 soft;
    juce::uint32 glow;
};

enum AccentId { accentBlue = 0, accentGreen, accentAmber, accentRose, accentViolet, numAccents };

/**
    The chassis, plus every accent it can spend.

    A plugin picks one accent and stays with it — that is the house rule the
    site enforces too, where each instrument owns exactly one and spends it on a
    single status dot. \`record\`, \`selected\` and \`active\` are the exceptions:
    they are state, not identity, and are the same colour in every plugin.
*/
struct Theme
{
    const char* name;

    juce::uint32 bgDeep;
    juce::uint32 bgPanel;
    juce::uint32 bgScreen;
    juce::uint32 divider;
    juce::uint32 trackDim;

    juce::uint32 textDim;
    juce::uint32 textMid;
    juce::uint32 textHi;
    juce::uint32 textOnAccent;

    // State, not identity. These mean the same thing in every instrument and
    // are the same colour in all of them, so transport muscle memory survives
    // moving between plugins — and survives a theme flip.
    juce::uint32 record;
    juce::uint32 recordSoft;
    juce::uint32 selected;
    juce::uint32 selectedSft;
    juce::uint32 active;
    juce::uint32 activeSoft;

    Accent accents[numAccents];

    const char* monoFontName;
};

inline constexpr Theme themes[] = {
${THEMES.map(emitThemeStruct).join("\n")}
};

inline constexpr int themeCount = (int) (sizeof (themes) / sizeof (themes[0]));

} // namespace aka
`;
}

/* ── JSON ─────────────────────────────────────────────────────────────── */

/**
 * A third emitter, for consumers outside this repository.
 *
 * Socket — the plugin builder — has to draw in the same language as the
 * instruments it composes, and a copied palette is one that will be wrong within
 * a month. It reads this instead. Same contract as the other two outputs:
 * committed, so nothing downstream depends on the generator having run.
 */
function emitJson(): string {
  const theme = (t: Theme) => ({
    name: t.name,
    scheme: t.scheme,
    css: Object.fromEntries([
      ...SOLID_ORDER.map((k) => [`--${k}`, css(resolve(t.solid[k]!))]),
      ["--ring", css(resolve(t.solid.ring!))],
      ...Object.entries(t.alpha).map(([k, v]) => [`--${k}`, cssAlpha(v.ink, v.a)]),
      ...ACCENT_NAMES.map((n2) => [`--accent-${n2}`, css(t.accents[n2])]),
    ]),
    plugin: toPluginTheme(t),
  });

  return (
    JSON.stringify(
      {
        note: "Generated by web/scripts/sync-design-tokens.mts. Do not edit.",
        source: "web/src/design/tokens.ts",
        radii: RADII,
        themes: THEMES.map(theme),
      },
      null,
      2,
    ) + "\n"
  );
}

/* ── Run ──────────────────────────────────────────────────────────────── */

const check = process.argv.includes("--check");

const currentCss = fs.readFileSync(CSS, "utf-8");
const startAt = currentCss.indexOf(START);
const endAt = currentCss.indexOf(END);
if (startAt === -1 || endAt === -1) {
  console.error(`✗ token markers not found in ${path.relative(ROOT, CSS)}`);
  process.exit(1);
}
const nextCss =
  currentCss.slice(0, startAt) + emitCss() + currentCss.slice(endAt + END.length);

const nextHeader = emitHeader();
const currentHeader = fs.existsSync(HEADER) ? fs.readFileSync(HEADER, "utf-8") : "";

const nextJson = emitJson();
const currentJson = fs.existsSync(JSON_OUT) ? fs.readFileSync(JSON_OUT, "utf-8") : "";

if (check) {
  const stale: string[] = [];
  if (nextCss !== currentCss) stale.push(path.relative(ROOT, CSS));
  if (nextHeader !== currentHeader) stale.push(path.relative(ROOT, HEADER));
  if (nextJson !== currentJson) stale.push(path.relative(ROOT, JSON_OUT));
  if (stale.length) {
    console.error(`✗ generated tokens are stale:\n  ${stale.join("\n  ")}`);
    console.error("  run `pnpm sync:tokens`");
    process.exit(1);
  }
  console.log("✓ generated tokens match src/design/tokens.ts");
  process.exit(0);
}

fs.writeFileSync(CSS, nextCss);
fs.mkdirSync(path.dirname(HEADER), { recursive: true });
fs.writeFileSync(HEADER, nextHeader);
fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
fs.writeFileSync(JSON_OUT, nextJson);
console.log(`✓ ${path.relative(ROOT, CSS)}`);
console.log(`✓ ${path.relative(ROOT, HEADER)}`);
console.log(`✓ ${path.relative(ROOT, JSON_OUT)}`);
