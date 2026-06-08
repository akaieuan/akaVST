import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import { getPlugin, pluginSlugs, PLUGINS, type Plugin } from "@/lib/plugins";
import { BuyButton } from "@/components/buy-button";
import { PluginCard } from "@/components/plugin-card";
import { PluginArtwork } from "@/components/plugin-artwork";
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
      <Hero plugin={plugin} available={available} />
      <Overview plugin={plugin} />
      <Specs plugin={plugin} />
      <Features plugin={plugin} />
      {plugin.signalFlow && <SignalFlow plugin={plugin} />}
      {plugin.gallery.length > 0 && <Gallery plugin={plugin} />}
      {plugin.presets && <Presets plugin={plugin} />}
      <BuyCta plugin={plugin} available={available} />
      <MorePlugins others={others} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Hero({ plugin, available }: { plugin: Plugin; available: boolean }) {
  return (
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

            <ul className="mt-7 space-y-2.5">
              {plugin.highlights.map((h) => (
                <li key={h} className="flex items-start gap-3 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
                  <span className="text-foreground/90">{h}</span>
                </li>
              ))}
            </ul>

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

          <PluginArtwork plugin={plugin} priority />
        </div>
      </div>
    </section>
  );
}

function Overview({ plugin }: { plugin: Plugin }) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <p className="text-pretty text-xl leading-relaxed text-muted-foreground">
          {plugin.overview}
        </p>
      </div>
    </section>
  );
}

function Specs({ plugin }: { plugin: Plugin }) {
  return (
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
  );
}

function Features({ plugin }: { plugin: Plugin }) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <h2 className="text-balance text-3xl font-semibold tracking-tight">
          What&apos;s inside
        </h2>
        <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {plugin.features.map((f, i) => (
            <div key={f.title} className="flex gap-4">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/15 font-mono text-xs text-[var(--brand)]">
                {String(i + 1).padStart(2, "0")}
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
  );
}

function SignalFlow({ plugin }: { plugin: Plugin }) {
  return (
    <section className="border-b border-border bg-card/30">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--brand)]">
          Signal flow
        </h2>
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-background p-5">
          <pre className="font-mono text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
            {plugin.signalFlow}
          </pre>
        </div>
      </div>
    </section>
  );
}

function Gallery({ plugin }: { plugin: Plugin }) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <h2 className="text-balance text-3xl font-semibold tracking-tight">
          A closer look
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {plugin.gallery.map((shot, i) => (
            <figure
              key={shot.src}
              className={i === 0 ? "sm:col-span-2" : undefined}
            >
              <div className="relative overflow-hidden rounded-xl border border-border bg-card">
                <Image
                  src={shot.src}
                  alt={shot.caption}
                  width={1600}
                  height={1000}
                  className="h-auto w-full"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1100px"
                />
              </div>
              <figcaption className="mt-3 text-sm text-muted-foreground">
                {shot.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Presets({ plugin }: { plugin: Plugin }) {
  if (!plugin.presets) return null;
  const { count, note, examples } = plugin.presets;
  return (
    <section className="border-b border-border bg-card/30">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-balance text-3xl font-semibold tracking-tight">
              {count > 0 ? `${count} factory presets` : "Factory presets"}
            </h2>
            <p className="mt-3 max-w-lg text-pretty text-muted-foreground">{note}</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {examples.map((name) => (
            <span
              key={name}
              className="rounded-full border border-border bg-background px-3 py-1.5 font-mono text-xs text-muted-foreground"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function BuyCta({ plugin, available }: { plugin: Plugin; available: boolean }) {
  return (
    <section className="border-b border-border">
      <div className="relative mx-auto max-w-6xl overflow-hidden px-5 py-20 text-center sm:px-8">
        <div className="pointer-events-none absolute inset-0 brand-glow opacity-60" />
        <div className="relative">
          <p className="font-mono text-sm text-muted-foreground">{plugin.platform}</p>
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
  );
}

function MorePlugins({ others }: { others: Plugin[] }) {
  return (
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
  );
}
