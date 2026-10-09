# Estado de la migración

Checklist vivo. Actualizar cuando algo cambia de columna — no hace falta
detalle de "cómo", eso vive en el log o en el código mismo.

## Hecho

- [x] Stack y decisiones de infra cerradas (VPS+Dokploy, Sanity, Stripe+PayPal,
  Postgres+Prisma) — ver `docs/adr/`.
- [x] Content model unificado en Sanity: `trip` (con `kind`), `ship`, `stay`,
  `review`, `destination`, `island`, `activityTag` — schemas desplegados.
- [x] `sanity-plugin-media` instalado y configurado.
- [x] Pipeline de fotos local (Ollama qwen3-coder:30b texto, sin visión) +
  dHash dedupe + `webp-batch-app` para compresión — construido y corrido.
- [x] Alt-text corregido tras QA manual del usuario (no inventa especies, no
  confunde tour en tierra con crucero).
- [x] 8 barcos migrados a Sanity con specs y fotos reales.
- [x] 20 documentos `trip` de tipo `cruise-itinerary` (itinerarios A/B/C de
  los barcos) migrados como documentos separados.
- [x] 19 tours migrados como `trip` (day-tour/multi-day/diving), con fotos
  reutilizando assets ya subidos (sin resubir).
- [x] Itinerarios de tours completados (faltaban en el scrape original):
  `itineraryDays` en los 5 Adventure multi-day (8/7/6/5/4 días) y `daySchedule`
  (campo nuevo en `trip`, horario por hora) en los 2 diving day-tours. Fuente:
  meta `tours_program` del plugin Traveler en WP. Publicados. Isabela All
  Inclusive quedó sin itinerario (su `tours_program` estaba vacío en WP).
- [x] 2 `stay` migrados.
- [x] Optimización de queries Sanity: `asset-cache.mjs` — una sola query
  trae todos los assets existentes antes de migrar, evita re-subir bytes.
- [x] Sitio Astro: design system, header/footer, home (jerarquía
  cruceros→tours→stays+reviews), hubs y fichas de cruceros/tours/stays,
  páginas legales + cookie banner, contact form.
- [x] `lib/availability.ts` + `lib/cache.ts`: patrón fresh/stale replicado
  del WP, cache-only durante render.
- [x] Sistema de documentación (`CLAUDE.md`, `CONTEXT.md`, `docs/`) creado
  2026-07-16, reemplaza los 3 `.md` sueltos de la raíz (excepto
  `cronograma-migracion.md`, que sigue intacto para gerencia).
- [x] `getReviews()`/`getAgencyReviews()`/`getStayReviews()` en
  `web/src/lib/content.ts` ya leen de Sanity (`review` type) — hecho fuera
  de esta sesión de docs, confirmar que sigue así antes de asumir más
  contenido conectado.
- [x] `web/src/pages/api/inquiry.ts` reescrito a Postgres+Zod+email — hecho
  fuera de esta sesión, no revertir.
- [x] SEO on-page + enlazado interno en cruceros (auditoría Voyagers adaptada):
  `lib/seo.ts` (JSON-LD Organization/Breadcrumb/FAQPage/Product), `Base.astro`
  con canonical+OG+ld-json, componentes `Breadcrumbs`/`FaqSection`, ficha y hub
  de cruceros con breadcrumbs, jump-nav, back-links hub↔barco, filtros por
  experiencia (derivados de activities reales), `site` en astro.config,
  `activityTags` en schema `ship`. Ver `docs/log.md` 2026-07-22.
- [x] SEO/enlazado replicado a tours y stays: breadcrumbs + canonical + JSON-LD
  (Product en tour, LodgingBusiness en stay) en `[slug]` y hubs.
- [x] GEO base: `robots.txt` (permite GPTBot/ClaudeBot/PerplexityBot + sitemap),
  `sitemap.xml` dinámico (enumera ships/tours/stays reales, 43 URLs) y
  `llms.txt` dinámico (llmstxt.org, generado del contenido real).
- [x] Logos de review cableados: `reviewSources.ts` apuntaba a archivos
  inexistentes (`/logos/airbnb.svg`) → estaban rotos; ahora usan los reales
  (`air-bnb-logo.svg`, `trip-advisor-logo.svg`) con w/h por aspect ratio.
