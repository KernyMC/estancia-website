/**
 * Sanity webhook handler: verifies the payload signature via `@sanity/webhook`
 * (Sanity's own toolkit — same HMAC-over-raw-body scheme as Stripe) and clears
 * the whole content cache so the next request re-fetches fresh data.
 *
 * No per-document/_type granularity: the cached content set (ships, tours,
 * stays, reviews, social links) is small, so clearing everything on any
 * publish is cheap and avoids a _type -> cache-key map that would drift as
 * content.ts grows.
 */
import { isValidSignature } from '@sanity/webhook';
import { cache } from '../lib/cache';
import { env, sanityRevalidateConfigured } from './env';

export async function handleSanityWebhook(
  rawBody: string,
  signature: string | null
): Promise<{ status: number; message: string }> {
  if (!sanityRevalidateConfigured) {
    return { status: 501, message: 'sanity revalidate not configured' };
  }
  if (!signature) {
    return { status: 400, message: 'missing sanity-webhook-signature header' };
  }

  const valid = await isValidSignature(rawBody, signature, env.SANITY_REVALIDATE_SECRET as string);
  if (!valid) {
    return { status: 401, message: 'invalid signature' };
  }

  await cache.clear();
  return { status: 200, message: 'cache cleared' };
}
