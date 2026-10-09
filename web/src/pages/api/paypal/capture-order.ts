/**
 * PayPal order capture. Called from the frontend's onApprove callback after
 * the buyer approves in the PayPal widget. The capture call to PayPal
 * is the authoritative confirmation of payment — we never trust the client's
 * "approved" event alone.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { captureOrder } from '../../../server/payments/paypal';
import { markPaypalPaid, getOrderByPaypalOrder } from '../../../server/orders/orders';
import { sendOrderEmails } from '../../../server/email/sender';
import { paypalConfigured } from '../../../server/env';

// PayPal order ids are alphanumeric (Orders v2 API), ~17 chars. Strict format
// closes off path/query injection into the capture URL below (orderId is
// interpolated into a fetch() path — see server/payments/paypal.ts).
const bodySchema = z.object({ orderId: z.string().regex(/^[A-Z0-9]{10,32}$/) });

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
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(400, { ok: false, error: 'Invalid request' });
  }

  const { orderId } = parsed.data;

  // Only ever capture an order we actually created and are still expecting
  // payment for — otherwise orderId (still attacker-controlled at this
  // point, format check above notwithstanding) could point the capture
  // call at a PayPal order we have no record of.
  const existing = await getOrderByPaypalOrder(orderId);
  if (!existing || existing.provider !== 'paypal' || existing.status !== 'pending') {
    return json(404, { ok: false, error: 'Order not found.' });
  }

  try {
    const capture = await captureOrder(orderId, {
      amountCents: existing.amountCents,
      currency: existing.currency,
    });
    if (!capture.completed) {
      return json(422, { ok: false, error: 'Payment was not completed.' });
    }

    await markPaypalPaid(orderId, capture.captureId);
    const order = await getOrderByPaypalOrder(orderId);
    if (order) await sendOrderEmails(order);

    return json(200, { ok: true, orderId: order?.id });
  } catch (err) {
    console.error('[paypal/capture-order] failed:', err);
    return json(500, { ok: false, error: 'Could not confirm PayPal payment. Please contact us.' });
  }
};
