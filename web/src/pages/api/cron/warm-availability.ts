/**
 * The ONLY endpoint allowed to make a live upstream availability fetch.
 * In production, hit on a 10-minute schedule (matches the WP cron
 * cadence this replaces). Locally, call it manually to force-refresh
 * the in-memory cache during development.
 */
import type { APIRoute } from 'astro';
import { warmAvailabilityCache } from '../../../lib/availability';
import { env } from '../../../server/env';

export const GET: APIRoute = async ({ request }) => {
  // 404, not 401: an unauthenticated caller should not learn the route exists.
  if (env.CRON_SECRET && request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const result = await warmAvailabilityCache();
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
