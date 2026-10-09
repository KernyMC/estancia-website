/**
 * Shared checkout request shape, validated with Zod. Both payment routes
 * (/api/checkout for Stripe, /api/paypal/create-order for PayPal) accept the
 * exact same body — only what happens after quoting differs per provider.
 *
 * A checkout is always a cart of 1+ items: a direct "Book now" purchase is
 * just a cart with one line, so there is only ever one checkout code path.
 */
import { z } from 'zod';
import { MAX_CART_ITEMS } from '../pricing/pricing';
import { noHeaderInjection } from './validation';

const customerSchema = z.object({
  name: z.string().trim().min(1).max(200).regex(noHeaderInjection, 'invalid characters'),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(50).regex(noHeaderInjection, 'invalid characters').optional(),
});

/**
 * `\d{4}-\d{2}-\d{2}` alone accepts calendar nonsense like 2026-02-31 — this
 * round-trips through Date to reject anything that isn't a real day. The
 * BookingForm date inputs never produce those, but this schema is also what
 * a direct API call hits, so it can't rely on client-side `<input type=date>`
 * behavior alone.
 */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}, 'not a real calendar date');

export const cartItemSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('tour'),
      slug: z.string().min(1),
      adults: z.number().int(),
      children: z.number().int().default(0),
      addOnSlug: z.string().min(1).optional(),
      /** Requested dates — tours have no live calendar, so these aren't checked against real availability, only that they're valid, ordered calendar dates. */
      departureStart: isoDate.optional(),
      departureEnd: isoDate.optional(),
    })
    .refine((v) => Boolean(v.departureStart) === Boolean(v.departureEnd), {
      message: 'departureStart and departureEnd must be given together',
      path: ['departureEnd'],
    })
    .refine((v) => !v.departureStart || !v.departureEnd || v.departureEnd >= v.departureStart, {
      message: 'departureEnd must not be before departureStart',
      path: ['departureEnd'],
    }),
  z.object({
    type: z.literal('cruise'),
    slug: z.string().min(1),
    departureStart: isoDate,
    adults: z.number().int(),
    children: z.number().int().default(0),
  }),
]);

export const cartItemsSchema = z.array(cartItemSchema).min(1).max(MAX_CART_ITEMS);

export const checkoutRequestSchema = z.object({
  items: cartItemsSchema,
  customer: customerSchema,
});

/** Used by /api/cart/quote — pricing only, no customer, no side effects. */
export const cartQuoteRequestSchema = z.object({
  items: cartItemsSchema,
});

export type CartItem = z.infer<typeof cartItemSchema>;
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
