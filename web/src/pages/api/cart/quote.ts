/**
 * Read-only pricing for the cart drawer: no customer, no order created, no
 * side effects. This is what keeps "price is computed only on the server"
 * true for the cart UI — localStorage never carries a price the browser can
 * trust, only display hints until this endpoint confirms them.
 */
import type { APIRoute } from 'astro';
import { cartQuoteRequestSchema } from '../../../server/payments/checkout-request';
import { quoteCart, CartQuoteError, QuoteError } from '../../../server/pricing/pricing';

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const raw = await request.json().catch(() => null);
  const parsed = cartQuoteRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return json(400, { ok: false, error: 'Invalid request', details: parsed.error.issues });
  }

  try {
    const cart = await quoteCart(parsed.data.items);
    return json(200, {
      ok: true,
      items: cart.items.map((q) => ({
        type: q.type,
        itemSlug: q.itemSlug,
        itemName: q.itemName,
        departureStart: q.departureStart,
        departureEnd: q.departureEnd,
        adults: q.adults,
        children: q.children,
        amountCents: q.amountCents,
        description: q.description,
      })),
      totalCents: cart.totalCents,
      currency: cart.currency,
    });
  } catch (err) {
    if (err instanceof CartQuoteError) {
      return json(422, { ok: false, error: err.publicMessage, index: err.index });
    }
    if (err instanceof QuoteError) {
      return json(422, { ok: false, error: err.publicMessage });
    }
    console.error('[cart/quote] failed:', err);
    return json(500, { ok: false, error: 'Could not price the cart. Please try again.' });
  }
};
