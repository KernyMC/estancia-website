/**
 * Order lifecycle. All status changes go through this module so illegal
 * transitions (e.g. re-paying an expired order, expiring a paid one) are
 * impossible regardless of what order webhooks/captures arrive in.
 *
 *   pending ── paid ── refunded
 *      ├────── expired   (Stripe: checkout.session.expired webhook; PayPal
 *      │                  and any missed Stripe webhook: expireStaleOrders()
 *      │                  cron sweep below)
 *      └────── failed
 *
 * An Order is one payment transaction; its Booking rows are line items
 * (snapshots of what was bought) with no payment state of their own — Stripe
 * and PayPal don't support partial success within one session/order, so all
 * items in an Order share exactly one status.
 *
 * Stripe (hosted redirect) and PayPal (inline SDK buttons) are different
 * enough flows that they keep separate reference columns and marker
 * functions rather than a forced-shared "providerRef" abstraction — see
 * OrderProvider in schema.prisma.
 *
 * The Prisma client is injectable for unit tests; default is the real db.
 */
import type { PrismaClient, Order, OrderStatus, Prisma } from '../generated/prisma/client';
import { db } from '../db';
import type { QuotedCart } from '../pricing/pricing';

/** Accepts either the top-level client or the client handed to a $transaction callback. */
type Db = PrismaClient | Prisma.TransactionClient;

export interface CustomerInput {
  name: string;
  email: string;
  phone?: string;
}

export type OrderWithItems = Order & {
  customer: { id: string; email: string; name: string; phone: string | null; createdAt: Date };
  items: Array<{
    id: string;
    type: string;
    itemSlug: string;
    itemName: string;
    departureStart: string | null;
    departureEnd: string | null;
    adults: number;
    children: number;
    amountCents: number;
    position: number;
  }>;
};

const LEGAL_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'expired', 'failed'],
  paid: ['refunded'],
  expired: [],
  failed: [],
  refunded: [],
};

export class OrderTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`illegal order transition ${from} -> ${to}`);
    this.name = 'OrderTransitionError';
  }
}

/**
 * Called from an unauthenticated, unpaid checkout start (createPendingOrder)
 * — anyone can submit any email here. If a Customer row already exists for
 * that email, we must not let this request overwrite its name/phone (that
 * would let an attacker who knows a real customer's email quietly corrupt
 * their contact details before a legitimate purchase). Only a brand-new
 * customer gets these fields from the request.
 */
async function upsertCustomer(customer: CustomerInput, client: Db) {
  return client.customer.upsert({
    where: { email: customer.email.toLowerCase() },
    update: {},
    create: {
      email: customer.email.toLowerCase(),
      name: customer.name,
      phone: customer.phone,
    },
  });
}

function itemSnapshot(quote: QuotedCart['items'][number]) {
  return {
    type: quote.type,
    itemSlug: quote.itemSlug,
    itemName: quote.itemName,
    departureStart: quote.departureStart,
    departureEnd: quote.departureEnd,
    adults: quote.adults,
    children: quote.children,
    amountCents: quote.amountCents,
  };
}

async function createPendingOrder(
  args: {
    cart: QuotedCart;
    customer: CustomerInput;
    provider: 'stripe' | 'paypal';
    stripeSessionId?: string;
    paypalOrderId?: string;
  },
  client: PrismaClient
): Promise<OrderWithItems> {
  return client.$transaction(async (tx) => {
    const customerRow = await upsertCustomer(args.customer, tx);
    return tx.order.create({
      data: {
        provider: args.provider,
        amountCents: args.cart.totalCents,
        currency: args.cart.currency,
        stripeSessionId: args.stripeSessionId,
        paypalOrderId: args.paypalOrderId,
        customerId: customerRow.id,
        items: {
          create: args.cart.items.map((quote, index) => ({ ...itemSnapshot(quote), position: index })),
        },
      },
      include: { customer: true, items: { orderBy: { position: 'asc' } } },
    });
  });
}

