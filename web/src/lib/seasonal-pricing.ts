/**
 * Date-range ("seasonal") pricing for tours. Pure functions with no server or
 * Sanity imports: the same resolver runs on the server (server/pricing, the
 * only place a charged amount is computed) and in the browser (the live price
 * hint in BookingForm), so the two can't drift apart.
 *
 * Rules:
 *   - Dates are `YYYY-MM-DD` strings compared lexically. Never parsed into
 *     Date objects, so there is no timezone drift at season boundaries.
 *   - Both ends of a season are inclusive.
 *   - The price is picked by the traveler's START date only.
 *   - A date outside every season falls back to the tour's base price/childPrice.
 *   - A season with a blank childPrice charges children the season's adult
 *     price (same "blank = same as adults" rule as the base childPrice).
 *   - Malformed entries (bad dates, end < start, price <= 0) are ignored
 *     instead of throwing — a half-edited Sanity document must never take a
 *     tour page or checkout down.
 *   - If two seasons overlap (Studio validation should prevent it), the one
 *     with the earliest startDate wins, deterministically.
 */

export interface SeasonalPrice {
  label?: string | null;
  startDate: string;
  endDate: string;
  /** USD per adult. */
  price: number;
  /** USD per child; blank = same as the season's adult price. */
  childPrice?: number | null;
}

export interface SeasonalPricedTour {
  price: number | null;
  childPrice: number | null;
  /** Optional: documents cached before this field existed don't have it. */
  seasonalPrices?: SeasonalPrice[] | null;
}

export interface ResolvedTourPrice {
  /** USD per adult, or null when the tour can't be priced for that date. */
  price: number | null;
  /** USD per child, or null when `price` is null. */
  childPrice: number | null;
  /** The season that matched, or null when the base price applies. */
  season: SeasonalPrice | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today as YYYY-MM-DD (UTC). Used to hide seasons that already ended. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE.test(value);
}

function isPositive(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/** Well-formed seasons only, earliest start first. */
export function validSeasons(seasons: SeasonalPrice[] | null | undefined): SeasonalPrice[] {
  if (!Array.isArray(seasons)) return [];
  return seasons
    .filter(
      (s) =>
        s != null &&
        isIsoDate(s.startDate) &&
        isIsoDate(s.endDate) &&
        s.endDate >= s.startDate &&
        isPositive(s.price)
    )
    .map((s) => ({
      ...s,
      childPrice:
        typeof s.childPrice === 'number' && Number.isFinite(s.childPrice) && s.childPrice >= 0
          ? s.childPrice
          : null,
    }))
    .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
}

/** Seasons that haven't fully passed yet (endDate >= today). */
export function activeSeasons(
  seasons: SeasonalPrice[] | null | undefined,
  today: string
): SeasonalPrice[] {
  return validSeasons(seasons).filter((s) => s.endDate >= today);
}

/**
 * The price a traveler starting on `date` pays. With no (or an invalid) date
 * this is the base price — callers that must not undercharge a seasonal tour
 * use `requiresDate` to demand a date first.
 */
export function resolveTourPrice(tour: SeasonalPricedTour, date?: string | null): ResolvedTourPrice {
  const season = isIsoDate(date)
    ? (validSeasons(tour.seasonalPrices).find((s) => date >= s.startDate && date <= s.endDate) ?? null)
    : null;

  if (season) {
    return { price: season.price, childPrice: season.childPrice ?? season.price, season };
  }
  if (!isPositive(tour.price)) return { price: null, childPrice: null, season: null };
  return { price: tour.price, childPrice: tour.childPrice ?? tour.price, season: null };
}

/**
 * True when picking a date changes the price (some season is still current
 * or upcoming). A seasonal tour quoted without a date would silently get the
 * base price, so checkout refuses that instead of undercharging.
 */
export function requiresDate(tour: SeasonalPricedTour, today: string): boolean {
  return activeSeasons(tour.seasonalPrices, today).length > 0;
}

/**
 * The "from $X" figure for cards, hero, and structured data: the cheapest
 * adult price among the base price and every current/upcoming season. Expired
 * seasons are excluded so a finished promo doesn't advertise a price nobody
 * can book anymore. Null when nothing is priced.
 */
export function tourFromPrice(tour: SeasonalPricedTour, today: string): number | null {
  const candidates = activeSeasons(tour.seasonalPrices, today).map((s) => s.price);
  if (isPositive(tour.price)) candidates.push(tour.price);
  return candidates.length > 0 ? Math.min(...candidates) : null;
}
