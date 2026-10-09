# Mapa de URLs (WordPress → Astro)

Generado por `node scripts/gen-url-map.mjs` desde `src/data/redirects.mjs`. Regla de oro 1: ninguna URL vieja sale sin destino; todos son 301 (ADR-004). El blog usa `/news/` (decisión del 2026-10-07).

**Mantienen la misma ruta (200):** `/`, `/menu/`, `/austin/`, `/leander/`, `/locations/`, `/faq/`, `/contact/`, `/subscribe/`, `/holidays/`, `/thanksgiving/`, `/christmas/`, `/new-years/`, `/easter/` y `/fathersday/` (estas últimas por estacionalidad; ver docs/PENDIENTES-HOLIDAYS.md).

## Páginas y categorías (37)

| URL actual | Destino |
|---|---|
| `/menu-list-austin/` | `/austin/menu/` |
| `/menu-list-leander/` | `/leander/menu/` |
| `/brunch/` | `/menu/brunch/` |
| `/bar/` | `/menu/bar/` |
| `/sides/` | `/menu/sides/` |
| `/salad-bar/` | `/menu/salad-bar/` |
| `/dessert/` | `/menu/dessert/` |
| `/prime-meat-steakhouse/` | `/menu/churrasco/` |
| `/coastal-collection/` | `/specials/` |
| `/leander-bar-and-patio/` | `/leander/bar-and-patio/` |
| `/reserve-your-table/` | `/reserve/` |
| `/takeout/` | `/order/` |
| `/gift-card/` | `/gift-cards/` |
| `/estancia-ecard/` | `/gift-cards/` |
| `/group-dining/` | `/private-dining/` |
| `/group-dining-leander/` | `/leander/private-dining/` |
| `/group-dining-calculator/` | `/private-dining/` |
| `/events-calculator-leander/` | `/leander/private-dining/` |
| `/group-dining-confirmed/` | `/private-dining/` |
| `/holidays-schedule/` | `/holidays/` |
| `/weekly-specials/` | `/specials/` |
| `/watch-party-schedule/` | `/events/` |
| `/employee-application/` | `/careers/` |
| `/privacy-policy/` | `/privacy/` |
| `/google-reviews/` | `/` |
| `/estancias-news/` | `/news/` |
| `/martini-tasting-2/` | `/events/` |
| `/wine-dinner-caymus/` | `/events/` |
| `/estancia-summer-special-tasting/` | `/events/` |
| `/estancia-19anniversary/` | `/events/daou-tasting/` |
| `/a-taste-of-fall/` | `/events/a-taste-of-fall/` |
| `/category/churrasco/` | `/news/topic/churrasco/` |
| `/category/events/` | `/news/topic/events/` |
| `/category/group-dining/` | `/news/topic/group-dining/` |
| `/category/happy-hour/` | `/news/topic/happy-hour/` |
| `/category/news/` | `/news/topic/news/` |
| `/category/uncategorised/` | `/news/` |

## Posts (68) → `/news/<slug>/`

