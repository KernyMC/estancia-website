/**
 * Sweeps abandoned checkouts: any Order still `pending` after 24h flips to
 * `expired` (see expireStaleOrders() in server/orders/orders.ts for why this
 * exists — Stripe's own expiry webhook can be missed, PayPal has no
 * equivalent event at all). Run daily; unlike warm-availability this isn't
 * time-sensitive, so once a day is enough.
 */
import type { APIRoute } from 'astro';
import { expireStaleOrders } from '../../../server/orders/orders';
import { env } from '../../../server/env';

export const GET: APIRoute = async ({ request }) => {
  // 404, not 401: an unauthenticated caller should not learn the route exists.
  if (env.CRON_SECRET && request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const result = await expireStaleOrders();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
