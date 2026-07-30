export const BRAND = {
  name: "akaVST",
  tagline: "a collection of audio plugins",
  description:
    "Three JUCE instruments for macOS by akaieuan: an acid voice with a 64-step sequencer, a four-layer lo-fi synth, and a sculpting sampler. Built in the open, documented as they go.",
  url: "https://akavst.dev",
  github: "https://github.com/akaieuan",
  author: "akaieuan",
} as const;

/**
 * Header links. The brand system lives at /demo and is reachable from the
 * footer instead: useful while building, noise for anyone who came to read
 * about a synth.
 *
 * Socket is a peer of Plugins rather than one of them — it is the tool that
 * makes an instrument, and the plugins page opens by claiming there are three.
 */
export const NAV_LINKS = [
  { href: "/plugins", key: "plugins", label: "Plugins" },
  { href: "/socket", key: "socket", label: "Socket" },
] as const;

export type NavActive = (typeof NAV_LINKS)[number]["key"];