- [x] Flujo de compra Fase 4 completo y probado end-to-end en sandbox:
  Postgres+Prisma (`Customer`/`Order`/`Booking`/`WebhookEvent`/`Inquiry`),
  pricing server-side, Stripe Checkout Session + webhook idempotente (incluye
  `charge.refunded` → `refunded`), PayPal Orders API v2 + botones inline SDK
  v6 (PayPal + Venmo) vía `/api/paypal/create-order` y `/capture-order`,
  emails (Nodemailer, cae a console.log sin SMTP), páginas
  `/booking/success` y `/booking/cancelled`. Arquitectura en
  `web/AGENTS.md`. Compra real de prueba con Stripe test hecha 2026-07-20
  (tarjeta 4242, webhook confirmado, idempotencia verificada). PayPal
  todavía sin probar end-to-end en navegador — solo integrado, no
  verificado con una compra sandbox real.
- [x] Página dedicada `/condo-galapagos/` (2026-07-29): schema `stay.floors`
  (pisos/unidades) + singleton `socialLinks` (WhatsApp/redes) en Sanity,
  `FloorSwitcher.astro` (selector visual de los 5 condos), CTA "Ask about
  availability" → WhatsApp (cae a `/contact/` si no hay número cargado). El
  doc real (antes `santa-cruz-aparthotel`) se renombró a slug
  `condo-galapagos` con los 5 pisos poblados desde los listings reales de
  Airbnb. Redirect 301 desde la ruta vieja. Hero de `/stays/` con imagen
  estática (`public/images/stays-hero.jpg`, el usuario la va a poner).
  Pendiente: número real de WhatsApp, fotos por piso, imagen del hero.
- [x] Carrito de compras multi-item + favoritos (2026-07-29): rediseño de
  backend de `Booking` (1:1 pago↔reserva) a `Order` (transacción: status,
  provider, refs de pago, total) + `Booking` como line item (snapshot,
  N por Order) — migración aplicada, `bookings/` renombrado a
  `src/server/orders/orders.ts`. Checkout unificado: `/api/checkout` y
  `/api/paypal/create-order` reciben `{items[], customer}` siempre (una
  compra directa de "Book now" es un carrito de 1). `quoteCart()` cotiza el
  array server-side; Stripe mapea a `line_items[]`, PayPal a un solo
  `purchase_unit` con `items[]`+breakdown. Un solo email por Order (no uno
  por item). Frontend: `src/scripts/cart-store.ts` (localStorage, sin login),
  `CardActions.astro` (favorito+carrito, animaciones CSS puras adaptadas de
  3 referencias React que dio el usuario) en las 5 cards del sitio + fila de
  disponibilidad de crucero + sidebar de tour, `CartDrawer.astro` (panel
  lateral con tabs Cart/Saved, precios vía `/api/cart/quote`), íconos en
  `Header.astro`. `checkout-client.ts` extrae el SDK de PayPal a un módulo
  compartido (antes duplicado si `BookingForm` y el drawer coexistían en la
  misma página). Probado end-to-end real: compra de 2 items (tour+crucero)
  desde el drawer hasta sesión de Stripe real con el total correcto. Compra
  con PayPal desde el drawer sin probar todavía (mismo pendiente que ya
  existía para `BookingForm`).
- [x] Emails de compra reales (2026-08-01): SMTP real vía Google Workspace
  (`smtp.gmail.com`, App Password, `info@galapagosandbeyond.com` — no
  Hostinger, cambio de plan). Plantillas HTML con marca (logo real vía
  Sanity CDN, botón WhatsApp + email en footer) para cliente y equipo,
  además del texto plano de siempre. Probado end-to-end real: compra Stripe
  test y compra PayPal sandbox (cuenta `sb-giymi52334591@personal.example.com`)
  ambas confirmadas, correos de cliente y de equipo recibidos en Gmail.
  Venmo sigue sin probarse.
- [x] Reviews de huéspedes reales cargadas en Sanity (confirmado 2026-08-01
  vía query directa): 5 documentos `review` — 3 de agencia (Danielle D,
  Yessica, Reilly_Peanut) y 2 del condo (Emily, Spencer).
