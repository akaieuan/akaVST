/**
 * The brand catalogue's table of contents.
 *
 * Unlisted on purpose: reachable from the footer and by URL, but not from the
 * header. It documents what the site itself is made of, which is useful when
 * building and noise for anyone who came here to read about a synth.
 */

export type DemoSectionMeta = {
  slug: string;
  title: string;
  blurb: string;
  /** Named on the overview card, so the page is legible without clicking. */
  contents: string[];
};

export const DEMO_SECTIONS: DemoSectionMeta[] = [
  {
    slug: "marks",
    title: "Marks",
    blurb:
      "PixelRack, the one canvas component behind the favicon, the nav mark, the plugin badges and the hero. Every device, every size, every behaviour.",
    contents: ["Devices", "Accents", "Sizes", "Dissolve modes", "still and once", "fluid", "Props"],
  },
  {
    slug: "primitives",
    title: "Primitives",
    blurb:
      "The small site-level helpers: the fading rule, the theme toggle, and the class idioms that carry every card, label and link on the site.",
    contents: ["Hairline", "ThemeToggle", ".label", "Card surfaces", "Link idioms", "Entrance"],
  },
  {
    slug: "skeleton",
    title: "Skeleton",
    blurb:
      "The shared JUCE layer the instruments are built from: one palette, one LookAndFeel, and the blocks a plugin gets assembled out of. The plugin-side half of the same design system.",
    contents: ["Blocks", "Chassis", "Accents", "Using it"],
  },
  {
    slug: "tokens",
    title: "Tokens",
    blurb:
      "The palette as swatches, read out of globals.css at build time so this page cannot drift from the stylesheet. Surfaces, lines, text, and the five accents.",
    contents: ["Surfaces", "Lines", "Text", "Accents", "Radius"],
  },
];

export const DEMO_NAV = [
  { href: "/demo", title: "Overview" },
  ...DEMO_SECTIONS.map((s) => ({ href: `/demo/${s.slug}`, title: s.title })),
];

/** Prev and next neighbours, so the catalogue reads as a sequence. */
export function demoNeighbours(slug: string) {
  const i = DEMO_NAV.findIndex((n) => n.href === `/demo/${slug}`);
  return {
    prev: i > 0 ? DEMO_NAV[i - 1] : undefined,
    next: i >= 0 && i < DEMO_NAV.length - 1 ? DEMO_NAV[i + 1] : undefined,
  };
}
