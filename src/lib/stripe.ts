import Stripe from "stripe";
import { env, stripeConfigured } from "@/lib/env";

let _stripe: Stripe | null = null;

/** Lazily-constructed Stripe client. Returns null if not configured. */
export function getStripe(): Stripe | null {
  if (!stripeConfigured) return null;
  if (!_stripe) {
    // omit apiVersion to use the account default and avoid version-literal drift
    _stripe = new Stripe(env.stripeSecretKey);
  }
  return _stripe;
}
