/**
 * llms.txt — the emerging standard (llmstxt.org) that gives AI systems a clean,
 * curated map of the site. Generated from real content (ships/tours/stays) so
 * it never drifts from what's actually published. Markdown body, served as
 * text/plain at /llms.txt.
 */
import type { APIRoute } from 'astro';
import { getShips, getTours, getStays } from '../lib/content';
import { SITE_URL, SITE_NAME } from '../lib/seo';

const abs = (path: string) => new URL(path, SITE_URL).href;

export const GET: APIRoute = async () => {
  const [ships, tours, stays] = await Promise.all([getShips(), getTours(), getStays()]);

  const shipLines = ships
    .map((s) => `- [${s.name}](${abs(`/cruises/${s.slug}/`)}): ${s.category?.name ?? ''} Galápagos cruise, ${s.boatType}`)
    .join('\n');

  const tourLines = tours
    .map((t) => {
      const summary = (t.description || '').replace(/\s+/g, ' ').trim().slice(0, 120);
      return `- [${t.name}](${abs(`/tours/${t.slug}/`)}): ${t.category?.name ?? 'Tour'}${summary ? `, ${summary}` : ''}`;
    })
    .join('\n');

  const stayLines = stays
    .map((s) => {
      const href = s.slug === 'condo-galapagos' ? '/condo-galapagos/' : `/stays/${s.slug}/`;
      return `- [${s.name}](${abs(href)}): ${s.location ?? 'Ecuador'}`;
    })
    .join('\n');

  const body = `# ${SITE_NAME}

> Ecuador-based specialists in Galápagos cruises, island tours and stays. We
> operate a fleet of small ships across the archipelago with live availability,
> run guided day and multi-day tours, and host guests in our own aparthotel in
> Santa Cruz and condos in Quito. Everything below is bookable directly.

## Galápagos cruises
${shipLines || '- (none published yet)'}

## Tours
${tourLines || '- (none published yet)'}

## Stays
${stayLines || '- (none published yet)'}

## About
- [About Galápagos & Beyond](${abs('/about/')}): Who we are and how we operate on the ground in Ecuador.
- [Contact](${abs('/contact/')}): Plan a trip or request a custom quote.
- [Travel guide](${abs('/guide/')}): Practical guidance for visiting the Galápagos.
- [FAQ](${abs('/faq/')}): Common questions about Galápagos travel.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
