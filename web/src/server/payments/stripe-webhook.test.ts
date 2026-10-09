import { describe, it, expect, vi } from 'vitest';
import { handleStripeWebhook, type WebhookDeps } from './stripe-webhook';
import type Stripe from 'stripe';

function makeEvent(type: string, id = 'evt_1', sessionOverrides: Record<string, unknown> = {}): Stripe.Event {
  return {
    id,
    type,
    data: { object: { id: 'cs_test_123', payment_intent: 'pi_123', payment_status: 'paid', ...sessionOverrides } },
  } as unknown as Stripe.Event;
}

function makeDeps(overrides: Partial<WebhookDeps> = {}): WebhookDeps {
  return {
    verify: vi.fn(() => makeEvent('checkout.session.completed')),
    isProcessed: vi.fn(async () => false),
    recordProcessed: vi.fn(async () => {}),
    markPaid: vi.fn(async () => ({}) as never),
    markExpired: vi.fn(async () => ({}) as never),
    markFailed: vi.fn(async () => ({}) as never),
    markRefunded: vi.fn(async () => ({}) as never),
    notifyPaid: vi.fn(async () => {}),
    notifyRefunded: vi.fn(async () => {}),
    ...overrides,
  };
}

describe('handleStripeWebhook', () => {
  it('rejects a missing signature header with 400', async () => {
    const deps = makeDeps();
    const outcome = await handleStripeWebhook('{}', null, deps);
    expect(outcome.status).toBe(400);
    expect(deps.markPaid).not.toHaveBeenCalled();
  });

  it('rejects an invalid signature with 400 and does nothing', async () => {
    const deps = makeDeps({
      verify: vi.fn(() => {
        throw new Error('bad signature');
      }),
    });
    const outcome = await handleStripeWebhook('{}', 't=1,v1=bad', deps);
    expect(outcome.status).toBe(400);
    expect(deps.markPaid).not.toHaveBeenCalled();
    expect(deps.recordProcessed).not.toHaveBeenCalled();
  });

  it('treats a duplicate event as a successful no-op', async () => {
    const deps = makeDeps({ isProcessed: vi.fn(async () => true) });
    const outcome = await handleStripeWebhook('{}', 'sig', deps);
    expect(outcome.status).toBe(200);
    expect(deps.markPaid).not.toHaveBeenCalled();
    expect(deps.recordProcessed).not.toHaveBeenCalled();
  });

  it('completed → markPaid + notify + record', async () => {
    const deps = makeDeps();
    const outcome = await handleStripeWebhook('{}', 'sig', deps);
    expect(outcome.status).toBe(200);
    expect(deps.markPaid).toHaveBeenCalledWith('cs_test_123', 'pi_123');
    expect(deps.notifyPaid).toHaveBeenCalledWith('cs_test_123');
    expect(deps.recordProcessed).toHaveBeenCalledWith('evt_1', 'checkout.session.completed');
  });

  it('completed with an unpaid (deferred) payment_status does not mark paid yet', async () => {
    const deps = makeDeps({
      verify: vi.fn(() => makeEvent('checkout.session.completed', 'evt_1', { payment_status: 'unpaid' })),
    });
    const outcome = await handleStripeWebhook('{}', 'sig', deps);
    expect(outcome.status).toBe(200);
    expect(deps.markPaid).not.toHaveBeenCalled();
    expect(deps.notifyPaid).not.toHaveBeenCalled();
    expect(deps.recordProcessed).toHaveBeenCalledWith('evt_1', 'checkout.session.completed');
  });

  it('async_payment_succeeded → markPaid + notify (deferred method settled)', async () => {
    const deps = makeDeps({ verify: vi.fn(() => makeEvent('checkout.session.async_payment_succeeded')) });
    const outcome = await handleStripeWebhook('{}', 'sig', deps);
    expect(outcome.status).toBe(200);
    expect(deps.markPaid).toHaveBeenCalledWith('cs_test_123', 'pi_123');
    expect(deps.notifyPaid).toHaveBeenCalledWith('cs_test_123');
  });

  it('async_payment_failed → markFailed', async () => {
    const deps = makeDeps({ verify: vi.fn(() => makeEvent('checkout.session.async_payment_failed')) });
    await handleStripeWebhook('{}', 'sig', deps);
    expect(deps.markFailed).toHaveBeenCalledWith('cs_test_123');
    expect(deps.markPaid).not.toHaveBeenCalled();
  });

  it('expired → markExpired', async () => {
    const deps = makeDeps({ verify: vi.fn(() => makeEvent('checkout.session.expired')) });
    await handleStripeWebhook('{}', 'sig', deps);
    expect(deps.markExpired).toHaveBeenCalledWith('cs_test_123');
    expect(deps.markPaid).not.toHaveBeenCalled();
  });

  it('charge.refunded → markRefunded + notify, keyed by payment intent', async () => {
    const deps = makeDeps({ verify: vi.fn(() => makeEvent('charge.refunded')) });
    const outcome = await handleStripeWebhook('{}', 'sig', deps);
    expect(outcome.status).toBe(200);
    expect(deps.markRefunded).toHaveBeenCalledWith('pi_123');
    expect(deps.notifyRefunded).toHaveBeenCalledWith('pi_123');
  });

  it('acknowledges unhandled event types without side effects', async () => {
    const deps = makeDeps({ verify: vi.fn(() => makeEvent('customer.created')) });
    const outcome = await handleStripeWebhook('{}', 'sig', deps);
    expect(outcome.status).toBe(200);
    expect(deps.markPaid).not.toHaveBeenCalled();
    expect(deps.markExpired).not.toHaveBeenCalled();
    expect(deps.recordProcessed).toHaveBeenCalled();
  });

  it('acknowledges illegal transitions with 200 (retry would never succeed)', async () => {
    const { OrderTransitionError } = await import('../orders/orders');
    const deps = makeDeps({
      markPaid: vi.fn(async () => {
        throw new OrderTransitionError('expired', 'paid');
      }),
    });
    const outcome = await handleStripeWebhook('{}', 'sig', deps);
    expect(outcome.status).toBe(200);
    expect(deps.recordProcessed).toHaveBeenCalledWith('evt_1', 'checkout.session.completed');
  });

  it('propagates processing failures so Stripe retries (event NOT recorded)', async () => {
    const deps = makeDeps({
      markPaid: vi.fn(async () => {
        throw new Error('db down');
      }),
    });
    await expect(handleStripeWebhook('{}', 'sig', deps)).rejects.toThrow('db down');
    expect(deps.recordProcessed).not.toHaveBeenCalled();
  });
});
