import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Domain logic only — UI is verified manually / e2e.
    include: ['src/server/**/*.test.ts', 'src/lib/**/*.test.ts'],
    environment: 'node',
    // src/server/env.ts validates at import time; tests never hit real
    // services (deps are injected), these just satisfy the schema.
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      STRIPE_SECRET_KEY: 'rk_test_vitest',
      STRIPE_WEBHOOK_SECRET: 'whsec_vitest',
      PUBLIC_SITE_URL: 'http://localhost:4321',
    },
  },
});
