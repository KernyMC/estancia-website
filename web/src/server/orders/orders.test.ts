import { describe, it, expect, vi } from 'vitest';
import {
  markStripePaid,
  markStripeExpired,
  markPaypalPaid,
  markStripeRefundedByPaymentIntent,
  createPendingStripeOrder,
  expireStaleOrders,
  OrderTransitionError,
} from './orders';
import type { PrismaClient, OrderStatus } from '../generated/prisma/client';
import type { QuotedCart } from '../pricing/pricing';

/** Minimal Prisma mock: findUniqueOrThrow returns an order in `status`. */
function clientWith(status: OrderStatus) {
  const update = vi.fn(async (args: { data: Record<string, unknown> }) => ({
    id: 'order_1',
    status: args.data.status,
  }));
  const client = {
    order: {
      findUniqueOrThrow: vi.fn(async () => ({ id: 'order_1', status })),
      update,
    },
  } as unknown as PrismaClient;
  return { client, update };
}

describe('stripe order transitions', () => {
  it('pending → paid stores the payment intent', async () => {
    const { client, update } = clientWith('pending');
    const result = await markStripePaid('cs_test_123', 'pi_123', client);
    expect(result.status).toBe('paid');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'paid', stripePaymentIntentId: 'pi_123' }),
      })
    );
  });

  it('pending → expired is legal', async () => {
    const { client } = clientWith('pending');
    await expect(markStripeExpired('cs_test_123', client)).resolves.toBeDefined();
  });

  it('expired → paid is rejected (late webhook after expiry)', async () => {
    const { client, update } = clientWith('expired');
    await expect(markStripePaid('cs_test_123', 'pi_123', client)).rejects.toThrow(OrderTransitionError);
    expect(update).not.toHaveBeenCalled();
  });

  it('paid → expired is rejected (expiry webhook after payment)', async () => {
    const { client, update } = clientWith('paid');
    await expect(markStripeExpired('cs_test_123', client)).rejects.toThrow(OrderTransitionError);
    expect(update).not.toHaveBeenCalled();
  });

  it('paid → paid is rejected (duplicate completion)', async () => {
    const { client } = clientWith('paid');
    await expect(markStripePaid('cs_test_123', 'pi_123', client)).rejects.toThrow(OrderTransitionError);
  });
});

describe('stripe refunds', () => {
  it('paid → refunded is legal, looked up by payment intent', async () => {
    const { client, update } = clientWith('paid');
    const result = await markStripeRefundedByPaymentIntent('pi_123', client);
    expect(result.status).toBe('refunded');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'refunded' }) })
    );
  });

  it('pending → refunded is rejected (no payment to refund)', async () => {
    const { client } = clientWith('pending');
    await expect(markStripeRefundedByPaymentIntent('pi_123', client)).rejects.toThrow(OrderTransitionError);
  });

  it('refunded → refunded is rejected (duplicate refund event)', async () => {
    const { client, update } = clientWith('refunded');
    await expect(markStripeRefundedByPaymentIntent('pi_123', client)).rejects.toThrow(OrderTransitionError);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('paypal order transitions', () => {
  it('pending → paid stores the capture id', async () => {
    const { client, update } = clientWith('pending');
    const result = await markPaypalPaid('order_123', 'capture_123', client);
    expect(result.status).toBe('paid');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'paid', paypalCaptureId: 'capture_123' }),
      })
    );
  });

  it('paid → paid is rejected (duplicate capture confirmation)', async () => {
    const { client } = clientWith('paid');
    await expect(markPaypalPaid('order_123', 'capture_123', client)).rejects.toThrow(OrderTransitionError);
  });
});

describe('creating a multi-item order', () => {
  function cartClient() {
    const created: unknown[] = [];
    const upsert = vi.fn(async () => ({ id: 'cust_1' }));
    const create = vi.fn(async (args: { data: Record<string, unknown> }) => {
      created.push(args.data);
      return { id: 'order_1', ...args.data };
    });
    const client = {
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
        fn({ customer: { upsert }, order: { create } })
      ),
    } as unknown as PrismaClient;
    return { client, create, upsert };
  }

  const cart: QuotedCart = {
    currency: 'usd',
    totalCents: 45000,
    items: [
      {
        type: 'tour',
        itemSlug: 'kayak-day-tour',
        itemName: 'Kayak Day Tour',
        amountCents: 15000,
        currency: 'usd',
        adults: 1,
        children: 0,
        description: '1 adult',
      },
      {
        type: 'cruise',
        itemSlug: 'bonita-yacht',
        itemName: 'Bonita Yacht',
        amountCents: 30000,
        currency: 'usd',
        adults: 1,
        children: 0,
        departureStart: '2026-08-02',
        departureEnd: '2026-08-08',
        description: 'A · 1 adult',
      },
    ],
  };

  it('creates the customer and the order with N line items in one transaction', async () => {
    const { client, create, upsert } = cartClient();
    await createPendingStripeOrder(
      { cart, customer: { name: 'Ana', email: 'ana@example.com' }, stripeSessionId: 'cs_test_1' },
      client
    );

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0]![0].data as { amountCents: number; items: { create: unknown[] } };
    expect(data.amountCents).toBe(45000);
    expect(data.items.create).toHaveLength(2);
  });

  it('stamps each line item with a stable position matching cart order', async () => {
    const { client, create } = cartClient();
    await createPendingStripeOrder(
      { cart, customer: { name: 'Ana', email: 'ana@example.com' }, stripeSessionId: 'cs_test_1' },
      client
    );

    const data = create.mock.calls[0]![0].data as { items: { create: Array<{ position: number; itemSlug: string }> } };
    expect(data.items.create[0]).toMatchObject({ position: 0, itemSlug: 'kayak-day-tour' });
    expect(data.items.create[1]).toMatchObject({ position: 1, itemSlug: 'bonita-yacht' });
  });
});

describe('expireStaleOrders', () => {
  function updateManyClient(count: number) {
    const updateMany = vi.fn(async (_args: { where: { status: string; createdAt: { lt: Date } }; data: { status: string } }) => ({
      count,
    }));
    const client = { order: { updateMany } } as unknown as PrismaClient;
    return { client, updateMany };
  }

  it('flips pending orders older than the cutoff to expired', async () => {
    const { client, updateMany } = updateManyClient(3);
    const result = await expireStaleOrders(24, client);

    expect(result).toEqual({ expiredCount: 3 });
    expect(updateMany).toHaveBeenCalledWith({
      where: { status: 'pending', createdAt: { lt: expect.any(Date) } },
      data: { status: 'expired' },
    });
  });

  it('uses a cutoff roughly `olderThanHours` in the past', async () => {
    const { client, updateMany } = updateManyClient(0);
    const before = Date.now();
    await expireStaleOrders(24, client);

    const cutoff = updateMany.mock.calls[0]![0].where.createdAt.lt as Date;
    const expected = before - 24 * 60 * 60 * 1000;
    expect(Math.abs(cutoff.getTime() - expected)).toBeLessThan(5000);
  });

  it('never touches paid/refunded/expired/failed orders (updateMany filter, not app logic)', async () => {
    const { client, updateMany } = updateManyClient(0);
    await expireStaleOrders(24, client);

    expect(updateMany.mock.calls[0]![0].where.status).toBe('pending');
  });
});