export async function createPendingStripeOrder(
  args: { cart: QuotedCart; customer: CustomerInput; stripeSessionId: string },
  client: PrismaClient = db
): Promise<OrderWithItems> {
  return createPendingOrder({ ...args, provider: 'stripe' }, client);
}

export async function createPendingPaypalOrder(
  args: { cart: QuotedCart; customer: CustomerInput; paypalOrderId: string },
  client: PrismaClient = db
): Promise<OrderWithItems> {
  return createPendingOrder({ ...args, provider: 'paypal' }, client);
}

async function transitionByLookup(
  where: { stripeSessionId: string } | { paypalOrderId: string } | { stripePaymentIntentId: string },
  to: OrderStatus,
  extra: Record<string, unknown>,
  client: PrismaClient
): Promise<Order> {
  const order = await client.order.findUniqueOrThrow({ where });

  if (!LEGAL_TRANSITIONS[order.status].includes(to)) {
    throw new OrderTransitionError(order.status, to);
  }

  return client.order.update({
    where: { id: order.id },
    data: { status: to, ...extra },
  });
}

export async function markStripePaid(
  stripeSessionId: string,
  stripePaymentIntentId: string | null,
  client: PrismaClient = db
): Promise<Order> {
  return transitionByLookup(
    { stripeSessionId },
    'paid',
    stripePaymentIntentId ? { stripePaymentIntentId } : {},
    client
  );
}

export async function markStripeExpired(stripeSessionId: string, client: PrismaClient = db): Promise<Order> {
  return transitionByLookup({ stripeSessionId }, 'expired', {}, client);
}

/** Deferred payment method (e.g. ACH, bank transfer) failed after checkout.session.completed fired. */
export async function markStripeFailed(stripeSessionId: string, client: PrismaClient = db): Promise<Order> {
  return transitionByLookup({ stripeSessionId }, 'failed', {}, client);
}

/** Called right after a successful server-side PayPal capture call (authoritative). */
export async function markPaypalPaid(
  paypalOrderId: string,
  paypalCaptureId: string | null,
  client: PrismaClient = db
): Promise<Order> {
  return transitionByLookup(
    { paypalOrderId },
    'paid',
    paypalCaptureId ? { paypalCaptureId } : {},
    client
  );
}

/** Stripe `charge.refunded` webhook — charges carry a payment intent id, not a session id. */
export async function markStripeRefundedByPaymentIntent(
  stripePaymentIntentId: string,
  client: PrismaClient = db
): Promise<Order> {
  return transitionByLookup({ stripePaymentIntentId }, 'refunded', {}, client);
}

/** Includes customer + items — needed by email templates and the success page. */
export async function getOrderByStripeSession(
  stripeSessionId: string,
  client: PrismaClient = db
): Promise<OrderWithItems | null> {
  return client.order.findUnique({
    where: { stripeSessionId },
    include: { customer: true, items: { orderBy: { position: 'asc' } } },
  });
}

/**
 * A checkout that was started and never finished: Stripe checkout sessions
 * expire on their own and fire checkout.session.expired (handled in
 * stripe-webhook.ts), but that event can be missed (e.g. staging still runs
 * a placeholder STRIPE_WEBHOOK_SECRET that fails signature verification) and
 * PayPal orders have no equivalent expiry event at all — they'd otherwise
 * stay `pending` forever. Bulk `pending -> expired` (a legal transition) for
 * anything older than the cutoff; called on a schedule, see
 * api/cron/expire-stale-orders.ts.
 */
export async function expireStaleOrders(
  olderThanHours = 24,
  client: PrismaClient = db
): Promise<{ expiredCount: number }> {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  const result = await client.order.updateMany({
    where: { status: 'pending', createdAt: { lt: cutoff } },
    data: { status: 'expired' },
  });
  return { expiredCount: result.count };
}

export async function getOrderByPaypalOrder(
  paypalOrderId: string,
  client: PrismaClient = db
): Promise<OrderWithItems | null> {
  return client.order.findUnique({
    where: { paypalOrderId },
    include: { customer: true, items: { orderBy: { position: 'asc' } } },
  });
}
