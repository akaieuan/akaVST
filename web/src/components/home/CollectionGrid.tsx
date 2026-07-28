import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PixelRack } from "@/components/site/rack";
import { ACCENT_COLORS } from "@/lib/plugins";
import { PLUGIN_ENTRIES, statusLine } from "@/lib/plugin-facts";
import { arrowNudge, cardSurface } from "./shared";

export function CollectionGrid() {
  return (
    <section id="collection" className="scroll-mt-16 pt-4 pb-16">
      <span className="label block">The collection</span>
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {PLUGIN_ENTRIES.map((p) => (
          <Link key={p.slug} href={`/plugins/${p.slug}`} className={cn(cardSurface, "p-5")}>
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: ACCENT_COLORS[p.accent] }}
              />
              <h2 className="text-lg font-light tracking-tight text-foreground">{p.name}</h2>
              <ArrowUpRight
                aria-hidden
                className={cn(arrowNudge, "ml-auto text-muted-foreground group-hover:text-foreground")}
              />
            </div>

            <div className="mt-4">
              <PixelRack size={280} ratio={0.5} grid={32} mode={p.mark} accent={p.accent} once fluid />
            </div>

            <p className="mt-4 text-sm leading-relaxed text-foreground/80">{p.oneLiner}</p>
            <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {statusLine(p)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