- [x] Guardrail de credenciales locales (2026-08-01): `src/server/env.ts`
  rechaza arrancar `pnpm dev` si detecta clave Stripe/PayPal live o un
  `DATABASE_URL` de staging/producción, salvo `ALLOW_LIVE_KEYS_LOCALLY=yes`.
  `pnpm env:test` / `env:live` / `env:status` cambian de perfil de `.env`
  (`.env.test`/`.env.live`, gitignoreados) sin editar a mano.

- [x] Ships/tours conectados a Sanity (2026-08-01): `getShips`/`getShip`/
  `getTours`/`getTour` en `lib/content.ts` ahora consultan Sanity en vez de
  `web/src/data/ships.json`/`tours.json` (esos JSON quedan solo como fuente
  histórica para los scripts de `studio-galapagos-and-beyond-cms/scripts/`,
  ya no los importa el frontend). Los 8 barcos y 20 tours ya estaban subidos
  a Sanity desde una sesión previa (28 de julio) — lo que faltaba era el
  wiring de código, no los datos. Cambios de schema: se agregó `seo`
  (title/description/focusKeyword) a `ship` y `childPrice` a `trip` — ambos
  con datos reales parcheados desde los JSON vía `.patch().set()` (nunca
  recreate, para no pisar banners/galerías ya subidos a mano). El itinerario
  día-a-día ya no vive anidado en el `ship` — son documentos `trip`
  separados (`kind: cruise-itinerary`) referenciando al barco, se traen con
  un join GROQ. `category` de tour (day-tours/multi-day/diving) se deriva:
  `kind` para multi-day, un allowlist de 2 slugs para diving (Sanity no
  tiene ese kind). Campos muertos eliminados de las interfaces `Ship`/`Tour`
  (nunca los leía ningún componente): `brandColor`, `tourTypes`, `address`,
  `excerpt`. Verificado con `tsc`+`astro check` (0 errores) + 53 tests +
  smoke test por `curl` a las 7 rutas que dependen de esto (home, /tours/,
  /cruises/, detalle de tour y de crucero con itinerario real, sitemap.xml,
  llms.txt) — sin navegador, a pedido del usuario. Ver `docs/log.md`.
- [ ] Taxonomía island/activityTag: schemas existen, pero no hay documentos
  reales creados ni vinculados a ningún `trip`.
- [x] ~~Tours pasan de pago directo a inquiry (2026-08-02)~~ — **revertido
  2026-09-24, ver la entrada de abajo.** `TourInquiryForm.astro` fue
  eliminado.
- [x] Tabla de disponibilidad de cruceros, galería (cap 6 fotos), chips de
  categoría y varios bugs visuales (FAQ, hipervínculos, carrusel de home)
  pulidos (2026-08-02). Ver `docs/log.md`.
- [x] Sección "Or" (Quito) en home (2026-08-26): componente reusable
  `PolaroidFeature.astro` (2 fotos superpuestas estilo polaroid) integrado en
  `StaysAndReviews.astro` debajo del bloque de Puerto Ayora. Quemada a
  propósito (eyebrow/título/body/fotos/CTA hardcodeados en el componente, no
  vía `getStay()`) — es una sección de diseño, no un teaser de datos reales;
  la ficha real sigue en `/stays/quito-condos/` vía Sanity aparte. Sin
  verificar visualmente en navegador — ver `docs/log.md`.
- [x] Fix scroll-jump en home (2026-08-26): `FeaturedTours.astro` scrolleaba
  la página entera hasta el carrusel de day-tours en cada carga (bug de
  `scrollIntoView`, no del logo). Ver `docs/log.md`.
