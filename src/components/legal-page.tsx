export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-2xl px-5 py-20 sm:px-8 sm:py-24">
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 font-mono text-xs text-muted-foreground">
        Last updated {updated} · placeholder copy — replace before launch
      </p>
      <div className="mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:text-base [&_h2]:font-medium [&_h2]:text-foreground">
        {children}
      </div>
    </section>
  );
}
