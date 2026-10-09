/**
 * Sanity webhook endpoint. Raw body is passed untouched to signature
 * verification — parsing JSON first would break the HMAC. All logic lives in
 * server/sanity-webhook.ts.
 */
import type { APIRoute } from 'astro';
import { SIGNATURE_HEADER_NAME } from '@sanity/webhook';
import { handleSanityWebhook } from '../../server/sanity-webhook';

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const signature = request.headers.get(SIGNATURE_HEADER_NAME);

  const outcome = await handleSanityWebhook(rawBody, signature);

  return new Response(JSON.stringify({ message: outcome.message }), {
    status: outcome.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
