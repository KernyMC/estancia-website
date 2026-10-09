/**
 * Server-side price calculation — the ONLY place a checkout amount is
 * computed. Never trust an amount sent by the browser (rule inherited from
 * the WP pricing bridge): the client sends what it wants to buy, this module
 * answers what it costs.
 *
 * Sources:
 *   - Tours: fixed prices from the content layer (lib/content.ts)
 *   - Cruises: the live departure price from the availability cache
 *     (lib/availability.ts) — if the requested departure isn't in the cache,
 *     we refuse to quote rather than guess.
 *
 * Dependencies are injectable for unit testing; defaults are the real layers.
 */
import { getTour, getShip, type Tour, type Ship } from '../../lib/content';
import { getDepartures, type Departure } from '../../lib/availability';
import { resolveTourPrice, requiresDate } from '../../lib/seasonal-pricing';

export type QuoteInput =
  | {
      type: 'tour';
      slug: string;
      adults: number;
      children: number;
      addOnSlug?: string;
      /**
       * Tours have no live calendar — these are the traveler's requested dates,
       * not validated against real availability. `departureStart` also selects
       * the seasonal price (see lib/seasonal-pricing.ts).
       */
      departureStart?: string;
      departureEnd?: string;
    }
  | { type: 'cruise'; slug: string; departureStart: string; adults: number; children: number };

export interface Quote {
  type: 'tour' | 'cruise';
  itemSlug: string;
  itemName: string;
  /** Integer cents. Never floats. */
  amountCents: number;
  currency: 'usd';
  adults: number;
  children: number;
  departureStart?: string;
  departureEnd?: string;
  /** Human-readable line for Stripe's product description. */
  description: string;
}

export class QuoteError extends Error {
  constructor(
    message: string,
    /** Safe to show to the end user. */
    public readonly publicMessage: string
  ) {
    super(message);
    this.name = 'QuoteError';
  }
}

interface PricingDeps {
  getTour: (slug: string) => Promise<Tour | undefined>;
  getShip: (slug: string) => Promise<Ship | undefined>;
  getDepartures: (ship: Ship) => Promise<Departure[]>;
  /** Today as YYYY-MM-DD — injectable so season expiry is testable. */
  today?: () => string;
}

const defaultDeps: PricingDeps = {
  getTour,
  getShip,
  getDepartures,
  today: () => new Date().toISOString().slice(0, 10),
};

const MAX_PAX = 20;

function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function validatePax(adults: number, children: number): void {
  if (!Number.isInteger(adults) || !Number.isInteger(children)) {
    throw new QuoteError('non-integer pax', 'Invalid number of travelers.');
  }
  if (adults < 1) {
    throw new QuoteError('adults < 1', 'At least one adult is required.');
  }
  if (children < 0 || adults + children > MAX_PAX) {
    throw new QuoteError('pax out of range', `Group size must be between 1 and ${MAX_PAX}.`);
  }
}

