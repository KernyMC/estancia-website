/**
 * Keeps non-production deployments out of search results, rate-limits the
 * endpoints that cost us something real per request, and sets baseline
 * security headers on every response.
 *
 * `X-Robots-Tag` rather than a `Disallow` in robots.txt: Disallow blocks the
 * crawl but the URL can still be indexed from external links, which is
 * exactly the duplicate-content problem we're avoiding. The header is read
 * per-response, so the same image runs as staging or production purely from
 * SITE_ENV — no rebuild.
 */
import { defineMiddleware } from 'astro:middleware';
import { env } from './server/env';

// Endpoints that trigger a paid third-party API call (Stripe/PayPal) or an
// outbound email get a simple per-IP rate limit — a POST body there is cheap
// to spam and each hit costs a real call. /api/cron/* (CRON_SECRET) and
// /api/sanity-revalidate (HMAC-verified) are excluded — they're already
// gated by a check that makes spamming them pointless.
const RATE_LIMITED_PATHS = new Set([
  '/api/checkout',
  '/api/paypal/create-order',
  '/api/paypal/capture-order',
  '/api/inquiry',
]);
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

// In-memory — fine for this app's single-instance deploy (see
// docs/deploy-staging.md). Swept lazily so it never grows unbounded, without
// paying sweep cost on every request.
const hitsByKey = new Map<string, number[]>();
let lastSweptAt = Date.now();

function sweepStaleEntries(now: number) {
  if (now - lastSweptAt < WINDOW_MS) return;
  lastSweptAt = now;
  for (const [key, timestamps] of hitsByKey) {
    const fresh = timestamps.filter((t) => now - t < WINDOW_MS);
    if (fresh.length === 0) hitsByKey.delete(key);
    else hitsByKey.set(key, fresh);
  }
}

/**
 * Traefik (our only reverse proxy in front of the app — see
 * docs/deploy-staging.md) appends the real peer address to X-Forwarded-For
 * rather than replacing it, so a client can prepend forged entries but can't
 * control the LAST one — that's always the IP that actually connected to
 * Traefik. Astro's Node adapter doesn't expose a trusted client IP for
 * standalone mode behind a proxy, so we read the header directly here
 * instead of `context.clientAddress`.
 */
function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (!xff) return 'unknown';
  const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.at(-1) ?? 'unknown';
}

function isRateLimited(request: Request): boolean {
  if (request.method !== 'POST') return false;
  const path = new URL(request.url).pathname.replace(/\/$/, '');
  if (!RATE_LIMITED_PATHS.has(path)) return false;

  const now = Date.now();
  sweepStaleEntries(now);

  const key = `${path}:${clientIp(request)}`;
  const timestamps = (hitsByKey.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  hitsByKey.set(key, timestamps);

  return timestamps.length > MAX_REQUESTS_PER_WINDOW;
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (isRateLimited(context.request)) {
    return new Response(JSON.stringify({ ok: false, error: 'Too many requests. Please try again shortly.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const response = await next();

  if (env.SITE_ENV !== 'production') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  // Baseline hardening headers. CSP is deliberately left out — this site
  // loads Stripe/PayPal SDK scripts and Sanity image assets from several
  // hosts, and a wrong CSP silently breaks checkout, which is worse than not
  // having one; frame-ancestors-equivalent clickjacking protection is
  // instead covered by X-Frame-Options below.
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return response;
});
