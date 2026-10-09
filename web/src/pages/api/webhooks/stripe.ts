/**
 * Stripe webhook endpoint. The raw body (request.text()) is passed untouched
 * to signature verification — parsing JSON first would break the signature.
 * All processing logic lives in server/payments/stripe-webhook.ts.
 */
import type { APIRoute } from 'astro';
import { handleStripeWebhook } from '../../../server/payments/stripe-webhook';

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  const outcome = await handleStripeWebhook(rawBody, signature);

  return new Response(JSON.stringify({ message: outcome.message }), {
    status: outcome.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
