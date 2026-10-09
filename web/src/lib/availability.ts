/**
 * Live ship availability + pricing.
 *
 * Source: the vendor's own Real Time Availability API, hit directly (see
 * "REAL TIME AVAILABILITY API USER MANUAL"). We used to go through our WP
 * REST proxy (wp-json/gab/v1/availability), but that proxy's own transient
 * cache started taking ~27s consistently, always exceeding our client
 * timeout and leaving the cache permanently empty (found 2026-07-31). The
 * vendor API answers narrow date ranges in ~4s; our 6-month range can take
 * up to ~30s, hence the generous timeout below.
 *
 * We add a cache layer here (in-memory, see lib/cache.ts) so that:
 *   1. Render never depends on the vendor's live latency.
 *   2. The hard rule from the WP build stays true here: no page render ever
 *      blocks on a slow upstream call. Renders only ever read this cache.
 *
 * Fresh for 10 minutes, falls back to a 24h-stale copy if the upstream call
 * fails.
 *
 * The vendor's TLS handshake alone has been observed taking 6-15s (found
 * 2026-08-02). Node's default fetch caps connect time at 10s (undici's
 * `connectTimeout`), well under that, so we dispatch through our own undici
 * Agent with a longer connect budget instead of relying on the global one.
 */
import { cache } from './cache';
import type { Ship } from './content';
import { Agent, fetch as undiciFetch } from 'undici';

const VENDOR_API_URL = 'https://galagentssystem.com/api/v3/availability/search/ship';
const FRESH_TTL_SECONDS = 10 * 60;
const STALE_TTL_SECONDS = 24 * 60 * 60;
const VENDOR_CONNECT_TIMEOUT_MS = 35_000;
const vendorAgent = new Agent({ connectTimeout: VENDOR_CONNECT_TIMEOUT_MS });

export interface Departure {
  start: string;
  end: string;
  price: number;
  promo: boolean;
  free: number;
  capacity: number;
  itineraryName: string;
}

interface ApiItinerary {
  name: string;
  date: { start: string; end: string };
  free: number;
  capacity: number;
  price: number;
  promo: { amount: number } | null;
}

interface ApiShip {
  name: string;
  itinerary: ApiItinerary[];
}

interface ApiResponse {
  data?: { ship?: ApiShip[] };
}

function dateRange(): { start: string; end: string } {
  const today = new Date();
  const in6mo = new Date(today);
  in6mo.setMonth(in6mo.getMonth() + 6);
  return { start: today.toISOString().slice(0, 10), end: in6mo.toISOString().slice(0, 10) };
}

async function fetchLive(): Promise<ApiResponse> {
  const { start, end } = dateRange();
  // ship=0 means "all ships" per the vendor manual.
  const url = `${VENDOR_API_URL}/0/${start}/${end}`;
  // Our 6-month window has taken up to ~30s in testing; margin above that.
  const res = await undiciFetch(url, {
    signal: AbortSignal.timeout(45_000),
    dispatcher: vendorAgent,
  });
  if (!res.ok) throw new Error(`vendor availability API responded ${res.status}`);
  return res.json() as Promise<ApiResponse>;
}

/**
 * The vendor connect is flaky enough (intermittent >10s handshakes) that a
 * single attempt regularly loses the boot warm-up window entirely — and in
 * local dev there's no cron to pick it back up, so a failed boot attempt
 * left the cache empty for the rest of the session (found 2026-08-02).
 */
async function fetchLiveWithRetry(attempts = 3): Promise<ApiResponse> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchLive();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw lastErr;
}

// Render must never block on the live upstream call (~30s worst case) — only
// /api/cron/warm-availability (and the boot warm-up below) call fetchLive().
// Here we only ever read the cache: fresh copy first, then the 24h-stale
// fallback, then nothing. A cold cache just means no price shows yet.
async function getAvailabilityData(): Promise<ApiResponse | null> {
  const { start, end } = dateRange();
  const key = `avail:${start}:${end}`;
  const staleKey = `${key}:stale`;

  const fresh = await cache.get(key);
  if (fresh) return JSON.parse(fresh);

  const stale = await cache.get(staleKey);
  if (stale) return JSON.parse(stale);

  return null;
}

/**
 * True once we've ever successfully reached the vendor (fresh or 24h-stale
 * copy in cache) — false only when boot warm-up and cron have both failed to
 * reach it. Lets pages tell "sold out" apart from "can't reach the vendor
 * API right now" instead of showing the same empty state for both.
 */
export async function hasLiveAvailabilityData(): Promise<boolean> {
  return (await getAvailabilityData()) !== null;
}

/** Manually re-populates the cache. Mirrors the production cron warm-up job. */
export async function warmAvailabilityCache(): Promise<{ ok: boolean; shipCount: number }> {
  const data = await fetchLiveWithRetry();
  const { start, end } = dateRange();
  const key = `avail:${start}:${end}`;
  const serialized = JSON.stringify(data);
  await cache.set(key, serialized, FRESH_TTL_SECONDS);
  await cache.set(`${key}:stale`, serialized, STALE_TTL_SECONDS);
  return { ok: true, shipCount: data.data?.ship?.length ?? 0 };
}

// Fires once when this module first loads (server boot / redeploy), so the
// empty-cache window is seconds instead of waiting up to 10 minutes for the
// cron's next tick. Fire-and-forget — must never block the first request,
// and a failure here is harmless in production since the cron retries on its
// own schedule. Locally there is no cron: if this fails (even after
// fetchLiveWithRetry's 3 attempts), the cache stays empty until the dev
// server restarts or /api/cron/warm-availability is hit manually.
warmAvailabilityCache().catch((err) => {
  console.error('[availability] boot warm-up failed after retries:', err);
});

function normalizeShipName(name: string): string {
  return name
    .toLowerCase()
    .replace(/m\/[yc]\s*/g, '')
    .replace(/galaxy\s+/g, '')
    .trim();
}

async function apiShipFor(ship: Ship): Promise<ApiShip | undefined> {
  if (!ship.apiName) return undefined;
  const data = await getAvailabilityData();
  const apiShips = data?.data?.ship ?? [];
  const ours = normalizeShipName(ship.apiName);
  return apiShips.find((s) => {
    const theirs = normalizeShipName(s.name);
    return theirs === ours || theirs.includes(ours) || ours.includes(theirs);
  });
}

export async function getDepartures(ship: Ship): Promise<Departure[]> {
  const api = await apiShipFor(ship);
  if (!api) return [];
  const today = new Date().toISOString().slice(0, 10);

  return (api.itinerary ?? [])
    .filter((it) => (it.free ?? 0) > 0 && (it.date?.start ?? '') >= today)
    .map((it) => ({
      start: it.date.start,
      end: it.date.end,
      price: it.promo?.amount ?? it.price,
      promo: Boolean(it.promo?.amount),
      free: it.free,
      capacity: it.capacity,
      itineraryName: it.name,
    }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Nearest upcoming departure with space — what the price box shows. */
export async function getNearestDeparture(ship: Ship): Promise<Departure | undefined> {
  return (await getDepartures(ship))[0];
}

export function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const sTxt = s.toLocaleDateString('en-US', opts);
  const eTxt = e.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${sTxt} – ${eTxt}`;
}

export function formatPrice(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}
