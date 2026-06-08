import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";

/**
 * Stripe webhook. For download-only delivery the success page already
 * fulfills the buyer, so this is mainly for record-keeping and sending a
 * backup download email. Wire your email provider where marked.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe || !env.stripeWebhookSecret) {
    return NextResponse.json({ received: true, note: "webhook not configured" });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, env.stripeWebhookSecret);
  } catch (err) {
    console.error("[webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const slug = session.metadata?.slug;
    const email = session.customer_details?.email;
    // TODO: record the order + send a backup download email (Resend/Postmark)
    console.log(`[webhook] paid: ${slug} → ${email}`);
  }

  return NextResponse.json({ received: true });
}
