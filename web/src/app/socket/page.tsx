import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { PixelRack } from "@/components/site/rack";
import { Hairline } from "@/components/site/Hairline";
import { ACCENT_COLORS } from "@/lib/plugins";
import { PLUGIN_ENTRIES } from "@/lib/plugin-facts";
import { SOCKET } from "@/lib/socket";
import { arrowNudge, cardSurface } from "@/components/home/shared";
import { DeepDive, FeatureGrid, State, WhyItExists } from "@/components/plugin/Sections";

export const metadata: Metadata = {
  title: `${SOCKET.name} — ${SOCKET.kind}`,
  description: SOCKET.oneLiner,
};

/**
 * Socket's page, built from the same sections as a plugin's.
 *
 * Everything except the hero and the specifications is the shared component —
 * a page that looked different for no reason would suggest Socket is a
 * different kind of thing than it is. What differs is what genuinely differs:
 * there is no version to read from a CMakeLists, no formats, no bundle id, and
 * no gallery, because there is nothing to download yet. The page says so at the
 * top rather than burying it.
 */
export default function SocketPage() {
  const accent = ACCENT_COLORS[SOCKET.accent];

  return (
    <>
      <Nav active="socket" />

      <main className="mx-auto max-w-5xl px-6 md:px-8">
        <section className="grid grid-cols-1 items-center gap-10 py-16 md:grid-cols-[1fr_auto] md:py-20">
          <div>
            {/* The kicker names the category, in the home hero's idiom — "Three
                instruments · macOS · by akaieuan". A page whose kicker reads
                "Tools" has told you the name of its own slot and nothing else. */}
            <span className="label block">Small software · for building VSTs · by akaieuan</span>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-mono text-[11px] text-muted-foreground">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                {SOCKET.name}
              </span>
              {/* The one thing someone arriving here needs first. */}
              <span className="inline-flex items-center rounded-full border border-border px-3 py-1 font-mono text-[11px] text-muted-foreground">
                Coming soon
              </span>
            </div>

            <h1 className="mt-6 max-w-2xl text-3xl leading-[1.15] font-light tracking-tight text-foreground md:text-4xl">
              {SOCKET.oneLiner}
            </h1>

            <p className="mt-6 max-w-2xl font-mono text-[11px] leading-relaxed text-muted-foreground">
              {SOCKET.kind} · {SOCKET.status}
            </p>

            <a
              href={SOCKET.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Built in the open
              <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mx-auto hidden md:block">
            <PixelRack size={300} ratio={0.62} grid={36} mode={SOCKET.mark} accent={SOCKET.accent} once fluid />
          </div>
        </section>

        <WhyItExists heading={SOCKET.headings.why} paragraphs={SOCKET.why} />
        <DeepDive sections={SOCKET.deepDive} />
        <FeatureGrid heading={SOCKET.headings.features} features={SOCKET.features} />

        {/* Written here, not read from a build — which is the opposite of the
            plugin pages and is worth saying rather than quietly matching. */}
        <section className="pb-16">
          <div className="mb-7">
            <div className="flex items-baseline justify-between gap-4">
              <p className="label">Specifications</p>
              <span className="label shrink-0">written, not read</span>
            </div>
            <h2 className="mt-3 max-w-2xl text-2xl leading-snug font-light tracking-tight text-foreground">
              {SOCKET.headings.specs}
            </h2>
          </div>
          <dl className="flex flex-col">
            {SOCKET.specs.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-6 border-t border-border/60 py-3"
              >
                <dt className="label shrink-0">{row.label}</dt>
                <dd className="text-right font-mono text-[12px] text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 font-mono text-[10px] leading-relaxed text-muted-foreground/70">
            The plugin pages read their specifications from a CMakeLists at a commit. Socket has no
            CMakeLists, so these are written by hand — and will be replaced by generated ones when
            there is a build to read them from.
          </p>
        </section>

        <State heading={SOCKET.headings.state} state={SOCKET.state} />

        <section className="pb-20">
          <Hairline className="mb-16" />
          <span className="label block">What it builds</span>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            The three instruments came first, by hand. Socket is the attempt to make the fourth one
            take an afternoon instead of a month — and it shares their engine, so what it builds is
            made of the same parts.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                <p className="mt-3 text-sm leading-relaxed text-foreground/80">{p.oneLiner}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
