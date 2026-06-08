import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { PLUGINS } from "@/lib/plugins";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Wordmark />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {site.description}
            </p>
          </div>

          <FooterCol title="Plugins">
            {PLUGINS.map((p) => (
              <FooterLink key={p.slug} href={`/plugins/${p.slug}`}>
                {p.name}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title="Studio">
            <FooterLink href="/#about">About</FooterLink>
            <FooterLink href="/#faq">FAQ</FooterLink>
            <FooterLink href={site.github}>GitHub</FooterLink>
          </FooterCol>

          <FooterCol title="Legal">
            <FooterLink href="/terms">Terms</FooterLink>
            <FooterLink href="/refund">Refund policy</FooterLink>
            <FooterLink href="/license">License (EULA)</FooterLink>
          </FooterCol>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} akaieuan. All rights reserved.</p>
          <p className="font-mono text-xs">macOS · VST3 · AU · Standalone</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
        {title}
      </h3>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http");
  return (
    <li>
      <Link
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {children}
      </Link>
    </li>
  );
}
