/**
 * Stripe webhook processing, separated from the HTTP route so the logic is
 * unit-testable with injected dependencies.
 *
 * Guarantees:
 *   - Signature verified against the raw request body (never parsed JSON).
 *   - Idempotent: an event id already in WebhookEvent is a successful no-op
 *     (Stripe retries and can deliver duplicates).
 *   - Events are recorded AFTER successful processing, so a crash mid-way
 *     lets Stripe's retry re-attempt the work.
 */
import type Stripe from 'stripe';
import { stripe } from './stripe';
import { env } from '../env';
import { db } from '../db';
import {
  markStripePaid,
  markStripeExpired,
  markStripeFailed,
  markStripeRefundedByPaymentIntent,
  getOrderByStripeSession,
  OrderTransitionError,
} from '../orders/orders';
import { sendOrderEmails, sendRefundEmails } from '../email/sender';

export interface WebhookOutcome {
  status: number;
  message: string;
}

export interface WebhookDeps {
  verify: (rawBody: string, signature: string) => Stripe.Event;
  isProcessed: (eventId: string) => Promise<boolean>;
  recordProcessed: (eventId: string, type: string) => Promise<void>;
  markPaid: typeof markStripePaid;
  markExpired: typeof markStripeExpired;
  markFailed: typeof markStripeFailed;
  markRefunded: typeof markStripeRefundedByPaymentIntent;
  notifyPaid: (stripeSessionId: string) => Promise<void>;
  notifyRefunded: (stripePaymentIntentId: string) => Promise<void>;
}

const defaultDeps: WebhookDeps = {
  verify: (rawBody, signature) =>
    stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET),
  isProcessed: async (eventId) =>
    Boolean(await db.webhookEvent.findUnique({ where: { stripeEventId: eventId } })),
  recordProcessed: async (eventId, type) => {
    await db.webhookEvent.create({ data: { stripeEventId: eventId, type } });
  },
  markPaid: markStripePaid,
  markExpired: markStripeExpired,
  markFailed: markStripeFailed,
  markRefunded: markStripeRefundedByPaymentIntent,
  notifyPaid: async (stripeSessionId) => {
    const order = await getOrderByStripeSession(stripeSessionId);
    if (order) await sendOrderEmails(order);
  },
  notifyRefunded: async (stripePaymentIntentId) => {
    const order = await db.order.findUnique({
      where: { stripePaymentIntentId },
      include: { customer: true, items: { orderBy: { position: 'asc' } } },
    });
    if (order) await sendRefundEmails(order);
  },
};

export async function handleStripeWebhook(
  rawBody: string,
  signature: string | null,
  deps: WebhookDeps = defaultDeps
): Promise<WebhookOutcome> {
  if (!signature) return { status: 400, message: 'missing stripe-signature header' };

  let event: Stripe.Event;
  try {
    event = deps.verify(rawBody, signature);
  } catch {
    return { status: 400, message: 'invalid signature' };
  }

  if (await deps.isProcessed(event.id)) {
    return { status: 200, message: 'duplicate event, already processed' };
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // Deferred payment methods (ACH direct debit, bank transfers, ...)
        // fire this event with payment_status "unpaid" — the actual result
        // arrives later as checkout.session.async_payment_succeeded/failed.
        // Only mark paid here for methods that settle immediately (card,
        // etc.), or we'd confirm a booking before the money has moved.
        if (session.payment_status === 'paid') {
          await deps.markPaid(
            session.id,
            typeof session.payment_intent === 'string' ? session.payment_intent : null
          );
          await deps.notifyPaid(session.id);
        }
        break;
      }
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        await deps.markPaid(
          session.id,
          typeof session.payment_intent === 'string' ? session.payment_intent : null
        );
        await deps.notifyPaid(session.id);
        break;
      }
      case 'checkout.session.async_payment_failed': {
        await deps.markFailed(event.data.object.id);
        break;
      }
      case 'checkout.session.expired': {
        await deps.markExpired(event.data.object.id);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId =
          typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        if (paymentIntentId) {
          await deps.markRefunded(paymentIntentId);
          await deps.notifyRefunded(paymentIntentId);
        }
        break;
      }
      default:
        // Unhandled event types are acknowledged, not errors — the Dashboard
        // decides what gets sent here.
        break;
    }
  } catch (err) {
    // Illegal transition = permanent condition (e.g. expiry arriving after
    // payment, or a refund event for a booking we don't have on record):
    // retrying will never succeed, so acknowledge and move on. Anything else
    // (db down, etc.) propagates → 500 → Stripe retries.
    if (err instanceof OrderTransitionError) {
      console.warn(`[webhook] ignored ${event.type} for out-of-state booking:`, err.message);
      await deps.recordProcessed(event.id, event.type);
      return { status: 200, message: 'event ignored: booking not in a valid state' };
    }
    throw err;
  }

  await deps.recordProcessed(event.id, event.type);
  return { status: 200, message: 'ok' };
}