- [x] Caché in-memory para todas las queries de contenido a Sanity en
  `lib/content.ts` (ships/tours/stays/reviews/socialLinks) — TTL de 24h solo
  como red de seguridad, invalidación real vía webhook de Sanity →
  `POST /api/sanity-revalidate` (`server/sanity-webhook.ts`, firma verificada
  con `@sanity/webhook`). Objetivo: no gastar la cuota gratuita de API CDN de
  Sanity con una request por visita — ahora es ~1 request por publish, no por
  visitante. Disponibilidad de barcos (vendor API) no toca esto, sigue su
  propio patrón fresh/stale en `lib/availability.ts`. Ver `docs/log.md`
  2026-09-02. Webhooks de Sanity creados (sanity.io/manage, uno para
  `dev.galapagosandbeyond.com` y otro para `www.galapagosandbeyond.com`) y
  `SANITY_REVALIDATE_SECRET` seteado en Dokploy para `gab-staging-web` y
  `gab-production-web` (aplicado con `application reload`,
  `applicationStatus: done` en ambas) — ver `docs/log.md` 2026-09-02, segunda
  entrada del día. Endpoint desplegado y verificado en staging
  el mismo día (commit `7320f08` en `origin/staging`, deploy automático vía
  webhook GitHub, `applicationStatus: done`) — curl contra
  `https://dev.galapagosandbeyond.com/api/sanity-revalidate` sin header de
  firma dio `400`, con firma inválida dio `401` (confirma código + secreto
  ambos correctos; `501` habría significado secreto no configurado).

- [x] Limpieza de bookings `pending` abandonados (checkout iniciado, nunca
  pagado) — `expireStaleOrders()` en el servicio de orders pasa a `expired`
  los que superan 24h; endpoint `/api/cron/expire-stale-orders` con el mismo
  patrón de auth (`CRON_SECRET`) que `warm-availability`. Desplegado en
  staging (commit `d5ac27b`) y verificado con un Schedule Job diario
  (`0 3 * * *`, id `aYJimTnFSfc8MmQHzobSi`) en Dokploy — corrida manual y
  curl directo confirmaron `200 {"ok":true,"expiredCount":0}` con auth y
  `404` sin ella. **Solo `gab-staging-web`** — no se tocó
  `gab-production-web` ni la rama `production` a propósito. Ver
  `docs/deploy-staging.md` -> "8b. Cron de expiración de orders pending".
