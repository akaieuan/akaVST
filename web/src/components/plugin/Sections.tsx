import Image from "next/image";
import { cn } from "@/lib/utils";
import { cardSurface } from "@/components/home/shared";
import type { Plugin } from "@/lib/plugins";
import type { PluginEntry } from "@/lib/plugin-facts";

/** Section heading in the house idiom: light, tight, ends on a full stop. */
function Heading({ children, meta }: { children: React.ReactNode; meta?: string }) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-4">
      <h2 className="text-2xl font-light tracking-tight text-foreground">{children}</h2>
      {meta && <span className="label shrink-0">{meta}</span>}
    </div>
  );
}

export function WhyItExists({ paragraphs }: { paragraphs: string[] }) {
  return (
    <section className="pb-16">
      <Heading>Why it exists.</Heading>
      <div className="flex max-w-2xl flex-col gap-5">
        {paragraphs.map((para, i) => (
          <p key={i} className="leading-relaxed text-muted-foreground">
            {para}
          </p>
        ))}
      </div>
    </section>
  );
}

export function DeepDive({ sections }: { sections: Plugin["deepDive"] }) {
  if (sections.length === 0) return null;
  return (
    <section className="pb-16">
      <div className="flex flex-col gap-12">
        {sections.map((section, i) => (
          <div key={section.heading}>
            <p className="label mb-3">{String(i + 1).padStart(2, "0")}</p>
            <h3 className="mb-5 text-xl font-light tracking-tight text-foreground">
              {section.heading}
            </h3>
            <div className="flex max-w-2xl flex-col gap-4">
              {section.paragraphs.map((para, j) => (
                <p key={j} className="text-[15px] leading-relaxed text-muted-foreground">
                  {para}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FeatureGrid({ features }: { features: Plugin["features"] }) {
  return (
    <section className="pb-16">
      <Heading meta={`${features.length} features`}>Signature features.</Heading>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className={cn(cardSurface, "flex flex-col gap-2 p-5")}>
            <h3 className="text-lg font-light tracking-tight text-foreground">
              {feature.title}
            </h3>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SignalFlow({ diagram }: { diagram: string }) {
  return (
    <section className="pb-16">
      <Heading meta="from the repo">Signal flow.</Heading>
      <div className="rounded-2xl border border-border/40 bg-card/40 p-5">
        <pre className="signal-flow">{diagram}</pre>
      </div>
    </section>
  );
}

export function Gallery({ items }: { items: Plugin["gallery"] }) {
  if (items.length === 0) return null;
  return (
    <section className="pb-16">
      <Heading meta={`${items.length} views`}>The interface.</Heading>
      <div className="flex flex-col gap-8">
        {items.map((item, i) => (
          <figure key={item.src}>
            <div className="overflow-hidden rounded-2xl border border-border/40">
              <Image
                src={item.src}
                alt={item.caption}
                width={1600}
                height={760}
                priority={i === 0}
                sizes="(min-width: 1024px) 64rem, 100vw"
                className="h-auto w-full"
              />
            </div>
            <figcaption className="mt-3 font-mono text-[11px] text-muted-foreground">
              {item.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function Presets({ presets }: { presets: NonNullable<Plugin["presets"]> }) {
  return (
    <section className="pb-16">
      <Heading meta={`${presets.count} factory`}>Presets.</Heading>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {presets.note}
      </p>
      <div className="flex flex-wrap gap-2">
        {presets.examples.map((name) => (
          <span
            key={name}
            className="rounded-full border border-border/60 px-3 py-1 font-mono text-[11px] text-muted-foreground"
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}

export function Specs({ entry }: { entry: PluginEntry }) {
  const { facts } = entry;
  const rows: { label: string; value: string }[] = [
    { label: "Version", value: `v${facts.version}` },
    { label: "Loads as", value: facts.productName },
    { label: "Formats", value: facts.formats.join(" · ") },
    { label: "Category", value: facts.categories.join(" · ") },
    { label: "Platform", value: facts.platform },
    ...entry.specs,
    { label: "Bundle ID", value: facts.bundleId },
    { label: "Plugin code", value: `${facts.manufacturerCode} / ${facts.pluginCode}` },
  ];

  return (
    <section className="pb-16">
      <Heading meta={`from ${facts.commit.slice(0, 7)}`}>Specifications.</Heading>
      <dl className="flex flex-col">
        {rows.map((row) => (
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
        Version, formats, codes and platform are read from the plugin&rsquo;s own CMakeLists at
        the commit above, not retyped here.
      </p>
    </section>
  );
}

export function State({ state }: { state: Plugin["state"] }) {
  return (
    <section className="pb-16">
      <Heading>Where it is.</Heading>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <p className="label mb-4">Shipping</p>
          <ul className="flex flex-col gap-2.5">
            {state.shipping.map((item) => (
              <li key={item} className="flex gap-3 text-[14px] leading-relaxed text-muted-foreground">
                <span aria-hidden className="mt-2 h-px w-3 shrink-0 bg-border-strong" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="label mb-4">Next</p>
          <ul className="flex flex-col gap-2.5">
            {state.next.map((item) => (
              <li key={item} className="flex gap-3 text-[14px] leading-relaxed text-muted-foreground">
                <span aria-hidden className="mt-2 h-px w-3 shrink-0 bg-border-strong" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
