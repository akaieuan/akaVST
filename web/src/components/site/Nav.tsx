import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND, NAV_LINKS, type NavActive } from "@/lib/brand";
import { PixelRack } from "@/components/site/PixelRack";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { PLUGIN_ENTRIES } from "@/lib/plugin-facts";

const linkClass = (isActive: boolean) =>
  cn("transition-colors", isActive ? "text-foreground" : "hover:text-foreground");

export function Nav({ active }: { active?: NavActive }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 md:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          {/* The chrome mark: the panel glyph, held still. */}
          <PixelRack size={26} ratio={0.78} grid={13} mode="rack" gap={0.14} still />
          {/* Nothing in this bar shrinks, so below 375px the wordmark is what
              gives way: the mark beside it already stands in for it. */}
          <span className="hidden text-sm font-light tracking-[0.06em] text-foreground min-[375px]:inline">
            {BRAND.name}
          </span>
        </Link>

        <nav className="flex items-center gap-2.5 text-[13px] font-light tracking-[0.06em] text-muted-foreground sm:gap-4 md:gap-6 md:text-sm">
          {/* Plugins, with a CSS-only dropdown revealed on hover or focus. */}
          <div className="group relative">
            <Link
              href="/plugins"
              className={cn(linkClass(active === "plugins"), "inline-flex items-center gap-1")}
            >
              Plugins
              <ChevronDown aria-hidden className="hidden h-3 w-3 opacity-60 md:block" />
            </Link>
            {/* Hover affordance, desktop only. On touch this is a plain link. */}
            <div className="invisible absolute left-0 top-full z-50 hidden w-80 translate-y-1 pt-3 opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 md:block">
              {/* Solid surface: page text must never bleed through. */}
              <div className="flex flex-col gap-0.5 rounded-2xl border border-border bg-popover p-2">
                {PLUGIN_ENTRIES.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/plugins/${p.slug}`}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted"
                  >
                    <span className="mt-1 shrink-0 text-foreground">
                      <PixelRack size={28} ratio={0.7} grid={14} mode={p.mark} gap={0.14} still />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[13px] font-normal tracking-normal text-foreground">
                        {p.name}
                      </span>
                      <span className="font-mono text-[10px] leading-relaxed tracking-normal text-muted-foreground">
                        {p.kind.toLowerCase()} · v{p.facts.version}
                      </span>
                    </span>
                  </Link>
                ))}
                <Link
                  href="/plugins"
                  className="mt-1 rounded-xl px-3 py-2 text-[11px] tracking-normal text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  All three →
                </Link>
              </div>
            </div>
          </div>

          {NAV_LINKS.filter((l) => l.key !== "plugins").map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(active === l.key)}>
              {l.label}
            </Link>
          ))}

          {/* The footer carries GitHub on small screens; the bar stays breathable. */}
          <a
            href={BRAND.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden transition-colors hover:text-foreground sm:inline"
          >
            GitHub ↗
          </a>

          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
