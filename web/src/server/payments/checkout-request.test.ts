import { describe, it, expect } from 'vitest';
import { checkoutRequestSchema, cartQuoteRequestSchema } from './checkout-request';
import { MAX_CART_ITEMS } from '../pricing/pricing';

const customer = { name: 'Ana', email: 'ana@example.com' };
const tourItem = { type: 'tour', slug: 'bartolome', adults: 2 };
const cruiseItem = { type: 'cruise', slug: 'galaxy-sirius', departureStart: '2026-09-01', adults: 1 };

describe('checkoutRequestSchema', () => {
  it('accepts a single-item cart', () => {
    const result = checkoutRequestSchema.safeParse({ items: [tourItem], customer });
    expect(result.success).toBe(true);
  });

  it('accepts a multi-item cart mixing tours and cruises', () => {
    const result = checkoutRequestSchema.safeParse({ items: [tourItem, cruiseItem], customer });
    expect(result.success).toBe(true);
  });

  it('defaults children to 0 when omitted', () => {
    const result = checkoutRequestSchema.parse({ items: [tourItem], customer });
    expect(result.items[0]!.children).toBe(0);
  });

  it('rejects an empty items array', () => {
    const result = checkoutRequestSchema.safeParse({ items: [], customer });
    expect(result.success).toBe(false);
  });

  it(`rejects more than ${MAX_CART_ITEMS} items`, () => {
    const items = Array.from({ length: MAX_CART_ITEMS + 1 }, () => tourItem);
    const result = checkoutRequestSchema.safeParse({ items, customer });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown item type', () => {
    const result = checkoutRequestSchema.safeParse({
      items: [{ type: 'stay', slug: 'x', adults: 1 }],
      customer,
    });
    expect(result.success).toBe(false);
  });

  it('requires departureStart for a cruise item', () => {
    const result = checkoutRequestSchema.safeParse({
      items: [{ type: 'cruise', slug: 'galaxy-sirius', adults: 1 }],
      customer,
    });
    expect(result.success).toBe(false);
  });
});

describe('cartQuoteRequestSchema', () => {
  it('accepts items without a customer', () => {
    const result = cartQuoteRequestSchema.safeParse({ items: [tourItem, cruiseItem] });
    expect(result.success).toBe(true);
  });

  it('rejects an empty cart', () => {
    const result = cartQuoteRequestSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });
});
