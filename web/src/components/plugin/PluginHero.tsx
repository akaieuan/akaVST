import Link from "next/link";
import { PixelRack } from "@/components/site/PixelRack";
import { ACCENT_COLORS } from "@/lib/plugins";
import { statusLine, type PluginEntry } from "@/lib/plugin-facts";

export function PluginHero({ entry }: { entry: PluginEntry }) {
  const accent = ACCENT_COLORS[entry.accent];

  return (
    <section className="grid grid-cols-1 items-center gap-10 py-16 md:grid-cols-[1fr_auto] md:py-20">
      <div>
        <div className="mb-6 flex items-center gap-3">
          <Link href="/plugins" className="label transition-colors hover:text-foreground">
            Plugins
          </Link>
          <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-mono text-[11px] text-muted-foreground">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: accent }}
            />
            {entry.name}
          </span>
        </div>

        <h1 className="max-w-2xl text-3xl leading-[1.15] font-light tracking-tight text-foreground md:text-4xl">
          {entry.oneLiner}
        </h1>

        <p className="mt-6 max-w-2xl font-mono text-[11px] leading-relaxed text-muted-foreground">
          {statusLine(entry)}
        </p>

        {entry.lineage.length > 0 && (
          <p className="mt-3 max-w-2xl font-mono text-[11px] leading-relaxed text-muted-foreground/70">
            after {entry.lineage.join(" · ")}
          </p>
        )}
      </div>

      <div className="mx-auto hidden md:block">
        <PixelRack size={300} ratio={0.62} grid={36} mode={entry.mark} once fluid />
      </div>
    </section>
  );
}
