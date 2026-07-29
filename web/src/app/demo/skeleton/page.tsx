import type { Metadata } from "next";
import { DemoHeader, DemoPager, DemoSection, Mono } from "../_components/demo-ui";
import { toPluginTheme } from "@/design/plugin-theme";
import { DARK, LIGHT } from "@/design/tokens";
import { BLOCKS, BLOCK_STATUS } from "./blocks";

export const metadata: Metadata = {
  title: "Skeleton",
  description:
    "The shared JUCE layer the instruments are built from: one palette, one LookAndFeel, and the blocks a plugin is assembled out of.",
};

const dark = toPluginTheme(DARK);
const light = toPluginTheme(LIGHT);

/**
 * A plugin colour, rendered from the value the plugins actually compile against.
 *
 * These are opaque hex rather than a CSS custom property, which is the point:
 * a `juce::uint32` cannot defer alpha to paint time, so what is shown here is
 * the composited result the C++ receives, not the token it came from.
 */
function PluginSwatch({
  name,
  hex,
  from,
  altHex,
}: {
  name: string;
  hex: string;
  from: string;
  altHex: string;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-border/60 py-2.5">
      <span className="flex shrink-0 overflow-hidden rounded-md border border-border">
        <span aria-hidden className="size-7" style={{ background: `#${hex}` }} />
        <span aria-hidden className="size-7" style={{ background: `#${altHex}` }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[12px] text-foreground">{name}</span>
        <span className="block text-[12px] text-muted-foreground">{from}</span>
      </span>
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
        0xff{hex}
      </span>
    </div>
  );
}

function AccentRow({
  name,
  base,
  soft,
  glow,
}: {
  name: string;
  base: string;
  soft: string;
  glow: string;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-border/60 py-2.5">
      <span className="flex shrink-0 overflow-hidden rounded-md border border-border">
        {[base, soft, glow].map((hex, i) => (
          <span key={i} aria-hidden className="size-7" style={{ background: `#${hex}` }} />
        ))}
      </span>
      <span className="min-w-0 flex-1 font-mono text-[12px] text-foreground">{name}</span>
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
        base · soft · glow
      </span>
    </div>
  );
}

export default function SkeletonPage() {
  return (
    <>
      <DemoHeader
        title="Skeleton."
        lede={
          <>
            The parts of an aka instrument that are not the instrument: one palette, one{" "}
            <Mono>LookAndFeel</Mono>, and the blocks a plugin gets assembled out of. It is a JUCE
            module, consumed by pinned tag the same way JUCE itself is. Everything on this page is
            derived from the same source that writes <Mono>globals.css</Mono>, so it cannot describe
            a palette the plugins are not compiling against.
          </>
        }
        meta={`${BLOCKS.length} blocks · ${dark.chassis.length} chassis colours · 2 themes`}
      />

      <DemoSection
        id="blocks"
        title="Blocks"
        description={
          <>
            What skeleton ships today. The shelf is deliberately short — this is the inventory a
            no-code builder would eventually compose from, and naming what is missing is more
            useful than implying it exists.
          </>
        }
        meta={`${BLOCKS.filter((b) => b.status === "ships").length} of ${BLOCKS.length} shipping`}
      >
        <div className="flex flex-col">
          {BLOCKS.map((block) => (
            <div
              key={block.name}
              className="flex flex-col gap-1 border-t border-border/60 py-3.5 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span className="w-44 shrink-0 font-mono text-[12px] text-foreground">
                {block.name}
              </span>
              <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                {block.blurb}
              </span>
              <span
                className="label shrink-0"
                style={{ color: BLOCK_STATUS[block.status].colour }}
              >
                {BLOCK_STATUS[block.status].label}
              </span>
            </div>
          ))}
        </div>
      </DemoSection>

      <DemoSection
        id="chassis"
        title="Chassis"
        description={
          <>
            The plugin vocabulary, and the site token each colour comes from. Two names for the same
            idea is how the three plugins drifted apart in the first place, so the mapping lives in
            exactly one place and both the C++ emitter and this page read it. Each swatch shows dark
            then light.
          </>
        }
        meta="generated"
      >
        <div className="flex flex-col">
          {dark.chassis.map((c, i) => (
            <PluginSwatch
              key={c.name}
              name={c.name}
              hex={c.hex}
              from={c.from}
              altHex={light.chassis[i]!.hex}
            />
          ))}
        </div>
      </DemoSection>

      <DemoSection
        id="accents"
        title="Accents"
        description={
          <>
            Five accents at three strengths. An instrument picks one and spends no other — the same
            rule the site follows, where each plugin owns exactly one and puts it on a single status
            dot. <Mono>soft</Mono> and <Mono>glow</Mono> are the accent composited over the panel at
            45% and 18%, flattened here because C++ needs an opaque word.
          </>
        }
        meta="dark theme"
      >
        <div className="flex flex-col">
          {dark.accents.map((a) => (
            <AccentRow key={a.name} {...a} />
          ))}
        </div>
      </DemoSection>

      <DemoSection
        id="using"
        title="Using it"
        description="Skeleton lives in the akaVST repository rather than one of its own; a plugin pulls that one directory out of it."
        meta="cmake"
      >
        <pre className="signal-flow rounded-2xl border border-border/40 bg-card/40 p-5">{`FetchContent_Declare(akaVST
    GIT_REPOSITORY https://github.com/akaieuan/akaVST.git
    GIT_TAG skeleton-v0.1.0
    GIT_SUBMODULES ""
    SOURCE_SUBDIR skeleton)
FetchContent_MakeAvailable(akaVST)

target_link_libraries(YourPlugin PRIVATE aka_skeleton)

# then, once, in the editor:
aka::LookAndFeel::setAccent (aka::accentRose);`}</pre>
        <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          <Mono>GIT_SUBMODULES &quot;&quot;</Mono> is not optional: CMake initialises submodules by
          default, so without it a plugin fetching akaVST also clones bleep, enzyme and i4 —
          including whichever one is doing the fetching. The block also has to come after the
          plugin&apos;s own JUCE fetch, since skeleton only fetches JUCE when it cannot already see
          it.
        </p>
      </DemoSection>

      <DemoPager slug="skeleton" />
    </>
  );
}
