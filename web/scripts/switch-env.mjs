#!/usr/bin/env node
/**
 * Swaps which env profile `.env` points to, so switching between sandbox/test
 * and live credentials locally is one command instead of hand-editing keys
 * (and risking leaving a live one in place — see docs/log.md 2026-07-20).
 *
 * Usage:
 *   pnpm env:test    - copy .env.test  -> .env  (sandbox/test, safe default)
 *   pnpm env:live    - copy .env.live  -> .env  (asks for typed confirmation)
 *   pnpm env:status   - print which profile the current .env looks like
 */
import fs from 'node:fs';
import readline from 'node:readline/promises';

const cwd = process.cwd();
const ACTIVE = `${cwd}/.env`;

function readEnv(path) {
  if (!fs.existsSync(path)) return null;
  const text = fs.readFileSync(path, 'utf8');
  const vars = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) vars[m[1]] = m[2];
  }
  return vars;
}

function describe(vars) {
  if (!vars) return ['(no .env file)'];
  const lines = [];
  lines.push(`SITE_ENV=${vars.SITE_ENV ?? '(unset, defaults to development)'}`);
  lines.push(
    `STRIPE_SECRET_KEY: ${/_live_/.test(vars.STRIPE_SECRET_KEY ?? '') ? '⚠️  LIVE' : 'test'}`
  );
  lines.push(`PAYPAL_ENV: ${vars.PAYPAL_ENV === 'live' ? '⚠️  LIVE' : (vars.PAYPAL_ENV ?? 'sandbox')}`);
  const db = vars.DATABASE_URL ?? '';
  const dbLabel = /gab-staging-db/.test(db)
    ? '⚠️  staging'
    : /gab-production-db/.test(db)
      ? '⚠️  PRODUCTION'
      : 'local';
  lines.push(`DATABASE_URL: ${dbLabel}`);
  return lines;
}

const cmd = process.argv[2];

if (cmd === 'status') {
  console.log('Active .env profile:\n');
  describe(readEnv(ACTIVE)).forEach((l) => console.log('  ' + l));
  process.exit(0);
}

if (cmd === 'test') {
  const src = `${cwd}/.env.test`;
  if (!fs.existsSync(src)) {
    console.error(`Missing ${src}. Create it once from your current sandbox/test .env.`);
    process.exit(1);
  }
  fs.copyFileSync(src, ACTIVE);
  console.log('Switched to TEST/sandbox profile.');
  process.exit(0);
}

if (cmd === 'live') {
  const src = `${cwd}/.env.live`;
  if (!fs.existsSync(src)) {
    console.error(
      `Missing ${src}. Create it by copying .env.test and swapping in live Stripe/PayPal keys.`
    );
    process.exit(1);
  }
  console.log('This will load LIVE payment credentials into your local .env.');
  describe(readEnv(src)).forEach((l) => console.log('  ' + l));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('\nType SI to confirm: ');
  rl.close();
  if (answer.trim() !== 'SI') {
    console.log('Cancelled.');
    process.exit(1);
  }
  fs.copyFileSync(src, ACTIVE);
  console.log(
    'Switched to LIVE profile. The server will still refuse to boot unless you also set ALLOW_LIVE_KEYS_LOCALLY=yes.'
  );
  process.exit(0);
}

console.error('Usage: node scripts/switch-env.mjs <test|live|status>');
process.exit(1);
