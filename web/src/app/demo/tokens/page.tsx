import type { Metadata } from "next";
import { DemoHeader, DemoPager, DemoSection, Mono } from "../_components/demo-ui";
import { readTokenTables, type TokenTable } from "../_components/tokens";

export const metadata: Metadata = {
  title: "Tokens · Brand system",
  description:
    "The akaVST palette as swatches, read out of globals.css at build time so the page cannot drift from the stylesheet.",
};

const GROUPS: { id: string; title: string; note: string; tokens: string[] }[] = [
  {
    id: "surfaces",
    title: "Surfaces",
    note: "Hierarchy comes from alpha, not hue. Every surface sits on the same 107 hue at near-zero chroma, so nothing reads tinted.",
    tokens: ["--background", "--card", "--popover", "--muted", "--secondary", "--accent"],
  },
  {
    id: "lines",
    title: "Lines and borders",
    note: "Depth is a border, never a shadow. Card borders are alpha over the ground so they work on either theme.",
    tokens: ["--border", "--border-strong", "--card-border", "--card-border-hover", "--hairline", "--input", "--ring"],
  },
  {
    id: "text",
    title: "Text",
    note: "Two weights of text and their inverses. Body copy is muted; headings take the full foreground.",
    tokens: ["--foreground", "--muted-foreground", "--primary", "--primary-foreground", "--card-foreground"],
  },
  {
    id: "accents",
    title: "Accents",
    note: "Punctuation, never fills. Each instrument owns exactly one and spends it inside its own mark; violet belongs to the collection.",
    tokens: ["--accent-rose", "--accent-blue", "--accent-amber", "--accent-violet", "--accent-green"],
  },
];

function Swatch({ token, value }: { token: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-t border-border/60 py-2.5">
      <span
        aria-hidden
        className="size-7 shrink-0 rounded-md border border-border"
        style={{ background: `var(${token})` }}
      />
      <span className="min-w-0 flex-1 font-mono text-[12px] text-foreground">{token}</span>
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{value}</span>
    </div>
  );
}

function Group({
  title,
  note,
  tokens,
  table,
  id,
}: {
  id: string;
  title: string;
  note: string;
  tokens: string[];
  table: TokenTable;
}) {
  return (
    <DemoSection id={id} title={title} description={note} meta={`${tokens.length} tokens`}>
      <div className="flex flex-col">
        {tokens.map((token) => (
          <Swatch key={token} token={token} value={table[token] ?? "not declared"} />
        ))}
      </div>
    </DemoSection>
  );
}

export default async function TokensPage() {
  // Read at build time. A palette page that keeps its own copy of the palette
  // will eventually be wrong, and wrong where nobody looks.
  const { dark } = await readTokenTables();

  return (
    <>
      <DemoHeader
        title="Tokens."
        lede={
          <>
            Parsed out of <Mono>globals.css</Mono> when the page is built, so these values cannot
            drift from the stylesheet. Swatches render the live custom property, so they follow
            whichever theme you are in; the printed values are the dark-theme declarations.
          </>
        }
        meta={`${Object.keys(dark).length} declared in .dark`}
      />

      {GROUPS.map((g) => (
        <Group key={g.id} {...g} table={dark} />
      ))}

      <DemoSection
        id="radius"
        title="Radius"
        description="One --radius drives the whole scale. Cards get their own larger --radius-card."
        meta="derived"
      >
        <div className="flex flex-wrap gap-4">
          {(["sm", "md", "lg", "xl", "2xl", "3xl"] as const).map((step) => (
            <div key={step} className="flex flex-col items-center gap-2">
              <div
                className="size-16 border border-border bg-card"
                style={{ borderRadius: `var(--radius-${step})` }}
              />
              <span className="font-mono text-[11px] text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
      </DemoSection>

      <DemoPager slug="tokens" />
    </>
  );
}
