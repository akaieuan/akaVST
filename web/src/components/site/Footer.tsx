import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { PLUGIN_ENTRIES } from "@/lib/plugin-facts";
import { Hairline } from "@/components/site/Hairline";

export function Footer() {
  return (
    <footer className="mt-24">
      <Hairline />
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-2">
            <span className="label">{BRAND.name}</span>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              {BRAND.description}
            </p>
          </div>

          <div>
            <span className="label">Plugins</span>
            <ul className="mt-3 flex flex-col gap-2">
              {PLUGIN_ENTRIES.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/plugins/${p.slug}`}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="label">Elsewhere</span>
            <ul className="mt-3 flex flex-col gap-2">
              <li>
                <Link
                  href="/colophon"
                  className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Colophon
                </Link>
              </li>
              <li>
                <a
                  href={BRAND.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  GitHub ↗
                </a>
              </li>
              <li>
                <a
                  href="https://www.akaoss.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  akaOSS ↗
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-12 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground/70">
          © {new Date().getFullYear()} {BRAND.author} · press D to flip the theme
        </p>
      </div>
    </footer>
  );
}
