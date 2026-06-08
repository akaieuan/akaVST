import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import { getPlugin, pluginSlugs, PLUGINS } from "@/lib/plugins";
import { BuyButton } from "@/components/buy-button";
import { PluginCard } from "@/components/plugin-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return pluginSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const plugin = getPlugin(slug);
  if (!plugin) return {};
  return {
    title: `${plugin.name} — ${plugin.category}`,
    description: plugin.description,
  };
}

export default async function PluginPage({ params }: Params) {
  const { slug } = await params;
  const plugin = getPlugin(slug);
  if (!plugin) notFound();

  const others = PLUGINS.filter((p) => p.slug !== plugin.slug);
  const available = plugin.priceId.length > 0;

  return (
    <div
      style={
        {
          "--brand": plugin.accent,
          "--brand-foreground": plugin.accentForeground,
        } as React.CSSProperties
      }
    >
      {/* hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 brand-glow opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-grid mask-fade-b opacity-25" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14">
          <Link
            href="/#plugins"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            All plugins
          </Link>

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="rounded-full text-xs uppercase tracking-widest"
                >
                  {plugin.category}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  {plugin.version}
                </span>
              </div>

              <h1 className="mt-5 text-balance text-5xl font-semibold tracking-tighter sm:text-6xl">
                {plugin.name}
              </h1>
              <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
                {plugin.tagline}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <BuyButton
                  slug={plugin.slug}
                  price={plugin.price}
                  available={available}
                />
                <Link
                  href={`https://github.com/${plugin.repo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ExternalLink className="size-4" />
                  Changelog
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-1.5">
                {plugin.formats.map((f) => (
                  <Badge
                    key={f}
                    variant="outline"
                    className="rounded-full font-mono text-[10px]"
                  >
                    {f}
                  </Badge>
                ))}
              </div>
            </div>

            {/* artwork / screenshot placeholder */}
            <div className="relative aspect-[16/11] overflow-hidden rounded-2xl border border-border bg-card">
              <div className="absolute inset-0 brand-glow opacity-70" />
              <div className="absolute inset-0 bg-grid opacity-40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <span className="font-mono text-6xl font-semibold tracking-tighter text-[var(--brand)]">
                  {plugin.name.replace(/^aka/, "")}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  screenshot placeholder
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* overview */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <p className="text-pretty text-xl leading-relaxed text-muted-foreground">
            {plugin.longDescription}
          </p>
        </div>
      </section>

      {/* specs */}
      <section className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <dl className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {plugin.specs.map((s) => (
              <div key={s.label}>
                <dt className="text-xs uppercase tracking-widest text-muted-foreground/70">
                  {s.label}
                </dt>
                <dd className="mt-1.5 font-mono text-sm">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* features */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <h2 className="text-balance text-3xl font-semibold tracking-tight">
            What&apos;s inside
          </h2>
          <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {plugin.features.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/15">
                  <Check className="size-3.5 text-[var(--brand)]" />
                </div>
                <div>
                  <h3 className="font-medium">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* buy CTA */}
      <section className="border-b border-border">
        <div className="relative mx-auto max-w-6xl overflow-hidden px-5 py-20 text-center sm:px-8">
          <div className="pointer-events-none absolute inset-0 brand-glow opacity-60" />
          <div className="relative">
            <p className="font-mono text-sm text-muted-foreground">
              {plugin.platform}
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Get {plugin.name}
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-muted-foreground">
              One-time purchase · instant download · {plugin.formats.join(" · ")}
            </p>
            <div className="mt-8 flex justify-center">
              <BuyButton
                slug={plugin.slug}
                price={plugin.price}
                available={available}
              />
            </div>
          </div>
        </div>
      </section>

      {/* more plugins */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">More from aka</h2>
            <Link
              href="/#plugins"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
            </Link>
          </div>
          <Separator className="my-8" />
          <div className="grid gap-6 sm:grid-cols-2">
            {others.map((p) => (
              <PluginCard key={p.slug} plugin={p} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
