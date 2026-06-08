import { Download, CheckCircle2, AlertCircle } from "lucide-react";
import { getStripe } from "@/lib/stripe";
import { getPlugin } from "@/lib/plugins";
import { createDownloadToken } from "@/lib/download";
import { ButtonLink } from "@/components/button-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = { searchParams: Promise<{ session_id?: string }> };

export default async function SuccessPage({ searchParams }: SearchParams) {
  const { session_id } = await searchParams;
  const result = await resolvePurchase(session_id);

  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 brand-glow opacity-70"
        style={result.accent ? ({ "--brand": result.accent } as React.CSSProperties) : undefined}
      />
      <div className="relative mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-5 py-24 text-center">
        {result.ok ? (
          <>
            <div className="flex size-14 items-center justify-center rounded-full bg-[var(--brand)]/15">
              <CheckCircle2 className="size-7 text-[var(--brand)]" />
            </div>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight">
              Thank you — you&apos;re all set.
            </h1>
            <p className="mt-3 text-pretty text-muted-foreground">
              Your copy of{" "}
              <span className="font-medium text-foreground">{result.name}</span>{" "}
              is ready. Your download link is also on its way to your email.
            </p>
            <a
              href={`/api/download/${result.token}`}
              download
              className={cn(buttonVariants({ size: "lg" }), "mt-8 rounded-full")}
            >
              <Download className="size-4" />
              Download {result.name}
            </a>
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              Link valid for 24 hours · macOS · VST3 · AU · Standalone
            </p>
          </>
        ) : (
          <>
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <AlertCircle className="size-7 text-muted-foreground" />
            </div>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight">
              {result.title}
            </h1>
            <p className="mt-3 text-pretty text-muted-foreground">{result.message}</p>
            <ButtonLink
              variant="secondary"
              size="lg"
              className="mt-8 rounded-full"
              href="/#plugins"
            >
              Back to plugins
            </ButtonLink>
          </>
        )}
      </div>
    </section>
  );
}

type Resolved =
  | { ok: true; name: string; token: string; accent: string }
  | { ok: false; title: string; message: string; accent?: string };

async function resolvePurchase(sessionId?: string): Promise<Resolved> {
  if (!sessionId) {
    return {
      ok: false,
      title: "No order found",
      message: "We couldn't find a checkout session. If you just paid, check your email for the download link.",
    };
  }

  const stripe = getStripe();
  if (!stripe) {
    return {
      ok: false,
      title: "Almost there",
      message: "Payments aren't configured on this deployment yet, so there's nothing to fulfill.",
    };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return {
        ok: false,
        title: "Payment not completed",
        message: "This order hasn't been paid. If you think this is an error, contact support.",
      };
    }
    const slug = session.metadata?.slug ?? "";
    const plugin = getPlugin(slug);
    if (!plugin) {
      return {
        ok: false,
        title: "Order received",
        message: "We couldn't match this order to a product. Please contact support and we'll sort it out.",
      };
    }
    return {
      ok: true,
      name: plugin.name,
      token: createDownloadToken(plugin.slug),
      accent: plugin.accent,
    };
  } catch (err) {
    console.error("[success]", err);
    return {
      ok: false,
      title: "Something went wrong",
      message: "We couldn't verify your order right now. Your download link is in your email as a backup.",
    };
  }
}