- [x] Claves live de Stripe (restricted key, solo Checkout Sessions → Write)
  y PayPal (app Live) + webhook de Stripe en modo live, cargadas en
  `gab-production-web` vía Dokploy. Dominio `www.galapagosandbeyond.com`
  agregado en Dokploy (Let's Encrypt, puerto 4321, igual que staging) — el
  certificado no emite hasta que el usuario cambie el DNS (todavía apunta a
  Hostinger/WordPress, cero riesgo mientras tanto). `astro.config.mjs`
  confirmado con el dominio final, `TODO(kevin)` removido. Ver
  `docs/deploy-staging.md` -> "Producción en vivo (2026-09-09)" y
  `docs/log.md` mismo día.
- [x] Investigación del mapa de redirects 301 (WP viejo → Astro nuevo) vía
  MCP de WordPress — URLs reales de cruceros/tours/stays/estáticas cruzadas
  contra Sanity, casos sin match identificados. **Sin implementar todavía**
  (sigue pendiente abajo). Detalle completo en `docs/log.md` 2026-09-09.
- [x] Schedule Job `warm-availability` creado en `gab-production-web`
  (2026-09-14) — nunca había existido ahí, causa raíz de una caída
  intermitente de disponibilidad en producción mientras staging servía bien.
  Producción dependía solo del boot warm-up de un intento; ahora tiene el
  mismo cron cada 10 min que staging. Verificado con curl real (404 sin auth,
  200 con datos reales de 9 barcos con auth). Detalle en
  `docs/deploy-staging.md` -> "8. Cron de disponibilidad".

- [x] Tours pagan directo, con fecha, en un modal (2026-09-24, vigente):
  sidebar es un botón "Book this tour" que abre un `<dialog>` con el
  `BookingForm` completo (antes vivía embebido en el sidebar, sin espacio) +
  dos campos `<input type=date>` (Start/End date, required) que viajan como
  `departureStart`/`departureEnd` — mismo modelo de datos que ya usaban los
  cruceros (`OrderItem.departureStart/departureEnd`), sin migración de
  schema. Validado en el schema (`checkout-request.ts`): fecha de calendario
  real, fin ≥ inicio, ambas o ninguna. Pendiente conocido, no arreglado: un
  tour agregado al carrito vía el ícono rápido de las cards (no el modal
  dedicado) todavía no lleva fecha — quedó opcional a propósito para no
  romper ese flujo existente.
  ~~Cruceros pasan a inquiry-only~~ — **se probó ese mismo día
  (`CruiseInquiryForm.astro`, bloqueo en 3 capas) y se revirtió a pedido del
  usuario un rato después: los cruceros siguen pagando directo (Stripe/
  PayPal) exactamente como antes, sin cambios.** `CruiseInquiryForm.astro` y
  `TourInquiryForm.astro` (ya sin uso desde antes) quedaron eliminados. Ver
  `docs/log.md` 2026-09-24 (dos entradas: el cambio y la reversión).

## Pendiente

- [ ] Staging en Dokploy — **desplegado y sirviendo** en
  `https://dev.galapagosandbeyond.com` (HTTPS Let's Encrypt, `noindex`
  activo, Postgres propio con migraciones aplicadas, cron de disponibilidad
  cada 10 min con datos reales, caché de disponibilidad se auto-calienta en
  cada boot del contenedor (no solo con el cron), PayPal sandbox cableado).
  Panel de Dokploy detrás de `https://panel.galapagosandbeyond.com` (antes
  HTTP plano en el puerto 3000, ya cerrado). Queda pendiente el webhook de
  Stripe del endpoint de staging (hoy tiene el `whsec_` local de
  `stripe listen`, que no valida firmas) y activar 2FA en la cuenta Dokploy
  (pospuesto a propósito hasta cerrar prod). **2026-08-01: el env de
  `gab-staging-web` en Dokploy amaneció pisado con valores del `.env` local**
  (`DATABASE_URL` a `localhost`, sin `CRON_SECRET` — endpoint de cron quedó
  abierto sin auth) — corregido y redeployado el mismo día, ver
  `docs/log.md`. `STRIPE_WEBHOOK_SECRET` de staging sigue siendo el
  placeholder local, no se pudo recuperar el original (Stripe no lo vuelve a
  mostrar). Ver `docs/deploy-staging.md`.
- [ ] **Producción sigue sin este código a propósito** — el usuario pidió no
  tocar `gab-production-web` ni la rama `production` todavía. La env var
  `SANITY_REVALIDATE_SECRET` ya está seteada ahí (ver arriba), pero falta el
  merge `staging → production` + push antes de que tenga efecto.
- [ ] Crear documentos reales de `island`/`activityTag` y vincularlos a los
  `trip` migrados.
- [ ] Reembolsos PayPal automáticos: no existe `/api/webhooks/paypal` — hoy
  se procesan a mano en el dashboard de PayPal. A diferencia del webhook de
  Stripe (que ya existe en código, solo falta el `whsec_` real), este
  requiere escribir el endpoint desde cero (descartado explícitamente
  Venmo end-to-end como prioridad — ya se probó y confirmó PayPal).
- [ ] Aprobar/ampliar `web/src/data/cruiseFaqs.json` (draft, ~10 preguntas) y
  revisar meta descripciones por barco (diferenciador en primeros 160 chars).
- [ ] Implementar el mapa de 301 de URLs viejas de WP → nuevas (investigación
  ya hecha, ver Hecho arriba y `docs/log.md` 2026-09-09 — falta escribirlo en
  `astro.config.mjs`/middleware, y decidir a mano los ~6 casos sin match
  claro que encontró la investigación).
- [ ] QA end-to-end de compra + cutover (big bang, ver plan original en el
  log/ADR).
- [x] Auditoría de seguridad pre-producción (2026-09-09): 1 HIGH (path
  injection en captura de PayPal → refund no autorizado), 1 MEDIUM (Stripe
  confirmaba `paid` sin chequear `payment_status`) y 1 LOW (upsert de
  `Customer` sin auth) encontrados y corregidos. Rate limiting (10 req/min
  por IP) y headers de seguridad base agregados en `middleware.ts`. Detalle
  completo en `docs/log.md`.

## Prerequisitos que solo Kevin puede conseguir

- [ ] Lista de precios definitivos de day tours y paquetes.
- [x] Cuenta Stripe del negocio (+ test mode) — clave restringida `rk_test_`
  creada, checkout probado.
- [x] Cuenta PayPal Business (+ sandbox) — app `galapagosandbeyond-astro`
  creada, client ID + secret en `.env`.
- [x] VPS contratado, con Dokploy instalado.
- [ ] Acceso al DNS del dominio (mover a Cloudflare).
- [ ] Reviews de Airbnb/TripAdvisor seleccionadas.
