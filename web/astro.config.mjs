// @ts-check
import { defineConfig } from 'astro/config';

import node from '@astrojs/node';

/**
 * 301s del WordPress viejo → Astro. Mapa investigado 2026-09-09 vía el MCP
 * de WordPress (URLs reales, no adivinadas) — ver docs/log.md ese mismo día
 * para el detalle completo y los casos sin match. En WP tanto cruceros como
 * tours vivían bajo el post type `st_tour` (taxonomía `cruises` los distingue),
 * por eso comparten el mismo prefijo `/st_tour/<slug>/` de origen.
 */
const CRUISE_SLUGS = [
  'galaxy-orion-yacht',
  'bonita-yacht',
  'ecogalaxy-catamaran',
  'galaxy-diver-iii',
  'galaxy-diver-ii',
  'galaxy-stella',
  'alya-catamaran',
  'galaxy-sirius-catamaran',
];

const TOUR_SLUGS = [
  'kicker-rock',
  'tour-to-the-tunnels-isabela-island',
  'day-land-tour-santa-cruz-2',
  'day-snorkeling-at-pinzon-island-and-landing-on-santa-cruz-tour',
  'day-land-tour-north-seymour-2',
  'espanola-island-day-trip',
  'floreana-island-day-trip',
  'isabela-island-all-inclusive',
  'tour-to-the-tunnels-all-inclusive',
  'tintoreras-and-tortuga-rock',
  'gordonrocks-diving-tour',
  '7-day-adventure',
  'snorkeling-santa-fe',
  '6-day-adventure',
  '5-days-adventure',
  '4-day-adventure',
  'diving-tour-north-seymour',
  'day-land-tour-south-plaza',
  '8-day-adventure',
  'tour-to-bartolome-island',
];

const redirects = {
  ...Object.fromEntries(CRUISE_SLUGS.map((slug) => [`/st_tour/${slug}/`, `/cruises/${slug}/`])),
  ...Object.fromEntries(TOUR_SLUGS.map((slug) => [`/st_tour/${slug}/`, `/tours/${slug}/`])),

  // "X Day Cruise" — posts viejos sin barco identificable (título genérico,
  // meta vacío). Al hub de cruceros en vez de inventar a cuál barco eran.
  '/st_tour/5-days-cruise-orio/': '/cruises/',
  '/st_tour/4-days-cruise/': '/cruises/',
  '/st_tour/6-days-cruise-c/': '/cruises/',
  '/st_tour/6-days-cruise/': '/cruises/',

  // Post viejo duplicado del mismo tour (mismo título, dos entradas en WP).
  '/st_tour/day-land-tour-bartolome/': '/tours/tour-to-bartolome-island/',

  // Tours discontinuados, sin equivalente en el catálogo actual.
  '/st_tour/san-cristobal-360/': '/tours/',
  '/st_tour/isla-lobos/': '/tours/',

  // Stays
  '/st_hotel/galapagosandbeyond-hotel-with-breakfast-and-sauna/': '/condo-galapagos/',
  '/st_hotel/galapagos-beyond-quito-condo/': '/stays/quito-condos/',

  // Páginas estáticas y hubs de tours (varias URLs viejas colapsan en una categoría nueva)
  '/privacy-policy/': '/privacy/',
  '/daily-tours-galapagos-and-beyond/': '/tours/day-tours/',
  '/day-land-tours-galapagos-and-beyond/': '/tours/day-tours/',
  '/divingtours-galapagosandbeyond/': '/tours/diving/',
  '/all-inclusive-tours/': '/tours/multi-day/',
};

// https://astro.build/config
export default defineConfig({
  // Dominio final confirmado 2026-09-09 (ver docs/deploy-staging.md). Se usa
  // para canonical y URLs absolutas del JSON-LD (ver lib/seo.ts).
  site: 'https://www.galapagosandbeyond.com',
  output: 'server',
  redirects,
  adapter: node({
    mode: 'standalone'
  })
});