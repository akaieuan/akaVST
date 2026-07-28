import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Hairline } from "@/components/site/Hairline";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { arrowLink, arrowNudge, cardSurface, primaryCta, reveal, stagger } from "@/components/home/shared";
import { DemoHeader, DemoPager, DemoSection, Mono, TileGrid, Well } from "../_components/demo-ui";

export const metadata: Metadata = {
  title: "Primitives · Brand system",
  description:
    "The small site-level helpers and the class idioms that carry every card, label and link on the akaVST site.",
};

export default function PrimitivesPage() {
  return (
    <>
      <DemoHeader
        title="Primitives."
        lede={
          <>
            Small enough that most of them are a class string rather than a component. They live in{" "}
            <Mono>components/home/shared.ts</Mono> so a section can import an idiom instead of
            retyping it and drifting.
          </>
        }
      />

      <DemoSection
        id="hairline"
        title="Hairline"
        meta="component"
        description="An edge-fading horizontal divider, quieter than a full-width border. Used between landing sections and above the footer."
      >
        <Well className="block">
          <Hairline />
        </Well>
      </DemoSection>

      <DemoSection
        id="theme-toggle"
        title="ThemeToggle"
        meta="client"
        description="Both icons ship and CSS picks one, rather than a mounted flag picking it in JS: no hydration mismatch, no first-paint flash, and no reflow in the nav row. D flips the theme from anywhere."
      >
        <Well>
          <ThemeToggle />
        </Well>
      </DemoSection>

      <DemoSection
        id="label"
        title=".label"
        meta="class"
        description="The micro-label: mono, 11px, 0.18em tracking, uppercase, muted. It labels every section on the site, and on plugin pages it carries the structural name so the heading beside it can say something specific instead."
      >
        <Well className="flex-col gap-3">
          <span className="label">Why it exists</span>
          <span className="label">39 factory</span>
          <span className="label">read from 05a5d67</span>
        </Well>
      </DemoSection>

      <DemoSection
        id="surfaces"
        title="Card surfaces"
        meta="class"
        description="Depth is a 1px border and a translucent fill, never a shadow. The hover state brightens the border and lifts the card a single pixel."
      >
        <TileGrid cols={2}>
          <div className={cn(cardSurface, "p-5")}>
            <p className="text-sm text-foreground">cardSurface</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Hover me. Border brightens, card lifts 1px.
            </p>
          </div>
          <div className="card-surface p-5">
            <p className="text-sm text-foreground">.card-surface</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              The CSS twin, for markup that is not a Tailwind call site.
            </p>
          </div>
        </TileGrid>
      </DemoSection>

      <DemoSection
        id="links"
        title="Link idioms"
        meta="class"
        description="Three of them, and an arrow that nudges up and to the right on hover."
      >
        <Well className="flex-col items-start gap-5">
          <a href="#links" className={primaryCta}>
            primaryCta
            <ArrowUpRight aria-hidden className={arrowNudge} />
          </a>
          <Link href="/demo" className={arrowLink}>
            arrowLink
            <ArrowUpRight aria-hidden className={arrowNudge} />
          </Link>
          <a href="#links" className="underline-anim text-sm text-foreground">
            .underline-anim
          </a>
        </Well>
      </DemoSection>

      <DemoSection
        id="entrance"
        title="Entrance"
        meta="reveal · stagger"
        description="A light fade and rise, motion-safe only, with a 120ms top-to-bottom stagger. Reload the page to see it again."
      >
        <Well className="flex-col items-start gap-2">
          {[0, 1, 2, 3].map((step) => (
            <p
              key={step}
              className={cn("font-mono text-[12px] text-muted-foreground", reveal)}
              style={stagger(step)}
            >
              stagger({step})
            </p>
          ))}
        </Well>
      </DemoSection>

      <DemoPager slug="primitives" />
    </>
  );
}
