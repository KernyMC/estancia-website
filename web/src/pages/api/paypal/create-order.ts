/**
 * PayPal order creation. Same request shape as /api/checkout — parse →
 * validate → quote the whole cart server-side → create the PayPal order →
 * pending order. Returns { orderId } as required by the v6 SDK's
 * createOrder() contract.
 */
import type { APIRoute } from 'astro';
import { checkoutRequestSchema } from '../../../server/payments/checkout-request';
import { quoteCart, CartQuoteError, QuoteError } from '../../../server/pricing/pricing';
import { createPendingPaypalOrder } from '../../../server/orders/orders';
import { createOrder } from '../../../server/payments/paypal';
import { paypalConfigured } from '../../../server/env';

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  if (!paypalConfigured) {
    return json(501, { ok: false, error: 'PayPal is not configured on this server.' });
  }

  const raw = await request.json().catch(() => null);
  const parsed = checkoutRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return json(400, { ok: false, error: 'Invalid request', details: parsed.error.issues });
  }

  const { items, customer } = parsed.data;

  try {
    const cart = await quoteCart(items);
    const { orderId } = await createOrder(cart);
    await createPendingPaypalOrder({ cart, customer, paypalOrderId: orderId });
    return json(200, { orderId });
  } catch (err) {
    if (err instanceof CartQuoteError) {
      return json(422, { ok: false, error: err.publicMessage, index: err.index });
    }
    if (err instanceof QuoteError) {
      return json(422, { ok: false, error: err.publicMessage });
    }
    console.error('[paypal/create-order] failed:', err);
    return json(500, { ok: false, error: 'Could not start PayPal checkout. Please try again.' });
  }
};
