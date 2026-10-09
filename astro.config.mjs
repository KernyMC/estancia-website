import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { redirects } from './src/data/redirects.mjs';

export default defineConfig({
  site: 'https://estancia.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  redirects,
  integrations: [sitemap({ filter: (page) => !/\/(privacy|terms|404)\/?$/.test(page) })],
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
});
