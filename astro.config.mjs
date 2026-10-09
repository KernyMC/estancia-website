import { defineConfig } from 'astro/config';
import { existsSync, readFileSync } from 'node:fs';
import sitemap from '@astrojs/sitemap';
import { redirects } from './src/data/redirects.mjs';

// Solo en desarrollo: sirve api/chat.js (en producción lo ejecuta Vercel como función).
const devApi = {
  name: 'dev-api-chat',
  configureServer(server) {
    // Vite no vuelca .env a process.env; la función (que en Vercel lee process.env) lo necesita en dev.
    for (const f of ['.env', '.env.local']) {
      if (!existsSync(f)) continue;
      for (const line of readFileSync(f, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.*?)\s*$/);
        if (m && !line.trim().startsWith('#')) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
      }
    }
    server.middlewares.use('/api/chat', async (req, res) => {
      const { default: handler } = await import(`./api/chat.js?t=${Date.now()}`);
      await handler(req, res);
    });
  },
};

export default defineConfig({
  site: 'https://estancia.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  redirects,
  integrations: [sitemap({ filter: (page) => !/\/(privacy|terms|404)\/?$/.test(page) })],
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  vite: { plugins: [devApi] },
});
