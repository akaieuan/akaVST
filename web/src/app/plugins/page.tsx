import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { PixelRack } from "@/components/site/PixelRack";
import { ACCENT_COLORS } from "@/lib/plugins";
import { PLUGIN_ENTRIES, statusLine } from "@/lib/plugin-facts";
import { arrowNudge, cardSurface } from "@/components/home/shared";

export const metadata: Metadata = {
  title: "Plugins",
  description:
    "Three JUCE instruments for macOS: akaBleep, Enzyme and i4. What each one is, what it does, and where it currently stands.",
};

export default function PluginsPage() {
  return (
    <>
      <Nav active="plugins" />

      <main className="mx-auto max-w-5xl px-6 md:px-8">
        <section className="py-20">
          <span className="label block">Plugins</span>
          <h1 className="mt-6 max-w-2xl text-3xl leading-[1.15] font-light tracking-tight text-foreground md:text-4xl">
            Three instruments, at three different stages.
          </h1>
          <p className="mt-6 max-w-2xl leading-relaxed text-muted-foreground">
            Each has its own repository, its own release cadence and its own honest status.
            Version numbers here are read from the build, not written by hand.
          </p>
        </section>

        <section className="pb-16">
          <div className="flex flex-col gap-3">
            {PLUGIN_ENTRIES.map((p) => (
              <Link
                key={p.slug}
                href={`/plugins/${p.slug}`}
                className={cn(cardSurface, "grid grid-cols-1 gap-5 p-6 sm:grid-cols-[auto_1fr]")}
              >
                <div className="shrink-0">
                  <PixelRack size={168} ratio={0.62} grid={26} mode={p.mark} once />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: ACCENT_COLORS[p.accent] }}
                    />
                    <h2 className="text-xl font-light tracking-tight text-foreground">
                      {p.name}
                    </h2>
                    <span className="label ml-1 hidden sm:inline">{p.kind}</span>
                    <ArrowUpRight
                      aria-hidden
                      className={cn(
                        arrowNudge,
                        "ml-auto text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                  </div>

                  <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">
                    {p.oneLiner}
                  </p>
                  <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {statusLine(p)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
