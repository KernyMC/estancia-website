// 301 desde las URLs de WordPress. Fuente: docs/URL-MAP.md. En el VPS se generan también para Caddy/nginx.
import { readFileSync } from 'node:fs';

const posts = JSON.parse(readFileSync(new URL('./posts.json', import.meta.url), 'utf8'));

const pages = {
  '/menu-list-austin/': '/austin/menu/',
  '/menu-list-leander/': '/leander/menu/',
  '/brunch/': '/menu/brunch/',
  '/bar/': '/menu/bar/',
  '/sides/': '/menu/sides/',
  '/salad-bar/': '/menu/salad-bar/',
  '/dessert/': '/menu/dessert/',
  '/prime-meat-steakhouse/': '/menu/churrasco/',
  '/coastal-collection/': '/specials/',
  '/leander-bar-and-patio/': '/leander/bar-and-patio/',
  '/reserve-your-table/': '/reserve/',
  '/takeout/': '/order/',
  '/gift-card/': '/gift-cards/',
  '/estancia-ecard/': '/gift-cards/',
  '/group-dining/': '/private-dining/',
  '/group-dining-leander/': '/leander/private-dining/',
  '/group-dining-calculator/': '/private-dining/',
  '/events-calculator-leander/': '/leander/private-dining/',
  '/group-dining-confirmed/': '/private-dining/',
  '/holidays-schedule/': '/holidays/',
  '/weekly-specials/': '/specials/',
  '/watch-party-schedule/': '/events/',
  '/employee-application/': '/careers/',
  '/privacy-policy/': '/privacy/',
  '/google-reviews/': '/',
  '/estancias-news/': '/news/',
  '/martini-tasting-2/': '/events/',
  '/wine-dinner-caymus/': '/events/',
  '/estancia-summer-special-tasting/': '/events/',
  '/estancia-19anniversary/': '/events/daou-tasting/',
  '/a-taste-of-fall/': '/events/a-taste-of-fall/',
  '/category/churrasco/': '/news/topic/churrasco/',
  '/category/events/': '/news/topic/events/',
  '/category/group-dining/': '/news/topic/group-dining/',
  '/category/happy-hour/': '/news/topic/happy-hour/',
  '/category/news/': '/news/topic/news/',
  '/category/uncategorised/': '/news/',
};

export const redirects = {
  ...pages,
  ...Object.fromEntries(posts.map((p) => [`/${p.slug}/`, `/news/${p.slug}/`])),
};
