/**
 * The block inventory.
 *
 * Hand-authored, because "what skeleton provides and how finished it is" has no
 * machine-readable source — the module header lists includes, not intent. The
 * colours on this page are generated; this list is the one thing on it that is
 * not, and it is the one thing that would lie if it drifted. Keep it honest:
 * a block is `ships` only when a plugin could use it today.
 *
 * This is also the earliest version of the library a no-code builder composes
 * from, which is why `planned` entries are listed rather than omitted. The gap
 * is the useful part.
 */

export type BlockStatus = "ships" | "partial" | "planned";

export const BLOCK_STATUS: Record<BlockStatus, { label: string; colour: string }> = {
  ships: { label: "ships", colour: "var(--accent-green)" },
  partial: { label: "partial", colour: "var(--accent-amber)" },
  planned: { label: "planned", colour: "var(--muted-foreground)" },
};

export type Block = {
  name: string;
  blurb: string;
  status: BlockStatus;
};

export const BLOCKS: Block[] = [
  {
    name: "Palette",
    blurb:
      "The active theme and accent, and every colour that follows. Generated from the site's token source, so the plugins and the website cannot disagree.",
    status: "ships",
  },
  {
    name: "LookAndFeel",
    blurb:
      "One implementation replacing three. Rotary, linear slider, combo box, label, button and the font ramp — the seven overrides all three plugins had written separately.",
    status: "ships",
  },
  {
    name: "Knob",
    blurb:
      "The house rotary: arc, spoke, mono caption and a live value with magnitude-aware formatting. Tooltip, double-click reset, wheel and fine drag, right-click menu.",
    status: "ships",
  },
  {
    name: "ModAssignHost",
    blurb:
      "Three methods a plugin implements so Knob can offer mod-assign without skeleton ever learning what a modulation matrix is. The pattern every future block follows.",
    status: "ships",
  },
  {
    name: "paintPanel",
    blurb:
      "A panel with a header strip and a tinted module tab, returning the inner bounds to lay controls into. Lifted from enzyme, the only one of the three that had factored it out.",
    status: "partial",
  },
  {
    name: "DeviceTabs",
    blurb:
      "Page switching along the top of the editor. Exists in i4 and moves here with the reskin, once there is a consumer to verify it against.",
    status: "planned",
  },
  {
    name: "Meters",
    blurb:
      "Output and header meters. bleep and i4 each have one; neither is generic yet.",
    status: "planned",
  },
  {
    name: "PixelRack",
    blurb:
      "The mark as a JUCE component — the site's engine ported, then fed live sequencer, grain or layer state instead of time alone.",
    status: "planned",
  },
  {
    name: "Overlays",
    blurb:
      "The detail and cheatsheet overlays i4 uses to explain a parameter without leaving the page.",
    status: "planned",
  },
];
