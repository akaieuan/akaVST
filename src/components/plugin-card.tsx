import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Plugin } from "@/lib/plugins";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PluginCard({ plugin }: { plugin: Plugin }) {
  return (
    <Link
      href={`/plugins/${plugin.slug}`}
      style={
        {
          "--brand": plugin.accent,
          "--brand-foreground": plugin.accentForeground,
        } as React.CSSProperties
      }
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
        "transition-all duration-300 hover:border-[var(--brand)]/40 hover:-translate-y-1",
      )}
    >
      {/* preview / artwork area */}
      <div className="relative aspect-[16/10] overflow-hidden border-b border-border">
        {plugin.heroImage ? (
          <>
            <Image
              src={plugin.heroImage}
              alt={`${plugin.name} interface`}
              fill
              className="object-cover object-top opacity-90 transition-all duration-300 group-hover:opacity-100 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 380px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 brand-glow opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="absolute inset-0 bg-grid mask-fade-b opacity-40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-5xl font-semibold tracking-tighter text-[var(--brand)] opacity-90 sm:text-6xl">
                {plugin.name.replace(/^aka/i, "")}
              </span>
            </div>
          </>
        )}
        <span className="absolute left-4 top-4 z-10 inline-flex items-center rounded-full bg-background/60 px-2.5 py-1 font-mono text-[11px] text-muted-foreground backdrop-blur">
          {plugin.version}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">{plugin.name}</h3>
            <p className="text-xs uppercase tracking-widest text-muted-foreground/70">
              {plugin.category}
            </p>
          </div>
          <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-all duration-300 group-hover:text-[var(--brand)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>

        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          {plugin.tagline}
        </p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex flex-wrap gap-1.5">
            {plugin.formats.map((f) => (
              <Badge
                key={f}
                variant="secondary"
                className="rounded-full font-mono text-[10px]"
              >
                {f}
              </Badge>
            ))}
          </div>
          <span className="font-mono text-sm font-medium">{plugin.price}</span>
        </div>
      </div>
    </Link>
  );
}
