import Image from "next/image";
import { cn } from "@/lib/utils";
import { cardSurface } from "@/components/home/shared";
import type { Plugin } from "@/lib/plugins";
import type { PluginEntry } from "@/lib/plugin-facts";

/**
 * Section heading in the house idiom: the mono kicker keeps the structural
 * label so the page stays scannable, and the heading underneath says something
 * specific about this instrument. A heading that only names its own slot
 * ("Signature features.") is a heading doing no work.
 */
function Heading({
  kicker,
  meta,
  children,
}: {
  kicker: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <div className="flex items-baseline justify-between gap-4">
        <p className="label">{kicker}</p>
        {meta && <span className="label shrink-0">{meta}</span>}
      </div>
      <h2 className="mt-3 max-w-2xl text-2xl leading-snug font-light tracking-tight text-foreground">
        {children}
      </h2>
    </div>
  );
}

export function WhyItExists({
  heading,
  paragraphs,
}: {
  heading: string;
  paragraphs: string[];
}) {
  return (
    <section className="pb-16">
      <Heading kicker="Why it exists">{heading}</Heading>
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

export function FeatureGrid({
  heading,
  features,
}: {
  heading: string;
  features: Plugin["features"];
}) {
  return (
    <section className="pb-16">
      <Heading kicker="What it does" meta={`${features.length} of them`}>
        {heading}
      </Heading>
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

export function SignalFlow({ heading, diagram }: { heading: string; diagram: string }) {
  return (
    <section className="pb-16">
      <Heading kicker="Signal flow" meta="from the repo">
        {heading}
      </Heading>
      <div className="rounded-2xl border border-border/40 bg-card/40 p-5">
        <pre className="signal-flow">{diagram}</pre>
      </div>
    </section>
  );
}

export function Gallery({ heading, items }: { heading: string; items: Plugin["gallery"] }) {
  if (items.length === 0) return null;
  return (
    <section className="pb-16">
      <Heading kicker="The interface" meta={`${items.length} views`}>
        {heading}
      </Heading>
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

export function Presets({
  heading,
  presets,
}: {
  heading: string;
  presets: NonNullable<Plugin["presets"]>;
}) {
  return (
    <section className="pb-16">
      <Heading kicker="Presets" meta={`${presets.count} factory`}>
        {heading}
      </Heading>
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

export function Specs({ heading, entry }: { heading: string; entry: PluginEntry }) {
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
      <Heading kicker="Specifications" meta={`read from ${facts.commit.slice(0, 7)}`}>
        {heading}
      </Heading>
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

export function State({ heading, state }: { heading: string; state: Plugin["state"] }) {
  return (
    <section className="pb-16">
      <Heading kicker="Where it is">{heading}</Heading>
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
