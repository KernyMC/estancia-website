/**
 * Server-side environment configuration, validated once at module load.
 *
 * Every secret-bearing module (db, stripe, email) reads from here — never
 * from process.env directly — so a missing or malformed variable fails loudly
 * at boot with a clear message instead of surfacing as a runtime mystery.
 *
 * SMTP vars are optional as a group: when absent, the email sender logs to
 * console instead of sending (useful before Hostinger credentials arrive).
 *
 * The @astrojs/node adapter does NOT load .env into process.env itself
 * (confirmed in Astro's docs) — only the OS/host environment is read at
 * runtime. Loading dotenv here covers local dev; in production (Dokploy)
 * env vars are injected directly into the container process, so this
 * call finds no .env file and is a no-op.
 */
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),

  /**
   * Which deployment this process is. Anything other than 'production' gets
   * an `X-Robots-Tag: noindex` from the middleware — staging serves the same
   * copy as production and would otherwise compete for the same queries.
   */
  SITE_ENV: z.enum(['production', 'staging', 'development']).default('development'),

  STRIPE_SECRET_KEY: z
    .string()
    .regex(/^(rk|sk)_(test|live)_/, 'expected a Stripe restricted (rk_) or secret (sk_) key'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),

  /** Absolute origin used to build Stripe success/cancel URLs, e.g. http://localhost:4321 */
  PUBLIC_SITE_URL: z.string().url(),

  /**
   * Shared secret for /api/cron/*. Optional as a group, like SMTP: unset (local
   * dev) leaves the endpoint open so it can be curled by hand; set, it becomes
   * mandatory. It must be set on any public deployment — that route is the one
   * place allowed to make the ~26s live vendor call, so an open one is a free
   * amplification handle for anybody who finds the URL.
   */
  CRON_SECRET: z.string().min(16).optional(),

  /**
   * Shared secret configured on the Sanity webhook (sanity.io/manage → API →
   * Webhooks). Optional like CRON_SECRET, but for the opposite reason: if
   * unset, /api/sanity-revalidate stays fully disabled (501) rather than
   * open — an unauthenticated caller who could hit it would force every
   * cached Sanity query to refetch, defeating the whole point of the cache.
   */
  SANITY_REVALIDATE_SECRET: z.string().min(16).optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  /** Where team notifications (new booking / new inquiry) are sent. */
  BOOKING_NOTIFY_EMAIL: z.string().email().optional(),

  /**
   * PayPal (Orders API v2 + JS SDK v6). Optional as a group: without these,
   * /api/paypal/* routes respond 501 and the frontend simply doesn't render
   * the PayPal button — same "absent adapter is safe" pattern as SMTP.
   *
   * PUBLIC_PAYPAL_CLIENT_ID is not a secret (PayPal's own docs say it's safe
   * in frontend code) — it's PUBLIC_-prefixed so Vite exposes it to the
   * browser bundle. Server code reads it too via process.env for the OAuth
   * basic-auth call, since dotenv loads all vars regardless of prefix.
   */
  PUBLIC_PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_ENV: z.enum(['sandbox', 'live']).default('sandbox'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`[env] Invalid server environment:\n${issues}`);
}

export const env = parsed.data;

/**
 * Refuses to boot local dev with live payment keys or a remote (staging/prod)
 * database — both loaded silently once already (see docs/log.md 2026-07-20
 * near-incident with an accidentally-created rk_live_ key, and the
 * 2026-08-01 staging .env getting overwritten with a local one). A wrong
 * `.env` shouldn't be able to charge a real card or touch a real database
 * without a deliberate opt-in.
 */
if (env.SITE_ENV === 'development' && process.env.ALLOW_LIVE_KEYS_LOCALLY !== 'yes') {
  const reasons = [
    /_live_/.test(env.STRIPE_SECRET_KEY) && 'STRIPE_SECRET_KEY is a LIVE key (sk_live_/rk_live_)',
    env.PAYPAL_ENV === 'live' && 'PAYPAL_ENV=live',
    /gab-(staging|production)-db/.test(env.DATABASE_URL) && 'DATABASE_URL points at a staging/production database',
  ].filter((r): r is string => Boolean(r));

  if (reasons.length > 0) {
    throw new Error(
      `[env] Refusing to start local dev — this .env looks like staging/production, not local:\n${reasons
        .map((r) => `  - ${r}`)
        .join('\n')}\n` +
        `If this is intentional, set ALLOW_LIVE_KEYS_LOCALLY=yes. Otherwise run \`pnpm env:test\` to restore the local/sandbox profile.`
    );
  }
}

export const smtpConfigured = Boolean(
  env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS
);

export const paypalConfigured = Boolean(env.PUBLIC_PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);

export const sanityRevalidateConfigured = Boolean(env.SANITY_REVALIDATE_SECRET);
