import { Hairline } from "@/components/site/Hairline";

const POINTS = [
  {
    heading: "The wiring is the problem",
    body: "Each of these exists because the thing it does was possible already, and miserable. Wiring a synth to a sequencer to a fistful of utilities gets you an acid line; it does not get you something you can perform. The instrument is the part where the wiring disappears.",
  },
  {
    heading: "A reference, not a spec",
    body: "None of these model a specific circuit. Enzyme evokes the Protein's lo-fi bite with bitcrush, sample-rate reduction and waveshaping rather than reproducing a wavetable engine. The reference is a target, not a spec.",
  },
  {
    heading: "Version numbers you can check",
    body: "These are at v0.1, v0.4 and v1.0, and the pages say so. What is finished is listed, what is queued is listed, and where a README overpromises against the build, the build wins.",
  },
];

export function Thesis() {
  return (
    <section className="py-16">
      <Hairline className="mb-16" />
      <span className="label block">How these get made</span>
      <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-3">
        {POINTS.map((point, i) => (
          <div key={point.heading}>
            <p className="label mb-3">{String(i + 1).padStart(2, "0")}</p>
            <h3 className="mb-3 text-lg font-light tracking-tight text-foreground">
              {point.heading}
            </h3>
            <p className="text-[15px] leading-relaxed text-muted-foreground">{point.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
