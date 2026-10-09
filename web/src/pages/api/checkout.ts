/**
 * Stripe checkout endpoint. Thin route: parse → validate (Zod) → quote the
 * whole cart server-side → pending order → Stripe session → { url }. All
 * business logic lives in src/server/; this file only translates HTTP.
 *
 * A checkout is always a cart of 1+ items — a direct "Book now" purchase is
 * just a cart with one line, there is no separate single-item path.
 */
import type { APIRoute } from 'astro';
import { checkoutRequestSchema } from '../../server/payments/checkout-request';
import { quoteCart, CartQuoteError, QuoteError } from '../../server/pricing/pricing';
import { createPendingStripeOrder } from '../../server/orders/orders';
import { stripeProvider } from '../../server/payments/stripe';

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const raw = await request.json().catch(() => null);
  const parsed = checkoutRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return json(400, { ok: false, error: 'Invalid request', details: parsed.error.issues });
  }

  const { items, customer } = parsed.data;

  try {
    const cart = await quoteCart(items);
    const checkout = await stripeProvider.createCheckout(cart, customer);
    await createPendingStripeOrder({ cart, customer, stripeSessionId: checkout.sessionId });
    return json(200, { ok: true, url: checkout.url });
  } catch (err) {
    if (err instanceof CartQuoteError) {
      return json(422, { ok: false, error: err.publicMessage, index: err.index });
    }
    if (err instanceof QuoteError) {
      return json(422, { ok: false, error: err.publicMessage });
    }
    console.error('[checkout] failed:', err);
    return json(500, { ok: false, error: 'Could not start checkout. Please try again.' });
  }
};
