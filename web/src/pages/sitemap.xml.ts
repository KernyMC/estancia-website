/**
 * Dynamic sitemap. Enumerates real content — static pages plus every ship,
 * tour and stay — so it stays correct as content is added, with no manual
 * upkeep. The stock @astrojs/sitemap integration can't see SSR [slug] routes,
 * hence this endpoint. Ships/tours come from local JSON, stays from Sanity.
 */
import type { APIRoute } from 'astro';
import { getShips, getTours, getStays, getTourCategories } from '../lib/content';
import { SITE_URL } from '../lib/seo';

const STATIC_PATHS = [
  '/',
  '/cruises/',
  '/tours/',
  '/stays/',
  '/about/',
  '/contact/',
  '/guide/',
  '/faq/',
  '/terms/',
  '/privacy/',
  '/cookies/',
];

export const GET: APIRoute = async () => {
  const [ships, tours, stays, tourCategories] = await Promise.all([
    getShips(),
    getTours(),
    getStays(),
    getTourCategories(),
  ]);

  const paths = [
    ...STATIC_PATHS,
    ...ships.map((s) => `/cruises/${s.slug}/`),
    ...tourCategories.map((c) => `/tours/${c.slug}/`),
    ...tours.map((t) => `/tours/${t.slug}/`),
    ...stays.map((s) => (s.slug === 'condo-galapagos' ? '/condo-galapagos/' : `/stays/${s.slug}/`)),
  ];

  const urls = paths
    .map((p) => `  <url><loc>${new URL(p, SITE_URL).href}</loc></url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Cache at the edge/CDN — content changes rarely, no need to rebuild per hit.
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
