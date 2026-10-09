/**
 * Shared checkout submission logic for BookingForm (single "Book now"
 * purchase) and CartDrawer (multi-item purchase) — extracted so the PayPal
 * SDK v6 integration exists in exactly one place. Both callers can be open
 * on the same page at once (a tour page's booking dialog + the cart
 * drawer), so `sdkLoadPromise` is a genuine module-level singleton: the SDK
 * script tag must only ever be injected once regardless of how many
 * checkout UIs exist.
 *
 * Never import src/server from here — this module ships to the browser.
 */

export interface CheckoutItemPayload {
  type: 'tour' | 'cruise';
  slug: string;
  adults: number;
  children: number;
  departureStart?: string;
  /** Tour only — requested end date (see departureStart). */
  departureEnd?: string;
  /** Tour only — slug of the selected paid activity variant, if any. */
  addOnSlug?: string;
}

export interface CheckoutCustomer {
  name: string;
  email: string;
  phone?: string;
}

export interface CheckoutPayload {
  items: CheckoutItemPayload[];
  customer: CheckoutCustomer;
}

export interface CheckoutFailure {
  error: string;
}

/** POST /api/checkout and redirect to Stripe's hosted page. Returns only on failure. */
export async function startStripeCheckout(payload: CheckoutPayload): Promise<CheckoutFailure | void> {
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.ok && json.url) {
      window.location.href = json.url;
      return;
    }
    return { error: json.error ?? 'Something went wrong. Please try again.' };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

let sdkLoadPromise: Promise<void> | null = null;

function loadPayPalSdk(sandbox: boolean): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = sandbox
      ? 'https://www.sandbox.paypal.com/web-sdk/v6/core'
      : 'https://www.paypal.com/web-sdk/v6/core';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.head.appendChild(script);
  });
  return sdkLoadPromise;
}

export interface PaypalMountOptions {
  /** Element carrying data-paypal-client-id / data-paypal-section, and the
   * [data-paypal-btn]/[data-paypal-loading]/[data-paypal-buttons]
   * children BookingForm/CartDrawer already render. */
  section: HTMLElement;
  /** Returns the checkout payload, or null if the caller's own validation
   * failed (e.g. form.reportValidity()) — mounting aborts the order in that case. */
  buildPayload: () => CheckoutPayload | null;
  onError: (message: string) => void;
}

/** Loads the SDK (once, ever) and wires the PayPal button inside `section`. */
export async function mountPaypalButtons(opts: PaypalMountOptions): Promise<void> {
  const { section, buildPayload, onError } = opts;
  const clientId = section.dataset.paypalClientId as string;
  const sandbox = (section.dataset.paypalSection ?? 'sandbox') !== 'live';

  try {
    await loadPayPalSdk(sandbox);
    const paypalGlobal = (window as any).paypal;
    const sdkInstance = await paypalGlobal.createInstance({
      clientId,
      // Venmo removed deliberately: PayPal itself already covers that
      // buyer flow, no reason to offer it as a separate button too.
      components: ['paypal-payments'],
      pageType: 'checkout',
    });

    const eligible = await sdkInstance.findEligibleMethods({ currencyCode: 'USD' });

    const sessionOptions = {
      async onApprove(data: { orderId: string }) {
        try {
          const res = await fetch('/api/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: data.orderId }),
          });
          const json = await res.json();
          if (json.ok) {
            window.location.href = `/booking/success?paypal_order_id=${encodeURIComponent(data.orderId)}`;
            return;
          }
          onError(json.error ?? 'Payment could not be confirmed.');
        } catch {
          onError('Network error confirming payment. Please contact us.');
        }
      },
      onCancel() {
        // Buyer closed the PayPal window — no error, they may just retry.
      },
      onError(err: unknown) {
        console.error('[paypal] payment error:', err);
        onError('PayPal payment error. Please try again or use a card.');
      },
    };

    function createOrder() {
      const payload = buildPayload();
      if (!payload) return Promise.reject(new Error('form incomplete'));
      return fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data.orderId) throw new Error(data.error ?? 'Could not start PayPal checkout');
          return { orderId: data.orderId };
        });
    }

    let anyEligible = false;

    if (eligible.isEligible('paypal')) {
      anyEligible = true;
      const session = sdkInstance.createPayPalOneTimePaymentSession(sessionOptions);
      const btn = section.querySelector<HTMLElement>('[data-paypal-btn]')!;
      btn.removeAttribute('hidden');
      btn.addEventListener('click', () => {
        session.start({ presentationMode: 'auto' }, createOrder()).catch(() => {});
      });
    }

    const loadingEl = section.querySelector<HTMLElement>('[data-paypal-loading]')!;
    const buttonsEl = section.querySelector<HTMLElement>('[data-paypal-buttons]')!;
    loadingEl.hidden = true;
    if (anyEligible) {
      buttonsEl.hidden = false;
      requestAnimationFrame(() => buttonsEl.classList.add('is-visible'));
    } else {
      section.hidden = true;
    }
  } catch (err) {
    console.error('[paypal] SDK init failed:', err);
    section.hidden = true;
  }
}
