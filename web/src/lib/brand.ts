export const BRAND = {
  name: "akaVST",
  tagline: "a collection of audio plugins",
  description:
    "Three JUCE instruments for macOS by akaieuan: an acid voice with a 64-step sequencer, a four-layer lo-fi synth, and a sculpting sampler. Built in the open, documented as they go.",
  url: "https://akavst.dev",
  github: "https://github.com/akaieuan",
  author: "akaieuan",
} as const;

export const NAV_LINKS = [
  { href: "/plugins", key: "plugins", label: "Plugins" },
  { href: "/colophon", key: "colophon", label: "Colophon" },
] as const;

export type NavActive = (typeof NAV_LINKS)[number]["key"];
