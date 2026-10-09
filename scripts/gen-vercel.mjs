// Genera vercel.json: 301 reales desde src/data/redirects.mjs y cabeceras de la demo.
// Uso: node scripts/gen-vercel.mjs [--index]   (--index quita el noindex, para producción real en Vercel)
import { writeFileSync } from 'node:fs';
import { redirects } from '../src/data/redirects.mjs';

const index = process.argv.includes('--index');
const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  framework: 'astro',
  trailingSlash: true,
  cleanUrls: false,
  redirects: Object.entries(redirects).map(([source, destination]) => ({ source, destination, permanent: true })),
  headers: [
    ...(index ? [] : [{ source: '/(.*)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]),
    { source: '/img/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/video/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/menus/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }] },
  ],
};
writeFileSync('vercel.json', JSON.stringify(config, null, 2) + '\n');
console.log(`vercel.json: ${config.redirects.length} redirects, ${index ? 'indexable' : 'noindex (demo)'}`);
