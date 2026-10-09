/**
 * Sanity read client + image URL helper.
 *
 * The `production` dataset is world-readable, so no token is needed for the
 * public content this site renders. `useCdn` serves cached, edge-delivered
 * responses — fine for content that doesn't need to be real-time.
 *
 * Only reviews live in Sanity today; ships/tours/stays still come from the
 * local JSON snapshots in lib/content.ts until their migration lands.
 */
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url';

export const sanity = createClient({
  projectId: 'gxkh85js',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
});

const builder = imageUrlBuilder(sanity);

/** Build a CDN image URL from a Sanity image reference. */
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}