| URL actual | Destino |
|---|---|
| `/business-lunch-leander/` | `/news/business-lunch-leander/` |
| `/business-lunch-austin/` | `/news/business-lunch-austin/` |
| `/brazilian-steakhouse-lunch-vs-dinner/` | `/news/brazilian-steakhouse-lunch-vs-dinner/` |
| `/brunch-in-austin/` | `/news/brunch-in-austin/` |
| `/brunch-in-leander/` | `/news/brunch-in-leander/` |
| `/what-is-brazilian-vinaigrette/` | `/news/what-is-brazilian-vinaigrette/` |
| `/what-should-you-wear-to-a-brazilian-steakhouse/` | `/news/what-should-you-wear-to-a-brazilian-steakhouse/` |
| `/what-do-brazilians-eat-with-steak/` | `/news/what-do-brazilians-eat-with-steak/` |
| `/anniversary-dinner-leander/` | `/news/anniversary-dinner-leander/` |
| `/where-to-take-visiting-family-leander/` | `/news/where-to-take-visiting-family-leander/` |
| `/where-to-take-out-of-town-guests-austin/` | `/news/where-to-take-out-of-town-guests-austin/` |
| `/brazilian-steakhouse-for-families/` | `/news/brazilian-steakhouse-for-families/` |
| `/what-to-order-first-brazilian-steakhouse/` | `/news/what-to-order-first-brazilian-steakhouse/` |
| `/what-is-farofa/` | `/news/what-is-farofa/` |
| `/is-a-brazilian-steakhouse-worth-it/` | `/news/is-a-brazilian-steakhouse-worth-it/` |
| `/wine-tasting-wagner-family-dinner/` | `/news/wine-tasting-wagner-family-dinner/` |
| `/what-is-rodizio-dining/` | `/news/what-is-rodizio-dining/` |
| `/how-does-a-brazilian-steakhouse-work/` | `/news/how-does-a-brazilian-steakhouse-work/` |
| `/seafood-dinner-specials-austin-leander/` | `/news/seafood-dinner-specials-austin-leander/` |
| `/what-is-fraldinha/` | `/news/what-is-fraldinha/` |
| `/what-is-picanha/` | `/news/what-is-picanha/` |
| `/why-do-brazilian-steakhouses-serve-grilled-pineapple/` | `/news/why-do-brazilian-steakhouses-serve-grilled-pineapple/` |
| `/summer-dining-estancia-austin-leander/` | `/news/summer-dining-estancia-austin-leander/` |
| `/what-makes-brazilian-flan-different/` | `/news/what-makes-brazilian-flan-different/` |
| `/what-is-pao-de-queijo/` | `/news/what-is-pao-de-queijo/` |
| `/brazilian-rice-and-beans/` | `/news/brazilian-rice-and-beans/` |
| `/estancia-summer-special-austin-leander/` | `/news/estancia-summer-special-austin-leander/` |
| `/4th-of-july-at-estancia-20-off-brunch/` | `/news/4th-of-july-at-estancia-20-off-brunch/` |
| `/foods-americans-are-surprised-to-find-at-brazilian-steakhouse/` | `/news/foods-americans-are-surprised-to-find-at-brazilian-steakhouse/` |
| `/why-brazilians-stay-at-the-table-longer/` | `/news/why-brazilians-stay-at-the-table-longer/` |
| `/what-is-brazilian-lemonade/` | `/news/what-is-brazilian-lemonade/` |
| `/brazilian-valentines-day/` | `/news/brazilian-valentines-day/` |
| `/what-is-a-gaucho/` | `/news/what-is-a-gaucho/` |
| `/what-makes-a-brazilian-steakhouse-different-2/` | `/news/what-makes-a-brazilian-steakhouse-different-2/` |
| `/world-cup-watch-party/` | `/news/world-cup-watch-party/` |
| `/desserts-worth-saving-room-for/` | `/news/desserts-worth-saving-room-for/` |
| `/what-makes-a-brazilian-steakhouse-different/` | `/news/what-makes-a-brazilian-steakhouse-different/` |
| `/memorial-day-restaurant-special/` | `/news/memorial-day-restaurant-special/` |
| `/steakhouse-lunch/` | `/news/steakhouse-lunch/` |
| `/monday-night-steakhouse-special/` | `/news/monday-night-steakhouse-special/` |
| `/fathers-day-steakhouse-brunch/` | `/news/fathers-day-steakhouse-brunch/` |
| `/where-corporate-dinners-feel-effortless/` | `/news/where-corporate-dinners-feel-effortless/` |
| `/what-to-expect-brazilian-steakhouse/` | `/news/what-to-expect-brazilian-steakhouse/` |
| `/what-is-a-caipirinha/` | `/news/what-is-a-caipirinha/` |
| `/gourmet-salad-bar-brazilian-steakhouse/` | `/news/gourmet-salad-bar-brazilian-steakhouse/` |
| `/date-night-austin-leander/` | `/news/date-night-austin-leander/` |
| `/brazilian-steakhouse-meats/` | `/news/brazilian-steakhouse-meats/` |
| `/remote-work-austin-leander/` | `/news/remote-work-austin-leander/` |
| `/mothers-day-at-a-brazilian-restaurant/` | `/news/mothers-day-at-a-brazilian-restaurant/` |
| `/graduation-celebration-austin-leander/` | `/news/graduation-celebration-austin-leander/` |
| `/brazilian-takeout-austin-leander/` | `/news/brazilian-takeout-austin-leander/` |
| `/wine-dinner-austin-leander/` | `/news/wine-dinner-austin-leander/` |
| `/dining-with-food-allergies-austin-leander/` | `/news/dining-with-food-allergies-austin-leander/` |
| `/all-you-can-eat-brazilian-steakhouse-experience/` | `/news/all-you-can-eat-brazilian-steakhouse-experience/` |
| `/easter-celebration-austin-leander/` | `/news/easter-celebration-austin-leander/` |
| `/brazilian-steakhouse-for-celebrations/` | `/news/brazilian-steakhouse-for-celebrations/` |
| `/patio-grand-opening-in-leander/` | `/news/patio-grand-opening-in-leander/` |
| `/where-to-eat-during-events-in-austin-and-leander/` | `/news/where-to-eat-during-events-in-austin-and-leander/` |
| `/martini-tasting-in-austin-and-leander/` | `/news/martini-tasting-in-austin-and-leander/` |
| `/happy-hour-austin-leander/` | `/news/happy-hour-austin-leander/` |
| `/celebrate-your-big-day-at-estancia/` | `/news/celebrate-your-big-day-at-estancia/` |
| `/weekly-restaurant-specials/` | `/news/weekly-restaurant-specials/` |
| `/valentines-weekend-at-estancia-steakhouse/` | `/news/valentines-weekend-at-estancia-steakhouse/` |
| `/group-dining-for-the-holidays/` | `/news/group-dining-for-the-holidays/` |
| `/brazilian-steakhouse-leander-tx/` | `/news/brazilian-steakhouse-leander-tx/` |
| `/austin-wine-events-duckhorn-dinner/` | `/news/austin-wine-events-duckhorn-dinner/` |
| `/private-dining-in-austin/` | `/news/private-dining-in-austin/` |
| `/happy-hour-in-austin/` | `/news/happy-hour-in-austin/` |

## Pendiente
- Eventos únicos vencidos (`martini-tasting-2`, `wine-dinner-caymus`, `estancia-summer-special-tasting`) apuntan a `/events/`; decidir si se recrean como eventos archivados.
- Calculadoras de grupo (`/group-dining-calculator/`, `/events-calculator-leander/`) apuntan a private dining; no hay precios públicos para reimplementarlas.
- En el VPS estos redirects deben replicarse en Caddy/nginx (hoy los emite Astro como páginas HTML con meta refresh).
