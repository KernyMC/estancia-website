/**
 * Payment provider port. Stripe is the only implementation today; PayPal
 * arrives as a second implementation of this same interface + its own pair
 * of API routes — nothing else changes.
 */
import type { QuotedCart } from '../pricing/pricing';
import type { CustomerInput } from '../orders/orders';

export interface CheckoutResult {
  provider: 'stripe' | 'paypal';
  /** Provider-side session/order id — stored on the order for reconciliation. */
  sessionId: string;
  /** Where to redirect the buyer to complete payment. */
  url: string;
}

export interface PaymentProvider {
  createCheckout(cart: QuotedCart, customer: CustomerInput): Promise<CheckoutResult>;
}
