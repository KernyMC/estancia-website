## Architecture rules (enforced by convention — read before adding code)

Layers depend in ONE direction only: `src/pages` (HTTP/UI) → `src/server` (domain) → adapters (Stripe, PayPal, Prisma, SMTP). Never import `src/server` from client-side scripts.

- **`src/lib/`** — read-side data access: content (`content.ts`), availability cache (`availability.ts`, `cache.ts`). No secrets, no side effects beyond caching.
- **`src/scripts/`** — browser-only client state and checkout submission (`cart-store.ts`, `checkout-client.ts`). Runs in the page, not the server: **never imports `src/server`**, never trusts its own data as a price (see below). Imported from `<script>` blocks in `.astro` components (`BookingForm`, `CartDrawer`, `CardActions`, `Header`, `AvailabilityTable`), never from `.astro` frontmatter.
- **`src/server/`** — anything with secrets or side effects: db, payments, email, pricing, orders. Env vars are read ONLY via `src/server/env.ts` (Zod-validated at boot; add new vars there + `.env.example`).
- **API routes are thin**: parse → validate with Zod → call a `src/server` service → map result to `Response`. Business logic lives in services, never in routes.
- **Money is integer cents** (`amountCents: Int`), never floats. Currency explicit.
- **Checkout is always a cart of 1+ items** — there is no separate single-item code path. A direct "Book now" purchase (`BookingForm.astro`) is a cart of exactly one line; `CartDrawer.astro` is the same cart with N lines. Both POST `{ items: [...], customer }` to `/api/checkout` or `/api/paypal/create-order`.
- **Prices are computed ONLY in `src/server/pricing/pricing.ts`**: `quote()` prices one line, `quoteCart()` prices the whole array (sequential, fail-fast, rejects duplicate/empty/oversized carts) — never trust an amount from the browser, including `localStorage` display hints in `cart-store.ts` (those exist only so the drawer has something to paint before `/api/cart/quote` responds).
- **Order status changes go ONLY through `src/server/orders/orders.ts`** (legal-transition table). One `Order` = one payment transaction (status, provider, Stripe/PayPal refs, total); its `Booking` rows are line items — snapshots of what was bought, with no payment state of their own, because Stripe/PayPal don't support partial success within one session/order. Customers are never deleted.
- **Two payment providers, deliberately NOT forced into one interface**: Stripe is a hosted redirect (`src/server/payments/stripe.ts` + `stripe-webhook.ts`, webhook-confirmed, idempotent via `WebhookEvent`, cart items map straight to `line_items[]`); PayPal is inline SDK v6 buttons (`src/server/payments/paypal.ts` + `/api/paypal/create-order` + `/api/paypal/capture-order`, confirmed synchronously by our own server-side capture call — no webhook dependency for MVP; a cart is always ONE `purchase_unit` with an `items[]` breakdown, never one `purchase_unit` per line). Both share `Order.provider` + the same `QuotedCart`/`CustomerInput` shapes and the same `checkout-request.ts` Zod schema (`{ items: CartItem[], customer }`). Both are "absent-safe": missing Stripe env vars fail boot loudly (core to the site); missing PayPal env vars just disable `/api/paypal/*` (501) and hide the buttons — see `paypalConfigured` in `env.ts`.
- **The PayPal SDK integration exists in exactly one place**: `src/scripts/checkout-client.ts` (`startStripeCheckout` + `mountPaypalButtons`, including the `sdkLoadPromise` singleton — the SDK script tag must load once even when `BookingForm`'s dialog and `CartDrawer` are both mounted on the same page). `BookingForm.astro` and `CartDrawer.astro` both call into it instead of duplicating the SDK calls.
- **Refunds**: Stripe's `charge.refunded` webhook event flips an order to `refunded` via `stripePaymentIntentId` (charges don't carry a session id) — always the whole order, no per-line partial refund. PayPal refunds are not yet wired (no PayPal webhook configured) — process those manually in the PayPal dashboard for now and update the order status by hand if needed.
- **Tests (Vitest)** cover `src/server` domain logic with injected fake deps — run `pnpm test`. New domain code gets a `.test.ts` next to it.
- Prisma 7: schema in `prisma/schema.prisma`, connection URL in `prisma.config.ts`, generated client at `src/server/generated/prisma` (gitignored — run `pnpm prisma generate`). Migrations via `pnpm db:migrate` (interactive) — if running non-interactively, use `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` to generate the SQL by hand into a new `prisma/migrations/<ts>_<name>/migration.sql`, then `prisma migrate deploy`. Never hand-written SQL beyond that.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
