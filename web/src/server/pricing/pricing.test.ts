import { describe, it, expect } from 'vitest';
import { quote, quoteCart, QuoteError, CartQuoteError } from './pricing';
import type { Tour, Ship } from '../../lib/content';
import type { Departure } from '../../lib/availability';

const tour = {
  slug: 'bartolome',
  name: 'Bartolomé Day Tour',
  price: 150,
  childPrice: 100,
} as Tour;

const tourNoChildPrice = { ...tour, slug: 'no-child', childPrice: null } as Tour;
const tourNoPrice = { ...tour, slug: 'no-price', price: null } as Tour;
const tourWithAddOn = {
  ...tour,
  slug: 'tunnels',
  addOns: [{ slug: 'diving-upgrade', name: 'Diving upgrade', priceDelta: 85 }],
} as Tour;

const tourSeasonal = {
  ...tour,
  slug: 'seasonal',
  name: 'Seasonal Tour',
  addOns: [{ slug: 'diving-upgrade', name: 'Diving upgrade', priceDelta: 85 }],
  seasonalPrices: [
    { label: 'High season', startDate: '2026-12-15', endDate: '2027-01-15', price: 200, childPrice: 120 },
    { label: 'Low season', startDate: '2027-04-01', endDate: '2027-05-31', price: 120 },
  ],
} as Tour;
const tourSeasonalNoBase = {
  ...tourSeasonal,
  slug: 'seasonal-no-base',
  price: null,
  childPrice: null,
} as Tour;

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

function deps(overrides: Partial<Parameters<typeof quote>[1]> = {}) {
  return {
    getTour: async (slug: string) =>
      [tour, tourNoChildPrice, tourNoPrice, tourWithAddOn, tourSeasonal, tourSeasonalNoBase].find(
        (t) => t.slug === slug
      ),
    getShip: async (slug: string) => (slug === ship.slug ? ship : undefined),
    getDepartures: async () => [departure],
    today: () => '2026-10-08',
    ...overrides,
  };
}

describe('quote — tours', () => {
  it('multiplies adult and child prices in cents', async () => {
    const q = await quote({ type: 'tour', slug: 'bartolome', adults: 2, children: 1 }, deps());
    expect(q.amountCents).toBe(150 * 100 * 2 + 100 * 100 * 1);
    expect(q.currency).toBe('usd');
  });

  it('children pay adult price when childPrice is null', async () => {
    const q = await quote({ type: 'tour', slug: 'no-child', adults: 1, children: 1 }, deps());
    expect(q.amountCents).toBe(150 * 100 * 2);
  });

  it('rejects a tour without a price', async () => {
    await expect(
      quote({ type: 'tour', slug: 'no-price', adults: 1, children: 0 }, deps())
    ).rejects.toThrow(QuoteError);
  });

  it('rejects unknown tour', async () => {
    await expect(
      quote({ type: 'tour', slug: 'ghost', adults: 1, children: 0 }, deps())
    ).rejects.toThrow(QuoteError);
  });

  it('rejects zero adults and out-of-range groups', async () => {
    await expect(
      quote({ type: 'tour', slug: 'bartolome', adults: 0, children: 1 }, deps())
    ).rejects.toThrow(QuoteError);
    await expect(
      quote({ type: 'tour', slug: 'bartolome', adults: 19, children: 2 }, deps())
    ).rejects.toThrow(QuoteError);
  });

  it('adds the add-on price delta per traveler when selected', async () => {
    const q = await quote(
      { type: 'tour', slug: 'tunnels', adults: 2, children: 1, addOnSlug: 'diving-upgrade' },
      deps()
    );
    // base: 150*2 + 100*1 (childPrice from shared `tour` fixture) + addOn 85*3
    expect(q.amountCents).toBe((150 * 2 + 100 * 1 + 85 * 3) * 100);
    expect(q.description).toContain('Diving upgrade');
  });

  it('prices the base activity when no add-on is selected', async () => {
    const q = await quote({ type: 'tour', slug: 'tunnels', adults: 2, children: 1 }, deps());
    expect(q.amountCents).toBe((150 * 2 + 100 * 1) * 100);
  });

  it('rejects an unknown add-on slug', async () => {
    await expect(
      quote({ type: 'tour', slug: 'tunnels', adults: 1, children: 0, addOnSlug: 'ghost-addon' }, deps())
    ).rejects.toThrow(QuoteError);
  });
});

