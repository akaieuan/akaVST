import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getPlugin } from "@/lib/plugins";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Checkout isn't configured yet. Add your Stripe keys." },
      { status: 503 },
    );
  }

  let slug: string;
  try {
    ({ slug } = await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const plugin = getPlugin(slug);
  if (!plugin || !plugin.priceId) {
    return NextResponse.json(
      { error: "This plugin isn't available for purchase yet." },
      { status: 404 },
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: plugin.priceId, quantity: 1 }],
      // Stripe Tax handles VAT / sales tax automatically (enable it in the dashboard)
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      // carry the product through so the success page knows what to deliver
      metadata: { slug: plugin.slug },
      success_url: `${env.siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.siteUrl}/plugins/${plugin.slug}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 },
    );
  }
}
