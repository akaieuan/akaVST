import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PixelRack } from "@/components/site/rack";
import { PLUGIN_ENTRIES } from "@/lib/plugin-facts";
import { arrowLink, arrowNudge, primaryCta, reveal, stagger } from "./shared";

export function Hero() {
  const formats = PLUGIN_ENTRIES[0].facts.formats.join(" · ");

  return (
    <section className="grid grid-cols-1 items-center gap-12 py-24 md:grid-cols-[1fr_auto] md:py-32">
      <div>
        <span className={cn("label block", reveal)}>Three instruments · macOS · by akaieuan</span>
        <h1
          className={cn(
            "mt-6 max-w-xl text-lg leading-snug font-light tracking-tight md:text-2xl",
            reveal,
          )}
          style={stagger(1)}
        >
          An acid box, a four-layer synth, and a sampler that eats its own output
          <span className="text-[color:var(--accent-violet)]">.</span>
        </h1>
        <p
          className={cn("mt-5 max-w-md leading-relaxed text-muted-foreground", reveal)}
          style={stagger(2)}
        >
          Built one at a time, in the open, and documented as they go. Every version
          number on this site is read out of the plugin that shipped it.
        </p>

        <div
          className={cn("mt-8 flex flex-wrap items-center gap-5", reveal)}
          style={stagger(3)}
        >
          <a href="#collection" className={primaryCta}>
            See the collection
            <ArrowUpRight aria-hidden className={arrowNudge} />
          </a>
          <Link href="/colophon" className={arrowLink}>
            How this is built
            <ArrowUpRight aria-hidden className={arrowNudge} />
          </Link>
        </div>

        <p
          className={cn("mt-8 font-mono text-[11px] text-muted-foreground", reveal)}
          style={stagger(4)}
        >
          {formats} · none of them are finished
        </p>
      </div>

      {/* The mark: assembles once on first view, then runs its idle motion. */}
      <div className={cn("mx-auto hidden md:block", reveal)} style={stagger(2)}>
        <PixelRack size={360} ratio={0.62} grid={40} mode="collection" accent="violet" once fluid />
      </div>
    </section>
  );
}
