import { describe, it, expect } from 'vitest';
import { quoteCart, CartQuoteError, MAX_CART_ITEMS } from './pricing';
import type { Tour, Ship } from '../../lib/content';
import type { Departure } from '../../lib/availability';

const tour = { slug: 'bartolome', name: 'Bartolomé Day Tour', price: 150, childPrice: 100 } as Tour;
const tourNoPrice = { ...tour, slug: 'no-price', price: null } as Tour;
const ship = { slug: 'galaxy-sirius', name: 'Galaxy Sirius', apiName: 'M/Y Galaxy Sirius' } as Ship;
const departure: Departure = {
  start: '2026-09-01',
  end: '2026-09-05',
  price: 3200,
  promo: false,
  free: 4,
  capacity: 16,
  itineraryName: 'Itinerary A',
};

function deps(overrides: Partial<Parameters<typeof quoteCart>[1]> = {}) {
  return {
    getTour: async (slug: string) => [tour, tourNoPrice].find((t) => t.slug === slug),
    getShip: async (slug: string) => (slug === ship.slug ? ship : undefined),
    getDepartures: async () => [departure],
    ...overrides,
  };
}

describe('quoteCart', () => {
  it('sums integer cents across a mixed tour + cruise cart', async () => {
    const result = await quoteCart(
      [
        { type: 'tour', slug: 'bartolome', adults: 2, children: 0 },
        { type: 'cruise', slug: 'galaxy-sirius', departureStart: '2026-09-01', adults: 1, children: 0 },
      ],
      deps()
    );
    expect(result.items).toHaveLength(2);
    expect(result.totalCents).toBe(150 * 100 * 2 + 3200 * 100);
    expect(result.currency).toBe('usd');
  });

  it('rejects an empty cart', async () => {
    await expect(quoteCart([], deps())).rejects.toThrow(CartQuoteError);
  });

  it(`rejects more than ${MAX_CART_ITEMS} items`, async () => {
    const items = Array.from({ length: MAX_CART_ITEMS + 1 }, () => ({
      type: 'tour' as const,
      slug: 'bartolome',
      adults: 1,
      children: 0,
    }));
    await expect(quoteCart(items, deps())).rejects.toThrow(CartQuoteError);
  });

  it('rejects a duplicate line (same item + same departure)', async () => {
    await expect(
      quoteCart(
        [
          { type: 'cruise', slug: 'galaxy-sirius', departureStart: '2026-09-01', adults: 1, children: 0 },
          { type: 'cruise', slug: 'galaxy-sirius', departureStart: '2026-09-01', adults: 2, children: 0 },
        ],
        deps()
      )
    ).rejects.toThrow(CartQuoteError);
  });

  it('allows the same ship on two different departures', async () => {
    const secondDeparture: Departure = { ...departure, start: '2026-10-01', end: '2026-10-05' };
    const result = await quoteCart(
      [
        { type: 'cruise', slug: 'galaxy-sirius', departureStart: '2026-09-01', adults: 1, children: 0 },
        { type: 'cruise', slug: 'galaxy-sirius', departureStart: '2026-10-01', adults: 1, children: 0 },
      ],
      deps({ getDepartures: async () => [departure, secondDeparture] })
    );
    expect(result.items).toHaveLength(2);
  });

  it('reports the failing line index and fails the whole cart (fail-fast)', async () => {
    let error: CartQuoteError | undefined;
    try {
      await quoteCart(
        [
          { type: 'tour', slug: 'bartolome', adults: 1, children: 0 },
          { type: 'tour', slug: 'no-price', adults: 1, children: 0 },
        ],
        deps()
      );
    } catch (err) {
      error = err as CartQuoteError;
    }
    expect(error).toBeInstanceOf(CartQuoteError);
    expect(error?.index).toBe(1);
  });
});
