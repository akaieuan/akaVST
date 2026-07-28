import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardSurface, arrowNudge } from "@/components/home/shared";
import { PixelRack } from "@/components/site/rack";
import { DemoHeader } from "./_components/demo-ui";
import { DEMO_SECTIONS } from "./_components/sections";

export const metadata: Metadata = {
  title: "Brand system",
  description:
    "How the akaVST site is built: akaSTYLE tokens, a server-first Next.js app, and one canvas engine whose idle motion is whatever the instrument does.",
};

export default function DemoPage() {
  return (
    <>
      <DemoHeader
        title="What this site is made of."
        lede={
          <>
            Every specimen here renders the shipped component, not a picture of one, and the token
            page reads <code className="font-mono text-[13px]">globals.css</code> at build time. A
            design system that keeps its own copy of itself goes wrong quietly, in the
            documentation, which is the worst place for it.
          </>
        }
        meta="Reachable from the footer and by URL. Not in the header."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {DEMO_SECTIONS.map((section) => (
          <Link
            key={section.slug}
            href={`/demo/${section.slug}`}
            className={cn(cardSurface, "flex flex-col gap-3 p-5")}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-light tracking-tight text-foreground">
                {section.title}
              </h2>
              <ArrowUpRight
                aria-hidden
                className={cn(arrowNudge, "text-muted-foreground group-hover:text-foreground")}
              />
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{section.blurb}</p>
            <p className="mt-auto pt-2 font-mono text-[10px] leading-relaxed text-muted-foreground/70">
              {section.contents.join(" · ")}
            </p>
          </Link>
        ))}
      </div>

      <section className="mt-14 flex flex-col gap-10 border-t border-border/60 pt-12">
        <div>
          <p className="label mb-3">01</p>
          <h2 className="mb-5 text-xl font-light tracking-tight text-foreground">akaSTYLE</h2>
          <div className="flex max-w-2xl flex-col gap-4 text-[15px] leading-relaxed text-muted-foreground">
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
              Everything is greyscale on a warm near-black ground. Each instrument owns exactly one
              accent and spends it inside its own mark. Light and dark are both real themes; press
              D to flip.
            </p>
          </div>
        </div>

        <div>
          <p className="label mb-3">02</p>
          <h2 className="mb-5 text-xl font-light tracking-tight text-foreground">Server-first</h2>
          <div className="flex max-w-2xl flex-col gap-4 text-[15px] leading-relaxed text-muted-foreground">
            <p>
              Next.js App Router with Tailwind v4 and the shadcn token conventions. Every page and
              every section is a Server Component. The client boundary is drawn as deep in the tree
              as it goes: the theme provider, the theme toggle and the canvas mark, and nothing
              else.
            </p>
            <p>The site reads no environment variables and calls no APIs. Every route is static.</p>
          </div>
        </div>

        <div>
          <p className="label mb-3">03</p>
          <h2 className="mb-5 text-xl font-light tracking-tight text-foreground">
            Facts come from the plugins
          </h2>
          <div className="flex max-w-2xl flex-col gap-4 text-[15px] leading-relaxed text-muted-foreground">
            <p>
              Versions, formats, plugin codes and platform support are read out of each
              instrument&rsquo;s own CMakeLists and committed as JSON, so the site cannot drift from
              the builds. Where a README and a build disagree, the build wins: i4&rsquo;s README
              claims a universal binary, its CMakeLists does not configure one, and these pages say
              Apple Silicon.
            </p>
            <p>Prose stays hand-written. Only things with a single correct answer are generated.</p>
          </div>
        </div>

        <div>
          <p className="label mb-3">04</p>
          <h2 className="mb-5 text-xl font-light tracking-tight text-foreground">
            One canvas engine
          </h2>
          <div className="flex max-w-2xl flex-col gap-4 text-[15px] leading-relaxed text-muted-foreground">
            <p>
              Every mark is <code className="font-mono text-[13px]">PixelRack</code>, built on the
              same grammar as akaOSS&rsquo;s PixelHead: a deterministic hash PRNG, one sampled cell
              set, an assemble-and-hold timeline, colour resolved from the theme and repainted when
              the theme flips.
            </p>
            <p>
              What is its own is that each instrument gets a device whose idle motion is what that
              instrument actually does, and that all geometry is laid out in whole cells, so the
              same component reads correctly at 26px in the nav and 360px in a hero.
            </p>
          </div>
          <div className="mt-7">
            <PixelRack size={520} ratio={0.42} grid={46} mode="collection" accent="violet" once fluid />
          </div>
        </div>
      </section>

      <p className="mt-14 max-w-2xl border-t border-border/60 pt-8 text-[13px] leading-relaxed text-muted-foreground">
        The plugin repositories are proprietary and each carries its own licence. The plugins
        themselves are not yet code-signed or notarised, which is why nothing here offers a
        download.
      </p>
    </>
  );
}
