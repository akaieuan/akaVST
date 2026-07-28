import type { Metadata } from "next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { PixelRack, type RackMode } from "@/components/site/PixelRack";
import { Hairline } from "@/components/site/Hairline";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Colophon",
  description:
    "How the akaVST site is built: akaSTYLE tokens, a server-first Next.js app, and one canvas engine whose idle motion is whatever the plugin does.",
};

const MARKS: { mode: RackMode; name: string; note: string }[] = [
  {
    mode: "step",
    name: "step",
    note: "A playhead sweeps the step row, and a sparse set of locks lifts behind it. akaBleep.",
  },
  {
    mode: "layers",
    name: "layers",
    note: "Four bars shearing against each other at unrelated rates. Enzyme.",
  },
  {
    mode: "grain",
    name: "grain",
    note: "A window travelling along a waveform, with a read head plucking grains off its edge. i4.",
  },
  {
    mode: "rack",
    name: "rack",
    note: "The step panel, held still. The chrome mark and the favicon.",
  },
];

function Section({
  index,
  heading,
  children,
}: {
  index: number;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="label mb-3">{String(index).padStart(2, "0")}</p>
      <h2 className="mb-5 text-xl font-light tracking-tight text-foreground">{heading}</h2>
      <div className="flex max-w-2xl flex-col gap-4 text-[15px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

export default function ColophonPage() {
  return (
    <>
      <Nav active="colophon" />

      <main className="mx-auto max-w-5xl px-6 md:px-8">
        <section className="py-20">
          <span className="label block">Colophon</span>
          <h1 className="mt-6 max-w-2xl text-3xl leading-[1.15] font-light tracking-tight text-foreground md:text-4xl">
            How this site is built.
          </h1>
        </section>

        <section className="flex flex-col gap-12 pb-16">
          <Section index={1} heading="akaSTYLE">
            <p>
              The same design language as{" "}
              <a
                href="https://www.akaoss.dev"
                target="_blank"
                rel="noreferrer"
                className="underline-anim text-foreground"
              >
                akaOSS
              </a>
              : mono for structure and sans for prose, uppercase mono kickers labelling every
              section, depth from a 1px border and a translucent fill rather than a shadow, and
              motion that translates and displaces rather than flashing.
            </p>
            <p>
              Everything is greyscale on a warm near-black ground. Each plugin owns exactly one
              accent and spends it on a single dot. Light and dark are both real themes; press D
              to flip.
            </p>
          </Section>

          <Section index={2} heading="Server-first">
            <p>
              Next.js App Router with Tailwind v4 and the shadcn token conventions. Every page and
              every section is a Server Component. The client boundary is drawn as deep in the tree
              as it goes: the theme provider, the theme toggle and the canvas mark, and nothing
              else.
            </p>
            <p>
              The site reads no environment variables and calls no APIs. All four routes are
              statically prerendered.
            </p>
          </Section>

          <Section index={3} heading="Facts come from the plugins">
            <p>
              Versions, formats, plugin codes and platform support are read out of each plugin&rsquo;s
              own CMakeLists and committed as JSON, so the site cannot drift from the builds. Where
              a README and a build disagree, the build wins: i4&rsquo;s README claims a universal
              binary, its CMakeLists does not configure one, and these pages say Apple Silicon.
            </p>
            <p>
              Prose stays hand-written. Only things with a single correct answer are generated.
            </p>
          </Section>

          <Section index={4} heading="One canvas engine">
            <p>
              The marks are a single component, <span className="font-mono text-[13px]">PixelRack</span>
              , built on the same grammar as akaOSS&rsquo;s PixelHead: a deterministic hash PRNG, one
              sampled cell set, an assemble-and-hold timeline, colour resolved from the theme
              foreground and repainted when the theme flips.
            </p>
            <p>
              Where it differs is the point of it. The field is a rounded panel rather than a disc,
              and each plugin&rsquo;s idle motion is what that plugin actually does. Device geometry
              is laid out in whole cells rather than normalized space, and block counts derive from
              the grid, so a row of steps is always two cells on and one off whether it renders at
              26px in the nav or 360px in a hero.
            </p>
            <p>
              i4&rsquo;s wave is carved every frame rather than sampled out once: four detuned
              partials drift against each other while the read position travels, so the window both
              moves along the sample and changes shape as it goes. The loop is gated on an
              IntersectionObserver plus visibilitychange, repaints on theme change even while
              paused, and reduced-motion gets one still frame and no loop at all.
            </p>
          </Section>
        </section>

        <section className="pb-20">
          <Hairline className="mb-12" />
          <span className="label block">The four modes</span>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MARKS.map((mark) => (
              <div
                key={mark.mode}
                className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/40 p-5"
              >
                <PixelRack size={260} ratio={0.5} grid={30} mode={mark.mode} once fluid />
                <div>
                  <p className="font-mono text-[12px] text-foreground">{mark.name}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {mark.note}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            The plugin repositories are proprietary and each carries its own licence. The plugins
            themselves are not yet code-signed or notarised, which is why nothing here offers a
            download.
          </p>
          <p className="mt-4 font-mono text-[11px] text-muted-foreground/70">
            {BRAND.name} · {BRAND.author}
          </p>
        </section>
      </main>

      <Footer />
    </>
  );
}
