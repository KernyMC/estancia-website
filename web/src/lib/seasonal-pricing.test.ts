import { describe, it, expect } from 'vitest';
import {
  resolveTourPrice,
  requiresDate,
  tourFromPrice,
  validSeasons,
  activeSeasons,
  type SeasonalPrice,
} from './seasonal-pricing';

const high: SeasonalPrice = {
  label: 'High season',
  startDate: '2026-12-15',
  endDate: '2027-01-15',
  price: 200,
  childPrice: 120,
};
const low: SeasonalPrice = { label: 'Low season', startDate: '2027-04-01', endDate: '2027-05-31', price: 120 };

const base = { price: 150, childPrice: 100 as number | null };

describe('resolveTourPrice', () => {
  it('uses the base price when the tour has no seasons', () => {
    expect(resolveTourPrice({ ...base })).toEqual({ price: 150, childPrice: 100, season: null });
  });

  it('tolerates a cached tour without the seasonalPrices field', () => {
    const r = resolveTourPrice({ price: 150, childPrice: null }, '2026-12-20');
    expect(r).toEqual({ price: 150, childPrice: 150, season: null });
  });

  it('picks the season containing the date', () => {
    const r = resolveTourPrice({ ...base, seasonalPrices: [low, high] }, '2026-12-20');
    expect(r.price).toBe(200);
    expect(r.childPrice).toBe(120);
    expect(r.season?.label).toBe('High season');
  });

  it('treats both season boundaries as inclusive', () => {
    const t = { ...base, seasonalPrices: [high] };
    expect(resolveTourPrice(t, '2026-12-15').price).toBe(200);
    expect(resolveTourPrice(t, '2027-01-15').price).toBe(200);
    expect(resolveTourPrice(t, '2026-12-14').price).toBe(150);
    expect(resolveTourPrice(t, '2027-01-16').price).toBe(150);
  });

  it('works for a single-day season', () => {
    const t = { ...base, seasonalPrices: [{ startDate: '2027-02-14', endDate: '2027-02-14', price: 300 }] };
    expect(resolveTourPrice(t, '2027-02-14').price).toBe(300);
    expect(resolveTourPrice(t, '2027-02-15').price).toBe(150);
  });

  it('crosses a year boundary correctly', () => {
    expect(resolveTourPrice({ ...base, seasonalPrices: [high] }, '2026-12-31').price).toBe(200);
    expect(resolveTourPrice({ ...base, seasonalPrices: [high] }, '2027-01-01').price).toBe(200);
  });

  it('falls back to the base price between seasons', () => {
    const r = resolveTourPrice({ ...base, seasonalPrices: [high, low] }, '2027-03-01');
    expect(r).toEqual({ price: 150, childPrice: 100, season: null });
  });

  it('children pay the season adult price when the season has no childPrice', () => {
    const r = resolveTourPrice({ ...base, seasonalPrices: [low] }, '2027-04-10');
    expect(r.price).toBe(120);
    expect(r.childPrice).toBe(120); // not the base child price (100)
  });

  it('a season childPrice of 0 is honored (free children), not treated as blank', () => {
    const t = { ...base, seasonalPrices: [{ ...low, childPrice: 0 }] };
    expect(resolveTourPrice(t, '2027-04-10').childPrice).toBe(0);
  });

  it('ignores an invalid or missing date and uses the base price', () => {
    const t = { ...base, seasonalPrices: [high] };
    expect(resolveTourPrice(t, undefined).price).toBe(150);
    expect(resolveTourPrice(t, '').price).toBe(150);
    expect(resolveTourPrice(t, '12/20/2026').price).toBe(150);
  });

  it('returns null when there is no base price and no season matches', () => {
    const t = { price: null, childPrice: null, seasonalPrices: [high] };
    expect(resolveTourPrice(t, '2027-03-01')).toEqual({ price: null, childPrice: null, season: null });
    expect(resolveTourPrice(t, '2026-12-20').price).toBe(200);
  });

  it('with overlapping seasons the earliest start wins, regardless of array order', () => {
    const a: SeasonalPrice = { startDate: '2027-06-01', endDate: '2027-06-30', price: 100 };
    const b: SeasonalPrice = { startDate: '2027-06-15', endDate: '2027-07-15', price: 999 };
    expect(resolveTourPrice({ ...base, seasonalPrices: [b, a] }, '2027-06-20').price).toBe(100);
  });
});

describe('validSeasons', () => {
  it('drops malformed entries instead of throwing', () => {
    const bad = [
      { startDate: '2027-02-01', endDate: '2027-01-01', price: 100 }, // end < start
      { startDate: '2027-02-01', endDate: '', price: 100 }, // missing end
      { startDate: '2027-02-01', endDate: '2027-02-10', price: 0 }, // price 0
      { startDate: '2027-02-01', endDate: '2027-02-10', price: -5 },
      { startDate: '2027-02-01', endDate: '2027-02-10', price: NaN },
      null,
    ] as unknown as SeasonalPrice[];
    expect(validSeasons(bad)).toEqual([]);
    expect(validSeasons(null)).toEqual([]);
    expect(validSeasons(undefined)).toEqual([]);
  });

  it('keeps good entries and sorts them by start date', () => {
    const out = validSeasons([low, high]);
    expect(out.map((s) => s.label)).toEqual(['High season', 'Low season']);
  });
});

describe('activeSeasons / requiresDate', () => {
  const t = { ...base, seasonalPrices: [high, low] };

  it('drops seasons that already ended', () => {
    expect(activeSeasons(t.seasonalPrices, '2027-02-01').map((s) => s.label)).toEqual(['Low season']);
  });

  it('keeps a season on its last day', () => {
    expect(activeSeasons(t.seasonalPrices, '2027-05-31')).toHaveLength(1);
    expect(activeSeasons(t.seasonalPrices, '2027-06-01')).toHaveLength(0);
  });

  it('requires a date only while some season is current or upcoming', () => {
    expect(requiresDate(t, '2026-10-08')).toBe(true);
    expect(requiresDate(t, '2027-06-01')).toBe(false);
    expect(requiresDate({ ...base }, '2026-10-08')).toBe(false);
  });
});

describe('tourFromPrice', () => {
  it('is the cheapest of base and current/upcoming seasons', () => {
    expect(tourFromPrice({ ...base, seasonalPrices: [high, low] }, '2026-10-08')).toBe(120);
  });

  it('ignores expired seasons', () => {
    expect(tourFromPrice({ ...base, seasonalPrices: [high, low] }, '2027-06-01')).toBe(150);
  });

  it('works without a base price', () => {
    expect(tourFromPrice({ price: null, childPrice: null, seasonalPrices: [high] }, '2026-10-08')).toBe(200);
  });

  it('is null when nothing is priced', () => {
    expect(tourFromPrice({ price: null, childPrice: null }, '2026-10-08')).toBeNull();
    expect(tourFromPrice({ price: 0, childPrice: null }, '2026-10-08')).toBeNull();
  });

  it('behaves exactly like the old base price for tours without seasons', () => {
    expect(tourFromPrice({ ...base }, '2026-10-08')).toBe(150);
  });
});
