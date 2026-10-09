import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QuotedCart, Quote } from '../pricing/pricing';

const oneItemQuote: Quote = {
  type: 'tour',
  itemSlug: 'bartolome',
  itemName: 'Bartolomé Day Tour',
  amountCents: 150099, // $1,500.99 — exercises cents → decimal-string rounding
  currency: 'usd',
  adults: 2,
  children: 0,
  description: '2 adults',
};

const oneItemCart: QuotedCart = {
  items: [oneItemQuote],
  totalCents: oneItemQuote.amountCents,
  currency: 'usd',
};

const twoItemCart: QuotedCart = {
  items: [
    oneItemQuote,
    {
      type: 'cruise',
      itemSlug: 'bonita-yacht',
      itemName: 'Bonita Yacht',
      amountCents: 369500,
      currency: 'usd',
      adults: 1,
      children: 0,
      departureStart: '2026-08-02',
      departureEnd: '2026-08-08',
      description: 'A · 1 adult',
    },
  ],
  totalCents: 150099 + 369500,
  currency: 'usd',
};

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 400,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

// The module caches its OAuth token at module scope (by design — see
// paypal.ts). Reset modules per test so each test starts uncached and the
// fetch mock queue (token call, then the real call) lines up predictably.
beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('paypal adapter', () => {
  it('createOrder sends a single purchase_unit with the total as a decimal string', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok', expires_in: 32400 }))
      .mockResolvedValueOnce(jsonResponse({ id: 'order_abc' }));
    vi.stubGlobal('fetch', fetchMock);
    const { createOrder } = await import('./paypal');

    const result = await createOrder(oneItemCart);

    expect(result.orderId).toBe('order_abc');
    const orderCall = fetchMock.mock.calls[1];
    const body = JSON.parse(orderCall[1].body);
    expect(body.purchase_units).toHaveLength(1);
    expect(body.purchase_units[0].amount.value).toBe('1500.99');
    expect(body.purchase_units[0].amount.currency_code).toBe('USD');
    expect(body.purchase_units[0].amount.breakdown.item_total.value).toBe('1500.99');
  });

  it('createOrder maps multiple cart items into one purchase_unit.items[] with the summed breakdown', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok', expires_in: 32400 }))
      .mockResolvedValueOnce(jsonResponse({ id: 'order_cart' }));
    vi.stubGlobal('fetch', fetchMock);
    const { createOrder } = await import('./paypal');

    const result = await createOrder(twoItemCart);

    expect(result.orderId).toBe('order_cart');
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.purchase_units).toHaveLength(1);
    expect(body.purchase_units[0].amount.value).toBe('5195.99');
    expect(body.purchase_units[0].amount.breakdown.item_total.value).toBe('5195.99');
    expect(body.purchase_units[0].items).toHaveLength(2);
    expect(body.purchase_units[0].items[0]).toMatchObject({
      quantity: '1',
      unit_amount: { currency_code: 'USD', value: '1500.99' },
      category: 'DIGITAL_GOODS',
      sku: 'bartolome',
    });
    expect(body.purchase_units[0].items[1]).toMatchObject({
      quantity: '1',
      unit_amount: { currency_code: 'USD', value: '3695.00' },
      category: 'DIGITAL_GOODS',
      sku: 'bonita-yacht',
    });
  });

  it('captureOrder reports completed=false for a non-COMPLETED status', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok', expires_in: 32400 }))
      .mockResolvedValueOnce(jsonResponse({ status: 'PENDING', purchase_units: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const { captureOrder } = await import('./paypal');

    const result = await captureOrder('order_abc', { amountCents: 150099, currency: 'usd' });
    expect(result.completed).toBe(false);
    expect(result.captureId).toBeNull();
  });

  it('captureOrder extracts the capture id when completed and amount matches', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok', expires_in: 32400 }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  { id: 'capture_xyz', status: 'COMPLETED', amount: { currency_code: 'USD', value: '1500.99' } },
                ],
              },
            },
          ],
        })
      );
    vi.stubGlobal('fetch', fetchMock);
    const { captureOrder } = await import('./paypal');

    const result = await captureOrder('order_abc', { amountCents: 150099, currency: 'usd' });
    expect(result.completed).toBe(true);
    expect(result.captureId).toBe('capture_xyz');
  });

  it('captureOrder throws when the captured amount does not match our DB total', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok', expires_in: 32400 }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  { id: 'capture_xyz', status: 'COMPLETED', amount: { currency_code: 'USD', value: '1.00' } },
                ],
              },
            },
          ],
        })
      );
    vi.stubGlobal('fetch', fetchMock);
    const { captureOrder } = await import('./paypal');

    await expect(captureOrder('order_abc', { amountCents: 150099, currency: 'usd' })).rejects.toThrow(
      'PayPal capture amount mismatch'
    );
  });

  it('throws when PayPal returns a non-ok response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok', expires_in: 32400 }))
      .mockResolvedValueOnce(jsonResponse({ error: 'INVALID' }, false));
    vi.stubGlobal('fetch', fetchMock);
    const { createOrder } = await import('./paypal');

    await expect(createOrder(oneItemCart)).rejects.toThrow('PayPal create order failed');
  });
});
