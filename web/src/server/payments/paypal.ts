/**
 * PayPal adapter: OAuth2 client-credentials token (cached) + Orders API v2.
 *
 * Unlike Stripe's hosted-redirect Checkout Session, PayPal's v6 SDK renders
 * inline buttons on our own page — the "session" lives in the browser, and
 * our server only ever does two authoritative calls: create the order
 * (server-priced, never trusting a client amount) and capture it once the
 * buyer approves. Capture is synchronous and its response IS the source of
 * truth for payment success — no webhook dependency needed for this MVP
 * (PayPal webhooks for disputes/later refunds are a future addition).
 */
import { env, paypalConfigured } from '../env';
import type { QuotedCart } from '../pricing/pricing';

const API_BASE =
  env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const basicAuth = Buffer.from(`${env.PUBLIC_PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString(
    'base64'
  );
  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal OAuth token request failed: ${res.status}`);

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}

interface PayPalOrderResponse {
  id: string;
}

/**
 * A cart is one PayPal purchase_unit (PayPal is single-merchant here) with a
 * line per item — not one purchase_unit per item, which is for split
 * payments to different payees, not what this is. `amount.value` must equal
 * `amount.breakdown.item_total.value` when there's no tax/shipping/discount,
 * which itself must equal the sum of `unit_amount * quantity` across items —
 * since every amount here is already integer cents converted the same way,
 * the decimal strings reconcile exactly with no rounding risk.
 */
export async function createOrder(cart: QuotedCart): Promise<{ orderId: string }> {
  const itemTotalCents = cart.items.reduce((sum, q) => sum + q.amountCents, 0);
  if (itemTotalCents !== cart.totalCents) {
    throw new Error(`cart total mismatch: items sum to ${itemTotalCents}, cart.totalCents is ${cart.totalCents}`);
  }

  const currencyCode = cart.currency.toUpperCase();
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: `${cart.items.length} trip${cart.items.length === 1 ? '' : 's'} — Galápagos & Beyond`.slice(
            0,
            127
          ),
          amount: {
            currency_code: currencyCode,
            value: centsToDecimalString(cart.totalCents),
            breakdown: {
              item_total: { currency_code: currencyCode, value: centsToDecimalString(itemTotalCents) },
            },
          },
          items: cart.items.map((quote) => ({
            name: quote.itemName.slice(0, 127),
            description: quote.description.slice(0, 127),
            quantity: '1',
            unit_amount: { currency_code: currencyCode, value: centsToDecimalString(quote.amountCents) },
            // Trips are a service, not a shippable good — PayPal skips
            // collecting a shipping address for DIGITAL_GOODS.
            category: 'DIGITAL_GOODS',
            sku: quote.itemSlug.slice(0, 127),
          })),
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`PayPal create order failed: ${res.status} ${await res.text()}`);
  }
  const order = (await res.json()) as PayPalOrderResponse;
  return { orderId: order.id };
}

export interface CaptureResult {
  completed: boolean;
  captureId: string | null;
}

interface PayPalCaptureResponse {
  status: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount?: { currency_code: string; value: string };
      }>;
    };
  }>;
}

/**
 * `expected` is the amount/currency our own DB has on file for this order
 * (server-priced at checkout, never trusts anything from the client) — the
 * capture response is cross-checked against it so a captured PayPal payment
 * can never be recorded as paying for more/less than what was actually
 * charged.
 */
export async function captureOrder(
  orderId: string,
  expected: { amountCents: number; currency: string }
): Promise<CaptureResult> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`PayPal capture failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as PayPalCaptureResponse;
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0] ?? null;
  const captureId = capture?.id ?? null;

  if (data.status !== 'COMPLETED' || !capture || capture.status !== 'COMPLETED') {
    return { completed: false, captureId };
  }

  const capturedCents = capture.amount ? Math.round(parseFloat(capture.amount.value) * 100) : NaN;
  const currencyMatches = capture.amount?.currency_code === expected.currency.toUpperCase();
  if (capturedCents !== expected.amountCents || !currencyMatches) {
    throw new Error(
      `PayPal capture amount mismatch: got ${capture.amount?.value} ${capture.amount?.currency_code}, expected ${expected.amountCents} ${expected.currency}`
    );
  }

  return { completed: true, captureId };
}

export { paypalConfigured };
