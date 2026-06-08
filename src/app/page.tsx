import Link from "next/link";
import { ArrowRight, Cpu, Zap, ShieldCheck } from "lucide-react";
import { PLUGINS } from "@/lib/plugins";
import { PluginCard } from "@/components/plugin-card";
import { ButtonLink } from "@/components/button-link";
import { GradientText } from "@/components/gradient-text";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Home() {
  return (
    <>
      <Hero />
      <Plugins />
      <Why />
      <About />
      <Faq />
      <CtaStrip />
    </>
  );
}

/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 brand-glow opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-grid mask-fade-b opacity-30" />
      <div className="pointer-events-none absolute inset-0 scanlines opacity-50 mask-fade-b" />
      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-24 sm:px-8 sm:pb-32 sm:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <Link
            href="#plugins"
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/40 px-3 py-1 font-mono text-[11px] font-light uppercase tracking-digital text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
          >
            <span className="inline-block size-1.5 rounded-full bg-[var(--brand)] motion-safe:animate-pulse" />
            {PLUGINS.length} instruments · macOS · native
          </Link>

          <h1 className="mt-7 text-balance text-5xl font-light leading-[0.95] tracking-tighter sm:text-7xl">
            <GradientText>Instruments built</GradientText>
            <br />
            <GradientText variant="brand">to be performed.</GradientText>
          </h1>

          <p className="mx-auto mt-7 max-w-lg text-pretty text-lg font-light leading-relaxed text-muted-foreground">
            Synths and samplers for macOS, built to be played live. Native on
            Apple Silicon. No subscriptions.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink size="lg" className="rounded-full" href="#plugins">
              Browse plugins
              <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink
              size="lg"
              variant="ghost"
              className="rounded-full font-mono text-xs font-light uppercase tracking-digital text-muted-foreground"
              href="#about"
            >
              About
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function Plugins() {
  return (
    <section id="plugins" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <SectionHeading
          eyebrow="The collection"
          title="Three plugins. One philosophy."
          desc="Each one folds a whole workflow into a single window you can play live."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PLUGINS.map((p) => (
            <PluginCard key={p.slug} plugin={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Why() {
  const items = [
    {
      icon: Cpu,
      title: "Native Apple Silicon",
      body: "Universal binaries that pass auval and run native on M-series or Intel. No Rosetta tax, with correct tail and latency reporting.",
    },
    {
      icon: Zap,
      title: "Real-time safe",
      body: "No allocation, locks, or I/O on the audio thread. Lock-free metering, denormal-safe processing, click-free automation.",
    },
    {
      icon: ShieldCheck,
      title: "Buy once, own it",
      body: "One-time purchase, instant download, no account or subscription. Free updates within a major version.",
    },
  ];
  return (
    <section className="border-t border-border bg-card/30">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="grid gap-8 md:grid-cols-3">
          {items.map((it) => (
            <div key={it.title} className="space-y-3">
              <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-background">
                <it.icon className="size-5 text-[var(--brand)]" />
              </div>
              <h3 className="text-base font-medium">{it.title}</h3>
              <p className="text-sm font-light leading-relaxed text-muted-foreground">
                {it.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-2">
        <SectionHeading
          eyebrow="About"
          title="One person, building the tools they wanted to play."
          align="left"
        />
        <div className="space-y-5 text-pretty text-base font-light leading-relaxed text-muted-foreground">
          {/* PLACEHOLDER copy, swap for your real story */}
          <p>
            aka is a small studio making instruments for the kind of music
            where one mutating line is the track. Every plugin is built in JUCE
            and C++, designed to be dialled in fast and performed live rather
            than clicked together from a rack of utilities.
          </p>
          <p>
            No telemetry, no cloud, no subscription. You buy it, you download
            it, it is yours. This page is a placeholder, so swap in your own
            story whenever you are ready.
          </p>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const faqs = [
    {
      q: "What formats and platforms are supported?",
      a: "Every plugin ships as VST3, AU, and Standalone for macOS 11 and later, as a universal binary that runs native on Apple Silicon and Intel.",
    },
    {
      q: "How does delivery work?",
      a: "After checkout you are taken straight to a download page, no account needed. You also get an email with a backup download link.",
    },
    {
      q: "Do I need a license key?",
      a: "No. Purchases are download-only, so you just install and play. (Placeholder answer; update if this changes.)",
    },
    {
      q: "What is your refund policy?",
      a: "Because these are instantly-downloadable digital goods, sales are generally final. See the refund policy page for details.",
    },
    {
      q: "Will there be a Windows version?",
      a: "Currently macOS only. Placeholder answer, update with your roadmap.",
    },
  ];
  return (
    <section id="faq" className="scroll-mt-20 border-t border-border bg-card/30">
      <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-24">
        <SectionHeading eyebrow="FAQ" title="Questions, answered." />
        <Accordion className="mt-10 w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-normal">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm font-light leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function CtaStrip() {
  return (
    <section className="border-t border-border">
      <div className="relative mx-auto max-w-6xl overflow-hidden px-5 py-24 text-center sm:px-8">
        <div className="pointer-events-none absolute inset-0 brand-glow opacity-60" />
        <div className="relative">
          <GradientText
            as="h2"
            className="text-balance text-3xl font-light tracking-tight sm:text-4xl"
          >
            Find your next sound.
          </GradientText>
          <p className="mx-auto mt-4 max-w-md font-light text-muted-foreground">
            Three instruments, one-time purchase, instant download.
          </p>
          <ButtonLink size="lg" className="mt-8 rounded-full" href="#plugins">
            Browse plugins
            <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  desc,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-md"}>
      <p className="font-mono text-[11px] font-light uppercase tracking-digital text-[var(--brand)]">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-balance text-3xl font-light tracking-tight sm:text-4xl">
        {title}
      </h2>
      {desc && (
        <p className="mt-4 text-pretty font-light text-muted-foreground">{desc}</p>
      )}
    </div>
  );
}