export async function quote(input: QuoteInput, deps: PricingDeps = defaultDeps): Promise<Quote> {
  validatePax(input.adults, input.children);

  if (input.type === 'tour') {
    const tour = await deps.getTour(input.slug);
    if (!tour) throw new QuoteError(`unknown tour ${input.slug}`, 'Tour not found.');

    // A tour with current/upcoming seasonal prices must be quoted for a
    // specific start date — without one it would silently get the base price.
    const today = (deps.today ?? defaultDeps.today!)();
    if (requiresDate(tour, today) && !input.departureStart) {
      throw new QuoteError(
        `tour ${input.slug} has seasonal prices but no departureStart was given`,
        'Please choose your travel dates on the tour page to get the exact price.'
      );
    }

    const resolved = resolveTourPrice(tour, input.departureStart);
    if (resolved.price == null || resolved.childPrice == null) {
      throw new QuoteError(
        `tour ${input.slug} has no price for ${input.departureStart ?? 'the requested date'}`,
        'This tour is not available for online booking on those dates — please contact us.'
      );
    }

    let amountCents = toCents(resolved.price) * input.adults + toCents(resolved.childPrice) * input.children;
    let description = paxLabel(input.adults, input.children);
    if (resolved.season?.label) description = `${resolved.season.label} · ${description}`;

    if (input.addOnSlug) {
      const addOn = tour.addOns?.find((a) => a.slug === input.addOnSlug);
      if (!addOn) {
        throw new QuoteError(
          `unknown add-on ${input.addOnSlug} for tour ${input.slug}`,
          'That option is no longer available for this tour — please pick another.'
        );
      }
      amountCents += toCents(addOn.priceDelta) * (input.adults + input.children);
      description += ` · ${addOn.name}`;
    }

    return {
      type: 'tour',
      itemSlug: tour.slug,
      itemName: tour.name,
      amountCents,
      currency: 'usd',
      adults: input.adults,
      children: input.children,
      departureStart: input.departureStart,
      departureEnd: input.departureEnd,
      description,
    };
  }

  const ship = await deps.getShip(input.slug);
  if (!ship) throw new QuoteError(`unknown ship ${input.slug}`, 'Cruise not found.');

  const departures = await deps.getDepartures(ship);
  const departure = departures.find((d) => d.start === input.departureStart);
  if (!departure) {
    throw new QuoteError(
      `departure ${input.departureStart} not found for ${input.slug}`,
      'This departure is no longer available — please pick another date.'
    );
  }

  const pax = input.adults + input.children;
  if (departure.free < pax) {
    throw new QuoteError(
      `departure has ${departure.free} spots, requested ${pax}`,
      `Only ${departure.free} spot(s) left on this departure.`
    );
  }

  return {
    type: 'cruise',
    itemSlug: ship.slug,
    itemName: ship.name,
    amountCents: toCents(departure.price) * pax,
    currency: 'usd',
    adults: input.adults,
    children: input.children,
    departureStart: departure.start,
    departureEnd: departure.end,
    description: `${departure.itineraryName} · ${paxLabel(input.adults, input.children)}`,
  };
}

function paxLabel(adults: number, children: number): string {
  const parts = [`${adults} adult${adults === 1 ? '' : 's'}`];
  if (children > 0) parts.push(`${children} child${children === 1 ? '' : 'ren'}`);
  return parts.join(', ');
}

export const MAX_CART_ITEMS = 10;

export interface QuotedCart {
  items: Quote[];
  /** Sum of items[].amountCents. Integer cents, never floats. */
  totalCents: number;
  currency: 'usd';
}

/** Same as QuoteError, plus which line of the cart it came from. */
export class CartQuoteError extends QuoteError {
  constructor(
    message: string,
    publicMessage: string,
    public readonly index: number
  ) {
    super(message, publicMessage);
    this.name = 'CartQuoteError';
  }
}

/** Two items are "the same line" if they'd double-book the same thing. */
export function cartItemKey(
  input: Pick<QuoteInput, 'type' | 'slug'> & { departureStart?: string; addOnSlug?: string }
): string {
  return `${input.type}:${input.slug}:${input.departureStart ?? ''}:${input.addOnSlug ?? ''}`;
}

/**
 * Quotes every item in a cart server-side, same rule as quote(): never trust
 * a client amount. Sequential (not Promise.all) so a failure is deterministic
 * — the customer always sees the first broken line, not a race.
 */
export async function quoteCart(inputs: QuoteInput[], deps: PricingDeps = defaultDeps): Promise<QuotedCart> {
  if (inputs.length === 0) {
    throw new CartQuoteError('empty cart', 'Your cart is empty.', -1);
  }
  if (inputs.length > MAX_CART_ITEMS) {
    throw new CartQuoteError(
      `cart has ${inputs.length} items, max ${MAX_CART_ITEMS}`,
      `A cart can hold at most ${MAX_CART_ITEMS} items.`,
      -1
    );
  }

  const seenKeys = new Set<string>();
  const items: Quote[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]!;
    const key = cartItemKey(input);
    if (seenKeys.has(key)) {
      throw new CartQuoteError(`duplicate cart line at index ${i}: ${key}`, 'That trip is already in your cart.', i);
    }
    seenKeys.add(key);

    try {
      items.push(await quote(input, deps));
    } catch (err) {
      if (err instanceof QuoteError) {
        throw new CartQuoteError(err.message, err.publicMessage, i);
      }
      throw err;
    }
  }

  const totalCents = items.reduce((sum, item) => sum + item.amountCents, 0);

  return { items, totalCents, currency: 'usd' };
}
