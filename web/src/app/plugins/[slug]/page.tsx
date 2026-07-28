import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { PixelRack } from "@/components/site/PixelRack";
import { Hairline } from "@/components/site/Hairline";
import { PLUGINS, ACCENT_COLORS } from "@/lib/plugins";
import { PLUGIN_ENTRIES, getPluginEntry } from "@/lib/plugin-facts";
import { arrowNudge, cardSurface } from "@/components/home/shared";
import { PluginHero } from "@/components/plugin/PluginHero";
import {
  DeepDive,
  FeatureGrid,
  Gallery,
  Presets,
  SignalFlow,
  Specs,
  State,
  WhyItExists,
} from "@/components/plugin/Sections";

export function generateStaticParams() {
  return PLUGINS.map((plugin) => ({ slug: plugin.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getPluginEntry(slug);
  if (!entry) return { title: "Not found" };
  return {
    title: `${entry.name} — ${entry.kind}`,
    description: entry.oneLiner,
  };
}

export default async function PluginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getPluginEntry(slug);
  if (!entry) notFound();

  const siblings = PLUGIN_ENTRIES.filter((p) => p.slug !== entry.slug);

  return (
    <>
      <Nav active="plugins" />

      <main className="mx-auto max-w-5xl px-6 md:px-8">
        <PluginHero entry={entry} />

        <WhyItExists paragraphs={entry.why} />
        <DeepDive sections={entry.deepDive} />
        <FeatureGrid features={entry.features} />

        {entry.signalFlow && <SignalFlow diagram={entry.signalFlow} />}
        <Gallery items={entry.gallery} />
        {entry.presets && <Presets presets={entry.presets} />}

        <Specs entry={entry} />
        <State state={entry.state} />

        {/* No buy button, no download. The page ends on what it is and where
            it stands, and points at the other two. */}
        <section className="pb-20">
          <Hairline className="mb-16" />
          <span className="label block">The other two</span>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {siblings.map((p) => (
              <Link key={p.slug} href={`/plugins/${p.slug}`} className={cn(cardSurface, "p-5")}>
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: ACCENT_COLORS[p.accent] }}
                  />
                  <h2 className="text-lg font-light tracking-tight text-foreground">{p.name}</h2>
                  <span className="ml-auto flex items-center gap-3">
                    <PixelRack size={44} ratio={0.62} grid={16} mode={p.mark} once />
                    <ArrowUpRight
                      aria-hidden
                      className={cn(
                        arrowNudge,
                        "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                  </span>
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
