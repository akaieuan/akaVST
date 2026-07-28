import type { Metadata } from "next";
import { PixelRack, type RackAccent, type RackMode } from "@/components/site/rack";
import { DemoHeader, DemoPager, DemoSection, Mono, Specimen, TileGrid } from "../_components/demo-ui";

export const metadata: Metadata = {
  title: "Marks · Brand system",
  description:
    "Every PixelRack device, accent, size and behaviour: the one canvas component behind the favicon, the nav mark, the plugin badges and the hero.",
};

/** The devices, in the order they were built. Names are the literal `mode` values. */
const DEVICES: { id: RackMode; accent?: RackAccent; who: string; note: string }[] = [
  {
    id: "board",
    accent: "rose",
    who: "akaBleep",
    note: "Step sequencer, knob row, fader bank. A playhead fills its step, each knob paints its value arc, each fader carries a cap.",
  },
  {
    id: "keys",
    accent: "blue",
    who: "Enzyme",
    note: "A keyboard with a layer strip. Notes arrive round-robin and overlap, so more than one layer lights at once.",
  },
  {
    id: "engines",
    accent: "amber",
    who: "i4",
    note: "Five waveform generators cycling on a glitch cut, with the running engine lit in the strip above.",
  },
  {
    id: "collection",
    accent: "violet",
    who: "The hero",
    note: "Owns no geometry. Builds the other three and hands off to whichever is on, tearing between them.",
  },
  {
    id: "chrome",
    accent: "violet",
    who: "The logo",
    note: "The board's face held still, one step lit. The nav mark, the dropdown badges, and the shape the favicon is drawn from.",
  },
];

export default function MarksPage() {
  return (
    <>
      <DemoHeader
        title="Marks."
        lede={
          <>
            One component, <Mono>PixelRack</Mono>, in five devices. The engine owns the timeline,
            visibility gating, theme colour and the paint loop; a device owns only what makes it
            that instrument. Every specimen below renders the shipped component.
          </>
        }
        meta="5 devices · 5 accents · 3 dissolve modes"
      />

      <DemoSection
        id="devices"
        title="Devices"
        meta="mode"
        description="Each instrument's idle motion is what that instrument actually does, rather than an abstract pattern assigned to it."
      >
        <TileGrid cols={2}>
          {DEVICES.map((d) => (
            <Specimen key={d.id} label={`mode="${d.id}"`} note={`${d.who}. ${d.note}`}>
              <PixelRack size={300} ratio={0.55} grid={34} mode={d.id} accent={d.accent} once fluid />
            </Specimen>
          ))}
        </TileGrid>
      </DemoSection>

      <DemoSection
        id="accents"
        title="Accents"
        meta="accent"
        description="Five tokens from globals.css, resolved off the root element per theme so they follow a theme flip. Omit the prop for a monochrome mark."
      >
        <TileGrid cols={3}>
          {(["rose", "blue", "amber", "violet", "green"] as const).map((accent) => (
            <Specimen key={accent} label={`accent="${accent}"`}>
              <PixelRack size={220} ratio={0.55} grid={26} mode="board" accent={accent} once fluid />
            </Specimen>
          ))}
          <Specimen label="no accent" note="Monochrome. The device still animates.">
            <PixelRack size={220} ratio={0.55} grid={26} mode="board" once fluid />
          </Specimen>
        </TileGrid>
      </DemoSection>

      <DemoSection
        id="sizes"
        title="Sizes"
        meta="size · grid"
        description="Geometry is laid out in whole cells and block counts derive from the grid, so blocks stay crisp at any size. Bands drop out from the bottom as the panel shrinks rather than aliasing into mush."
      >
        <TileGrid cols={3}>
          <Specimen label="26px · grid 13" note="The nav mark. Display bar and steps only.">
            <PixelRack size={26} ratio={0.78} grid={13} mode="chrome" accent="violet" />
          </Specimen>
          <Specimen label="120px · grid 20" note="Bands begin to appear.">
            <PixelRack size={120} ratio={0.62} grid={20} mode="board" accent="rose" once />
          </Specimen>
          <Specimen label="300px · grid 36" note="Everything the device has.">
            <PixelRack size={300} ratio={0.62} grid={36} mode="board" accent="rose" once fluid />
          </Specimen>
        </TileGrid>
      </DemoSection>

      <DemoSection
        id="dissolve"
        title="Dissolve modes"
        meta="dissolve"
        description="How the panel leaves on the looping timeline. Only visible without `once`, which holds forever instead."
      >
        <TileGrid cols={3}>
          {(["glitch", "scatter", "ash"] as const).map((mode) => (
            <Specimen key={mode} label={`dissolve="${mode}"`}>
              <PixelRack size={220} ratio={0.55} grid={26} mode="board" accent="rose" dissolve={mode} fluid />
            </Specimen>
          ))}
        </TileGrid>
      </DemoSection>

      <DemoSection
        id="behaviour"
        title="Behaviour"
        meta="still · once"
        description="The loop is gated on an IntersectionObserver plus visibilitychange, repaints on a theme change even while paused, and renders one still frame under prefers-reduced-motion."
      >
        <TileGrid cols={2}>
          <Specimen label="still" note="One assembled frame. Never animates. Chrome and favicon use this.">
            <PixelRack size={260} ratio={0.55} grid={30} mode="board" accent="rose" still fluid />
          </Specimen>
          <Specimen label="once" note="Assembles on first sight, then holds and idles. No dissolve loop.">
            <PixelRack size={260} ratio={0.55} grid={30} mode="board" accent="rose" once fluid />
          </Specimen>
        </TileGrid>
      </DemoSection>

      <DemoSection id="props" title="Remaining props" meta="ratio · gap · speed · fluid">
        <TileGrid cols={3}>
          <Specimen label="ratio={0.35}" note="Height as a fraction of width.">
            <PixelRack size={240} ratio={0.35} grid={30} mode="board" accent="rose" once fluid />
          </Specimen>
          <Specimen label="gap={0.4}" note="Space between cells, as a fraction of one.">
            <PixelRack size={240} ratio={0.55} grid={26} mode="board" accent="rose" gap={0.4} once fluid />
          </Specimen>
          <Specimen label="speed={2.5}" note="Multiplies the clock.">
            <PixelRack size={240} ratio={0.55} grid={26} mode="board" accent="rose" speed={2.5} once fluid />
          </Specimen>
        </TileGrid>
      </DemoSection>

      <DemoPager slug="marks" />
    </>
  );
}