describe('quote — tours with seasonal prices', () => {
  const seasonal = (over: Record<string, unknown>) =>
    ({ type: 'tour', slug: 'seasonal', adults: 2, children: 1, ...over }) as Parameters<typeof quote>[0];

  it('charges the season price for a start date inside the season', async () => {
    const q = await quote(
      seasonal({ departureStart: '2026-12-20', departureEnd: '2026-12-22' }),
      deps()
    );
    expect(q.amountCents).toBe((200 * 2 + 120 * 1) * 100);
    expect(q.description).toContain('High season');
    expect(q.departureStart).toBe('2026-12-20');
  });

  it('charges the base price for a start date outside every season', async () => {
    const q = await quote(seasonal({ departureStart: '2027-03-01', departureEnd: '2027-03-03' }), deps());
    expect(q.amountCents).toBe((150 * 2 + 100 * 1) * 100);
    expect(q.description).not.toContain('season');
  });

  it('prices on the START date even when the trip runs past the season end', async () => {
    const q = await quote(seasonal({ departureStart: '2027-01-15', departureEnd: '2027-01-20' }), deps());
    expect(q.amountCents).toBe((200 * 2 + 120 * 1) * 100);
  });

  it('charges the season price on the first and last day (inclusive)', async () => {
    const first = await quote(seasonal({ departureStart: '2026-12-15', departureEnd: '2026-12-16' }), deps());
    const last = await quote(seasonal({ departureStart: '2027-01-15', departureEnd: '2027-01-16' }), deps());
    expect(first.amountCents).toBe(last.amountCents);
    expect(first.amountCents).toBe((200 * 2 + 120 * 1) * 100);
  });

  it("children pay the season's adult price when the season has no child price", async () => {
    const q = await quote(seasonal({ departureStart: '2027-04-10', departureEnd: '2027-04-12' }), deps());
    expect(q.amountCents).toBe(120 * 3 * 100);
  });

  it('adds the add-on delta on top of the season price, per traveler', async () => {
    const q = await quote(
      seasonal({ departureStart: '2026-12-20', departureEnd: '2026-12-22', addOnSlug: 'diving-upgrade' }),
      deps()
    );
    expect(q.amountCents).toBe((200 * 2 + 120 * 1 + 85 * 3) * 100);
  });

  it('refuses to quote without a date while seasons are current/upcoming (no silent base price)', async () => {
    const err = await quote(seasonal({}), deps()).catch((e) => e);
    expect(err).toBeInstanceOf(QuoteError);
    expect(err.publicMessage).toMatch(/dates/i);
  });

  it('quotes without a date once every season has expired', async () => {
    const q = await quote(seasonal({}), deps({ today: () => '2027-06-01' }));
    expect(q.amountCents).toBe((150 * 2 + 100 * 1) * 100);
  });

  it('refuses a date outside every season when there is no base price', async () => {
    await expect(
      quote(
        { type: 'tour', slug: 'seasonal-no-base', adults: 1, children: 0, departureStart: '2027-03-01', departureEnd: '2027-03-02' },
        deps()
      )
    ).rejects.toThrow(QuoteError);
  });

  it('prices a no-base-price tour inside a season', async () => {
    const q = await quote(
      { type: 'tour', slug: 'seasonal-no-base', adults: 1, children: 0, departureStart: '2026-12-20', departureEnd: '2026-12-21' },
      deps()
    );
    expect(q.amountCents).toBe(200 * 100);
  });

  it('leaves tours without seasons untouched, with or without a date', async () => {
    const noDate = await quote({ type: 'tour', slug: 'bartolome', adults: 2, children: 1 }, deps());
    const withDate = await quote(
      { type: 'tour', slug: 'bartolome', adults: 2, children: 1, departureStart: '2026-12-20', departureEnd: '2026-12-21' },
      deps()
    );
    expect(noDate.amountCents).toBe(withDate.amountCents);
    expect(noDate.amountCents).toBe((150 * 2 + 100) * 100);
  });

  it('prices each cart line by its own date', async () => {
    const cart = await quoteCart(
      [
        seasonal({ departureStart: '2026-12-20', departureEnd: '2026-12-22' }),
        seasonal({ departureStart: '2027-03-01', departureEnd: '2027-03-03' }),
      ],
      deps()
    );
    expect(cart.items.map((i) => i.amountCents)).toEqual([
      (200 * 2 + 120) * 100,
      (150 * 2 + 100) * 100,
    ]);
    expect(cart.totalCents).toBe(cart.items[0]!.amountCents + cart.items[1]!.amountCents);
  });

  it('reports the cart line that lacks a date', async () => {
    const err = await quoteCart(
      [
        { type: 'tour', slug: 'bartolome', adults: 1, children: 0 },
        { type: 'tour', slug: 'seasonal', adults: 1, children: 0 },
      ],
      deps()
    ).catch((e) => e);
    expect(err).toBeInstanceOf(CartQuoteError);
    expect(err.index).toBe(1);
  });
});

describe('quote — cruises', () => {
  it('prices the requested departure per person', async () => {
    const q = await quote(
      { type: 'cruise', slug: 'galaxy-sirius', departureStart: '2026-09-01', adults: 2, children: 1 },
      deps()
    );
    expect(q.amountCents).toBe(3200 * 100 * 3);
    expect(q.departureStart).toBe('2026-09-01');
    expect(q.departureEnd).toBe('2026-09-05');
  });

  it('refuses to quote a departure not in the cache', async () => {
    await expect(
      quote(
        { type: 'cruise', slug: 'galaxy-sirius', departureStart: '2099-01-01', adults: 2, children: 0 },
        deps()
      )
    ).rejects.toThrow(QuoteError);
  });

  it('refuses when the group exceeds free spots', async () => {
    await expect(
      quote(
        { type: 'cruise', slug: 'galaxy-sirius', departureStart: '2026-09-01', adults: 4, children: 1 },
        deps()
      )
    ).rejects.toThrow(/spot/);
  });

  it('rejects unknown ship', async () => {
    await expect(
      quote(
        { type: 'cruise', slug: 'ghost-ship', departureStart: '2026-09-01', adults: 1, children: 0 },
        deps()
      )
    ).rejects.toThrow(QuoteError);
  });
});
