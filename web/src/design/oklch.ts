/**
 * OKLCH → sRGB, and the gamut search the accent rule depends on.
 *
 * Small enough to own rather than take a dependency for, and owning it means
 * the generator, any future check and the docs all agree on what "in gamut"
 * means. Conversion follows Björn Ottosson's OKLab matrices.
 */

export type Oklch = { l: number; c: number; h: number };
/** Straight sRGB, 0..1 per channel, before the transfer function. */
export type LinearRgb = [number, number, number];

const encode = (t: number) =>
  t > 0.0031308 ? 1.055 * Math.pow(t, 1 / 2.4) - 0.055 : 12.92 * t;

const decode = (v: number) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

export function oklchToLinear({ l, c, h }: Oklch): LinearRgb {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);

  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
}

/**
 * Is this colour representable in sRGB? The epsilon absorbs the float noise a
 * round trip leaves behind; without it the binary search below never settles.
 */
export function inGamut(colour: Oklch, epsilon = 0.001): boolean {
  return oklchToLinear(colour).every((v) => {
    const s = encode(v);
    return s >= -epsilon && s <= 1 + epsilon;
  });
}

/**
 * The largest chroma this lightness and hue can hold in sRGB.
 *
 * The gamut boundary is not analytic in OKLCH, so this bisects. 40 iterations
 * over a 0..0.45 range lands well inside float precision, and it runs at build
 * time on five colours, so there is nothing to optimise here.
 */
export function gamutCeiling(l: number, h: number): number {
  let lo = 0;
  let hi = 0.45;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ l, c: mid, h })) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Gamma-encoded sRGB, 0..1 per channel — the space CSS actually paints in. */
export type Srgb = [number, number, number];

export function oklchToSrgb(colour: Oklch): Srgb {
  return oklchToLinear(colour).map((v) =>
    Math.min(1, Math.max(0, encode(v))),
  ) as Srgb;
}

export function srgbToHex8(rgb: Srgb): string {
  return rgb
    .map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0"))
    .join("");
}

export const toHex8 = (colour: Oklch): string => srgbToHex8(oklchToSrgb(colour));

/** WCAG relative luminance, for the contrast figures the docs quote. */
export function luminance(colour: Oklch): number {
  const [r, g, b] = oklchToLinear(colour).map((v) =>
    decode(Math.min(1, Math.max(0, encode(v)))),
  );
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrast(a: Oklch, b: Oklch): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Composite a translucent colour over an opaque one.
 *
 * CSS resolves alpha at paint time; C++ needs an opaque ARGB word. Every
 * alpha-over-surface token therefore has to be flattened against whatever it
 * actually sits on before it can cross into the plugins.
 *
 * The blend happens in gamma-encoded sRGB, not linear light. Linear is the
 * physically correct answer and the wrong one here: browsers and canvas both
 * composite in the encoded space, so linear blending drifts light. Measured —
 * `--border` (white at 10%) over `--card` renders #292928 in Chrome, and a
 * linear blend of the same pair gives #5b5b5b. Matching the site beats being
 * right about photons.
 */
export function flatten(over: Oklch, alpha: number, backdrop: Oklch): Srgb {
  const fg = oklchToSrgb(over);
  const bg = oklchToSrgb(backdrop);
  return [0, 1, 2].map((i) => fg[i]! * alpha + bg[i]! * (1 - alpha)) as Srgb;
}
