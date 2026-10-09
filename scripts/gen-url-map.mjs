// Regenera docs/URL-MAP.md desde src/data/redirects.mjs (única fuente de verdad de los 301).
import { writeFileSync } from 'node:fs';
import { redirects } from '../src/data/redirects.mjs';
const rows = Object.entries(redirects);
const pages = rows.filter(([from, to]) => !to.startsWith('/news/') || from.startsWith('/category/') || from === '/estancias-news/');
const posts = rows.filter(([from, to]) => to.startsWith('/news/') && !from.startsWith('/category/') && from !== '/estancias-news/');
const t = (r) => r.map(([a, b]) => `| \`${a}\` | \`${b}\` |`).join('\n');
writeFileSync('docs/URL-MAP.md', `# Mapa de URLs (WordPress → Astro)

Generado por \`node scripts/gen-url-map.mjs\` desde \`src/data/redirects.mjs\`. Regla de oro 1: ninguna URL vieja sale sin destino; todos son 301 (ADR-004). El blog usa \`/news/\` (decisión del 2026-10-07).

**Mantienen la misma ruta (200):** \`/\`, \`/menu/\`, \`/austin/\`, \`/leander/\`, \`/locations/\`, \`/faq/\`, \`/contact/\`, \`/subscribe/\`, \`/holidays/\`, \`/thanksgiving/\`, \`/christmas/\`, \`/new-years/\`, \`/easter/\` y \`/fathersday/\` (estas últimas por estacionalidad; ver docs/PENDIENTES-HOLIDAYS.md).

## Páginas y categorías (${pages.length})

| URL actual | Destino |
|---|---|
${t(pages)}

## Posts (${posts.length}) → \`/news/<slug>/\`

| URL actual | Destino |
|---|---|
${t(posts)}

## Pendiente
- Eventos únicos vencidos (\`martini-tasting-2\`, \`wine-dinner-caymus\`, \`estancia-summer-special-tasting\`) apuntan a \`/events/\`; decidir si se recrean como eventos archivados.
- Calculadoras de grupo (\`/group-dining-calculator/\`, \`/events-calculator-leander/\`) apuntan a private dining; no hay precios públicos para reimplementarlas.
- En el VPS estos redirects deben replicarse en Caddy/nginx (hoy los emite Astro como páginas HTML con meta refresh).
`);
console.log(rows.length, 'redirects');
