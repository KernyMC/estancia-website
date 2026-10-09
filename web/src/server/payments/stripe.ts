/**
 * Stripe adapter: client singleton + Checkout Session creation.
 *
 * Rules followed (from the official stripe-best-practices skill):
 *   - API version pinned explicitly.
 *   - NO `payment_method_types` — omitting it enables dynamic payment
 *     methods configured from the Dashboard.
 *   - `integration_identifier` tags sessions for Dashboard analytics.
 */
import Stripe from 'stripe';
import { env } from '../env';
import type { QuotedCart } from '../pricing/pricing';
import type { CustomerInput } from '../orders/orders';
import type { CheckoutResult, PaymentProvider } from './provider';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia',
});

/** Stable per-process label with the random 8-letter suffix Stripe asks for. */
const INTEGRATION_IDENTIFIER = `gab-checkout-${randomLetters(8)}`;

function randomLetters(n: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  return Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * 26)]).join('');
}

async function createCheckout(cart: QuotedCart, customer: CustomerInput): Promise<CheckoutResult> {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: customer.email,
    line_items: cart.items.map((quote) => ({
      quantity: 1,
      price_data: {
        currency: cart.currency,
        unit_amount: quote.amountCents,
        product_data: {
          name: quote.itemName,
          description: quote.description,
        },
      },
    })),
    metadata: {
      itemCount: String(cart.items.length),
      // Stripe metadata values cap at 500 chars and don't accept arrays.
      itemSlugs: cart.items.map((q) => q.itemSlug).join(',').slice(0, 500),
    },
    success_url: `${env.PUBLIC_SITE_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.PUBLIC_SITE_URL}/booking/cancelled`,
    integration_identifier: INTEGRATION_IDENTIFIER,
  } as Stripe.Checkout.SessionCreateParams);

  if (!session.url) throw new Error('Stripe returned a session without a redirect URL');
  return { provider: 'stripe', sessionId: session.id, url: session.url };
}

export const stripeProvider: PaymentProvider = { createCheckout };
