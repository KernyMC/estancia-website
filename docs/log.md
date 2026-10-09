# Log de sesiones

Append-only. Una entrada por sesión con trabajo relevante — fecha, qué se
decidió/hizo, y el *porqué* si no es obvio. No se borra ni se reescribe el
historial, solo se agrega al final.

---

## 2026-07-12 — Plan de migración cerrado

Decisiones de stack e infra cerradas tras sesión de planificación completa:
VPS+Dokploy (no serverless — Vercel Hobby prohíbe uso comercial y el API de
Galaxy tarda ~26s, incompatible con timeouts serverless), Astro SSR, Sanity,
Postgres+Prisma, Redis para caché de disponibilidad, Stripe+PayPal/Venmo.
Detalle completo en `docs/adr/0002-vps-dokploy-sobre-serverless.md`.

## 2026-07-13 a 2026-07-14 — Sitio Astro construido incrementalmente

Design system, header/footer, home (jerarquía cruceros→tours→stays+reviews),
hubs y fichas de cruceros/tours/stays, páginas legales+cookie banner, contact
form. `lib/availability.ts`+`lib/cache.ts` replican el patrón fresh(10min)/
stale(24h) ya validado en WP — nunca se llama al API vendor durante un render.

## 2026-07-15 — Pipeline de fotos: de visión IA a texto-solo

Se descartó usar modelos de visión (gemma4:26b, qwen3-vl:30b) por lentitud
real (>5 min/imagen) — se optó por qwen3-coder:30b (Ollama, solo texto) con
"contextual grounding" (nombre del barco/tour + sección) en vez de análisis
real de la imagen. Se agregó dedupe por perceptual hash (dHash vía ffmpeg)
porque el usuario detectó fotos de ráfaga casi-idénticas repetidas.

**Bug encontrado por QA manual del usuario**: el modelo inventaba especies de
fauna que no podía verificar, y describía tours en tierra como si fueran
crucero/vessel. Se corrigió el prompt en `regenerate-alt-text.mjs` para que
explícitamente no invente especies y no asuma que todo es un barco.

**Otros bugs de la corrida**: colisión de nombres de archivo genéricos
pisaba fotos distintas (fix: `claimUniqueFilename()` con sufijo -2/-3);
resume del pipeline comparaba `m.url` contra `originalUrl` del manifest (key
equivocada, causó reprocesamiento completo y ~15 duplicados, requirió
`fix-filename-collisions.mjs` + `backfill-shared-photos.mjs` para reparar).

## 2026-07-16 (parte 1) — Content model de Sanity definido con el usuario

Antes de crear schemas, se discutió el modelo de contenido explícitamente
con el usuario (con 3 URLs de referencia de Voyagers.travel). Se decidió un
`trip` unificado (en vez de tipos separados por day-tour/multi-day/crucero)
para poder buscar/filtrar sobre un solo tipo, con `kind` como discriminador
y campos condicionales vía `hidden`. Se agregó taxonomía `destination` (con
vista a expansión futura a Perú), `island`, `activityTag` (con slug, por si
barcos futuros traen actividades nuevas). Ship/stay son referencia, no copia,
para que la info del barco/hotel quede sincronizada donde sea que se use.
Detalle completo en `docs/adr/0001-trip-unificado.md`.

Se agregó campo `banner` tanto a `ship` como a `trip` (pedido explícito).

## 2026-07-16 (parte 2) — Migración de contenido real a Sanity

Fotos subidas a Sanity Media. 8 barcos creados con specs/fotos reales
(nada fabricado — specs no confirmadas en WP se dejaron sin definir). 20
`trip` de tipo `cruise-itinerary` creados como documentos SEPARADOS
referenciando su `ship` (no embebidos — un barco puede tener varios
itinerarios A/B/C). 19 tours creados como `trip`, reutilizando assets ya
subidos a Media (nunca resubiendo bytes). 2 `stay` creados. Se corrió
primero con un solo barco+tour de prueba antes del batch completo (pedido
explícito del usuario).

**Bug**: buscar un asset por `originalFilename` fallaba cuando dos fotos
distintas eran byte-idénticas entre dos barcos (Sanity conserva el filename
del primer uploader). Fix: re-subir por contenido y confiar en el dedupe
server-side de Sanity en vez de buscar por nombre.

**Bug de datos**: el itinerario de buceo de Galaxy Diver II/III no calzaba
con el regex `parseItineraryCode()` (esperaba una letra final A/B/C, pero el
label era "Diving Itinerary" mientras el API vivo solo dice "Diving"). Fix:
regex ahora recorta el sufijo "Itinerary" como fallback. Verificado contra
`migration/data/availability-snapshot.json`.

## 2026-07-16 (parte 3) — Optimización de queries Sanity

Pedido explícito del usuario: "optimiza las queries... para no acabarnos el
plan gratuito". Se detectó que `create-all-ships.mjs`/`create-all-tours.mjs`
re-subían los bytes completos de cada imagen solo para "encontrar" el asset
ya existente vía dedupe server-side — desperdicio real de cuota de API.
Fix: `scripts/lib/asset-cache.mjs` — una sola query trae `{_id,
originalFilename}` de todos los assets, arma un Map en memoria, solo sube de
verdad lo que falta. Verificado: re-correr el script fue casi instantáneo
vs. la corrida anterior lenta.

## 2026-07-16 (parte 4) — Sistema de documentación creado

El usuario notó que las sesiones se llenaban de contexto y pidió un sistema
para no perderlo entre sesiones, con la posibilidad de hacer `/clear` sin
perder el hilo. Se le explicó la diferencia entre lo oficialmente soportado
por Claude Code (`CLAUDE.md` con split y `@imports`, auto-memoria vía
`/memory`) y lo que es convención de ingeniería general no-oficial
(`docs/status.md`, `docs/log.md`, `docs/adr/`) — el usuario explícitamente
preguntó "¿así lo dice la documentación de Anthropic?" y se verificó con el
subagente `claude-code-guide` antes de afirmar nada, en vez de asumir.
Decisión final: usar ambos mecanismos juntos (no son excluyentes) — este
`docs/` para contexto de proyecto que se lee bajo demanda, más auto-memoria
para lo que debe persistir automáticamente entre sesiones sin que el usuario
tenga que pedirlo. Se retiraron `plan-migracion-astro-sanity.md` y
`migracion-fotos-astro-sanity.md` (contenido absorbido acá y en los ADRs).
`cronograma-migracion.md` se deja intacto — es el documento que se comparte
con la gerencia y no es parte de este sistema.

## 2026-07-22 — SEO on-page + enlazado interno (auditoría Voyagers adaptada)

El usuario compartió la auditoría SEO que Storyteller Media le hizo a Voyagers
Travel y pidió retomar lo aplicable a galapagosandbeyond. Se filtró lo útil
(descartando bugs propios de su sitio: popup, QR roto, typo "Lenght") y se
implementó sobre la ficha de crucero (la "página de ventas" del audit) y el
hub de cruceros:

- `lib/seo.ts` (nuevo): `withBrand()` (sufijo "| Galápagos & Beyond" en títulos,
  audit #4), `absoluteUrl()`, y builders JSON-LD `organizationLd`,
  `breadcrumbLd`, `faqLd` (FAQPage), `productLd` (Product+Offer). Los builders
  hacen `compact()` — nunca emiten campos vacíos; el Offer solo aparece si hay
  un `departure` real con precio (no se fabrica precio).
- `Base.astro`: ahora emite canonical, OG/Twitter, y `<script type=ld+json>`.
  Organization siempre presente + lo que pase la página. Título auto-marca.
- `astro.config.mjs`: `site` seteado (URL absoluta para canonical/JSON-LD).
  TODO: confirmar dominio final antes del cutover.
- `Breadcrumbs.astro` + `FaqSection.astro` (nuevos, reutilizables, cada uno
  autoemite su JSON-LD). FaqSection reemplazó el bloque FAQ inline de la ficha.
- Ficha `cruises/[slug].astro`: breadcrumbs con back-link a la clase (Home >
  Cruises > {clase} > barco, audit #17), jump-nav sticky (audit #19), H2 con
  nombre de barco (#20), back-link al hub en sidebar y al final del contenido,
  Product/FAQ/Breadcrumb JSON-LD.
- Hub `cruises/index.astro`: breadcrumbs, FAQ (audit #6, ver nota abajo), y
  filtros por experiencia (audit #8) — Snorkeling/Diving/Kayaking/Hiking/
  Wildlife. Los tags se DERIVAN de `ship.activities` reales (helper
  `shipExperiences` en content.ts), no se inventan; solo se muestran las pills
  que la flota realmente soporta. Class + exp se combinan y preservan en la URL.
- Schema Sanity `ship.ts`: agregado `activityTags` (referencias a activityTag),
  para cuando el frontend lea barcos de Sanity y los filtros de experiencia
  salgan del CMS en vez de derivarse del JSON.

Contenido FAQ del hub: `web/src/data/cruiseFaqs.json` marcado `_draft: true` —
8 preguntas genéricas de viaje (conocimiento general, sin datos de negocio
inventados) para que Kevin revise/edite/amplíe a ~10 antes de publicar. Regla
"no fabricar" respetada: la ficha usa el `faq` real de WP; el hub usa borrador
flagged.

Verificado en runtime (dev): ficha devuelve Product+Offer, BreadcrumbList,
FAQPage, Organization; hub devuelve FAQPage(8) + BreadcrumbList + filtros
combinados (?class=luxury&exp=diving → 1 barco). `astro check` 0 errores,
build ok.

Pendiente (mismo patrón, no hecho aún): aplicar breadcrumbs + JSON-LD +
FaqSection a `tours/[slug]`, `stays/[slug]` y sus hubs. Aprobar/ampliar el FAQ
draft del hub. Meta descripciones por barco con diferenciador en primeros 160
chars (audit #22) — depende de contenido de Kevin.

## 2026-07-22 (parte 2) — SEO replicado a tours/stays, GEO base, logos de review

Continuación de la sesión SEO. Se replicó el patrón de cruceros a tours y
stays, se sentó la base GEO, y se arreglaron los logos de review.

- Tours/stays: breadcrumbs + canonical + OG + JSON-LD. `productLd` para tours
  (Offer solo si `price` existe en el JSON, no se fabrica), nuevo `lodgingLd`
  (LodgingBusiness) para stays. Breadcrumbs también en los hubs de tours/stays.
  Ninguno tiene FAQ real → no se añadió FaqSection ahí (regla no-fabricar).
- GEO base (público, SSR sirve `public/` igual):
  - `public/robots.txt`: Allow explícito a GPTBot/OAI-SearchBot/ChatGPT-User/
    ClaudeBot/Claude-Web/PerplexityBot/Google-Extended; Disallow /api/ y
    /booking/; apunta a sitemap.
  - `src/pages/sitemap.xml.ts`: endpoint dinámico. El integration oficial
    @astrojs/sitemap no ve rutas SSR `[slug]`, por eso es endpoint propio.
    Enumera estáticas + ships (JSON) + tours (JSON) + stays (Sanity async).
    Verificado: 43 URLs. Cache-Control 1h.
  - `src/pages/llms.txt.ts`: endpoint dinámico estándar llmstxt.org, generado
    del contenido real (flota, tours, stays con sus slugs/resúmenes). No
    hardcodea listas → no drifta cuando se agrega contenido.
- Logos de review (pedido del usuario): BUG encontrado — `reviewSources.ts`
  apuntaba a `/logos/airbnb.svg` y `/logos/tripadvisor.svg`, que NO existen;
  los archivos reales son `air-bnb-logo.svg` y `trip-advisor-logo.svg`. Los
  logos estaban rotos (caían al texto). Fix: apuntar a los nombres reales y
  agregar `w`/`h` por fuente (son cuadrados/verticales, no wordmarks: Airbnb
  320×320→20×20, TripAdvisor 206×245→17×20) para evitar distorsión y CLS.
  ReviewCard usa `source.w`/`source.h`. El schema de Sanity ya tenía las
  opciones `airbnb`/`tripadvisor` — no hubo que tocar el schema, solo el mapeo
  del frontend. Verificado en runtime: home renderiza `<img class=source-logo>`
  con los archivos correctos (200), 0 fallbacks a texto.

Verificado: `astro check` 0 errores, build ok, y curl en runtime de tour
(Product+Breadcrumb), stay (LodgingBusiness+Breadcrumb), sitemap.xml (43),
llms.txt, robots.txt, y logos (200).

Pendiente heredado: aprobar/ampliar cruiseFaqs.json (draft) y meta
descripciones por barco (audit #22) — dependen de contenido de Kevin.

## 2026-07-22 (parte 3) — Itinerarios de tours (faltaban del scrape original)

El usuario notó que la migración de tours a Sanity no trajo los itinerarios.
Confirmado: los 21 `trip` de tipo tour tenían `itineraryDays` sin definir —
`migration/data/tours.json` nunca capturó el itinerario. La fuente real en WP
es el meta `tours_program` del plugin Traveler (CPT `st_tours`): array de
`{title, image, desc}`. Solo 7 tours lo tienen poblado:

- **5 Adventure multi-day** (8/7/6/5/4 días): día-a-día "Day N: ...". Mapeado a
  `itineraryDays` (dayLabel/am/pm). Las claves del array venían desordenadas en
  WP (0,1,3,5,2...) — se reordenó por "Day N". Las líneas de continuación sin
  prefijo (ej. "After lunch, take a tour to Charles Darwin...") van como `pm`
  del Day 1 (decisión del usuario: mantener el split am/pm del schema en vez de
  concatenar, para no complicar a futuro).
- **2 diving day-tours** (Gordon Rocks, North Seymour): NO es día-a-día sino un
  horario por hora (07H20→17H30). El schema oculta `itineraryDays` para
  `kind: day-tour`, así que se agregó campo nuevo `daySchedule` a `trip.ts`
  (array de `{time, activity}`, solo visible para day-tours) y se cargó ahí.

Regla no-fabricar respetada: Isabela All Inclusive y el resto de day-tours
tienen `tours_program` vacío en WP → quedaron sin itinerario, no se inventó.
Se probó primero con 1 (8 Day Adventure), el usuario aprobó, luego batch a los
otros 6. Los 7 publicados. NOTA: `daySchedule` es campo nuevo del schema —
requiere recargar el Studio (`pnpm dev`) para verlo en la UI.

## 2026-07-16 a 2026-07-22 — Fase 4 completa: Stripe + PayPal + refunds

Flujo de compra construido y parcialmente probado en `web/` (Astro SSR),
arquitectura documentada en `web/AGENTS.md` (se perdió `web/CLAUDE.md` entre
sesiones — el contenido de arquitectura se repuso en `AGENTS.md`, que es el
archivo real que persiste; no volver a crear `CLAUDE.md` por separado).

**Base**: Postgres local vía Docker Compose, Prisma 7 (`prisma.config.ts`
separado del schema — Prisma 7 ya no permite `url` en `datasource` del
schema). `src/server/env.ts` valida env vars con Zod al boot; el adapter
`@astrojs/node` NO carga `.env` a `process.env` por sí solo (confirmado en
docs de Astro) — se agregó `import 'dotenv/config'` en `env.ts`, `dotenv`
movido a `dependencies` (no `devDependencies`, se necesita en runtime).

**Stripe**: Checkout Session (API `2026-06-24.dahlia`, sin
`payment_method_types`, con `integration_identifier`) + webhook idempotente
(`WebhookEvent` por `stripeEventId`) para `checkout.session.completed` /
`.expired` / `charge.refunded`. Probado end-to-end 2026-07-20 con clave
`rk_test_` y `stripe listen` (Stripe CLI instalado vía `npm i -g @stripe/cli`
— el paquete `@stripe/stripe-cli` NO existe, es `@stripe/cli`). Compra real
confirmada: booking `paid`, 5 eventos Stripe registrados sin duplicados.
**Cuidado real evitado**: el usuario creó primero una clave `rk_live_` sin
darse cuenta (el dashboard no fuerza modo test) — se detuvo la prueba antes
de cobrar de verdad y se creó la `rk_test_` correcta.

**PayPal** (2026-07-22): app sandbox `galapagosandbeyond-astro` creada por el
usuario. Integrado con JS SDK v6 (botones inline `paypal-button` +
`venmo-button`, no redirect como Stripe) + Orders API v2 server-side
(`create-order`/`capture-order`, captura synchrona = fuente de verdad, sin
depender de webhook de PayPal para el MVP). Decisión de arquitectura: NO se
forzó a Stripe y PayPal a compartir la misma interfaz `PaymentProvider` — los
flujos son genuinamente distintos (redirect vs. inline widget) y forzarlo
hubiera sido una abstracción con fugas. Se agregó `Booking.provider` enum +
columnas `paypalOrderId`/`paypalCaptureId` (stripeSessionId pasó a nullable).
Migración generada a mano (`prisma migrate diff --from-config-datasource
--to-schema ... --script`) porque `migrate dev` requiere TTY interactivo, no
disponible en este entorno — patrón documentado en `web/AGENTS.md`.
**Sin probar en navegador todavía** (requiere click real en los botones SDK).

**Refunds**: `charge.refunded` de Stripe marca el booking como `refunded`
buscando por `stripePaymentIntentId` (el evento Charge no trae session id).
Emails de reembolso (cliente + equipo) agregados. PayPal no tiene webhook
configurado — reembolsos ahí quedan manuales por ahora (pendiente en
`docs/status.md`).

Explícitamente dejado pendiente (pedido del usuario, no olvidado): SMTP
Hostinger real, webhook de Stripe en producción, limpieza de bookings
abandonados, Stripe go-live checklist. Todo esperando el VPS.

---

## 2026-07-28 — Preparación del deploy de staging en Dokploy

VPS contratada y Dokploy instalado. Sesión dedicada a dejar el repo y el
código listos para desplegar; el deploy en sí queda a un paso de la UI de
Dokploy (ver `docs/deploy-staging.md`).

**Repo consolidado.** Había tres repos git superpuestos: la raíz sin ningún
commit, `web/` con el commit scaffold de `create-astro` y
`studio-galapagos-and-beyond-cms/` con su `bootstrap sanity studio` — ninguno
con remote. Dokploy despliega desde *un* repo, así que se aplanaron los dos
anidados (sus `.git` están respaldados en el scratchpad de la sesión, no
borrados). `migration/photos/` (62 MB) quedó gitignored: ya vive en Sanity y
Dokploy lo clonaría en cada deploy. `migration/data/` sí se versiona, que es
lo que el pipeline necesita para ser reproducible.

**Dockerfile en vez de Nixpacks.** Multi-stage sobre `node:22-slim` (no
alpine: Prisma trae binarios Rust que en musl piden `binaryTargets` extra).
pnpm se fija con `npm i -g pnpm@11.12.0` porque el corepack que trae Node 22
rechaza pnpm nuevos con "Cannot find matching keyid". El runtime se queda con
el `node_modules` completo, no `--prod`: `prisma migrate deploy` corre al
arrancar y el CLI de Prisma es devDependency. Las migraciones van en el boot
y no en el build porque la base solo es alcanzable desde dentro de la red
Docker, donde el builder no está.

**Bug real encontrado, no teórico.** `BookingForm.astro` decidía si renderizar
los botones de PayPal leyendo `import.meta.env`. Vite lo reemplaza
*estáticamente en build* (confirmado en los docs de Astro, no asumido), así
que en un contenedor la decisión habría quedado congelada con lo que viera el
builder y las env vars que inyecta Dokploy en runtime nunca habrían tenido
efecto: PayPal muerto en staging sin error visible. Ahora lee de
`server/env.ts` (process.env, runtime) y el client ID llega al navegador por
un `data-` attribute en vez de una constante inlineada. `PUBLIC_PAYPAL_ENV`
desapareció — era un duplicado de `PAYPAL_ENV`.

**Staging no se indexa.** `src/middleware.ts` pone `X-Robots-Tag: noindex,
nofollow` cuando `SITE_ENV !== 'production'`. Cabecera y no `Disallow` en
robots.txt: Disallow corta el crawl pero la URL igual puede indexarse desde
enlaces externos, que es justo el problema de contenido duplicado contra el
sitio real que se quiere evitar. La misma imagen sirve para staging o prod
según la env var, sin rebuild.

**`/api/cron/warm-availability` estaba abierto.** Es el único endpoint
autorizado a hacer la llamada en vivo de ~26s al vendor, así que público es un
amplificador gratis para quien encuentre la URL. Ahora exige
`Authorization: Bearer $CRON_SECRET`, opcional como grupo igual que SMTP
(sin la var, local sigue curleable). Responde 404 y no 401 para no confirmar
que la ruta existe.

**Staging desplegado el mismo día**, vía el CLI de Dokploy (`@dokploy/cli`
0.3.0) contra `http://31.97.148.143:3000`. Environment `staging` nuevo dentro
del proyecto que ya existía — `production` y su app `front` sin configurar
quedaron intactos. Vive en `https://dev.galapagosandbeyond.com` (el usuario
creó el DNS como `dev.`, no `staging.`).

Verificado en caliente, no asumido: HTTPS con certificado Let's Encrypt,
`X-Robots-Tag: noindex, nofollow` presente, `/api/cron/warm-availability`
devolviendo 404 sin `Authorization`, y `/api/availability` sirviendo salidas
reales de los barcos tras disparar el schedule a mano. Las migraciones de
Prisma corrieron: el `CMD` encadena `migrate deploy && node`, así que un 200
del sitio lo demuestra sin mirar logs.

**El fix de `import.meta.env` quedó probado en producción real**, no solo en
teoría: la ficha de `bonita-yacht` sirve `data-paypal-client-id="AftfE3…"` y
`data-paypal-section="sandbox"`. Con el código anterior ese atributo habría
salido vacío, porque el builder de Dokploy no tiene las credenciales.

Tres bugs del CLI 0.3.0 que costaron tiempo y están documentados en
`docs/deploy-staging.md`: (1) **todos los GET con parámetros dan 400** —
`apiPost` envuelve el body en `{json:...}` para superjson pero `apiGet` arma
`?input={...}` sin el sobre, así que las lecturas hay que hacerlas con curl;
(2) **Git Bash convierte los argumentos que empiezan con `/`** — `--path "/"`
llegó al servidor como `C:/Program Files/Git/` y dejó el dominio mal creado,
se arregla con `MSYS_NO_PATHCONV=1`; (3) los `save-*` exigen *todos* los
flags, incluido `--herokuVersion` en un build Dockerfile.

Deuda consciente, no olvido: el panel Dokploy está en HTTP plano, así que el
token de API y cada secreto guardado viajan sin cifrar — aceptable con claves
test/sandbox, **bloqueante antes de meter claves live**. Y la contraseña de
Postgres se imprimió en claro en la salida del `postgres deploy` (ese endpoint
devuelve el objeto completo); la base no expone puerto externo, pero conviene
rotarla.

**Panel de Dokploy puesto detrás de dominio + Traefik** (mismo día): antes
vivía en `http://31.97.148.143:3000` sin TLS — token de API y contraseña
viajaban en claro. Ahora `https://panel.galapagosandbeyond.com` con
certificado Let's Encrypt (`dokploy settings assign-domain-server` +
`reload-traefik`). Pendiente que el usuario cierre el puerto 3000 crudo por
firewall (`ufw`) — no hay acceso SSH a la VPS desde este entorno, solo la API
de Dokploy, así que ese paso queda manual. 2FA de la cuenta Dokploy pospuesto
a propósito hasta cerrar staging+producción — no olvidado, pedido del usuario.

---

## 2026-07-29 — Carrito de compras multi-item + favoritos

El usuario pidió un navbar con carrito y favoritos, mostrando 3 componentes
React de referencia (Heart/pulse, Bookmark/color-morph, Star/glare). Antes de
tocar código: el sitio es 100% Astro sin frameworks de UI (confirmado,
`Explore` no encontró ni un `client:*` en todo `src/`), así que se reimplementó
el mismo comportamiento visual en CSS/vanilla JS puro en vez de instalar
React+framer-motion+lucide-react — cero dependencias nuevas. Mapeo confirmado
con el usuario: Heart = favoritos, Bookmark = agregar al carrito, Star/glare =
efecto hover del botón de carrito (no una 3ª acción).

**Decisión grande, confirmada explícitamente antes de construir**: el usuario
quiso un carrito real multi-item (varios tours/cruceros pagados juntos en una
transacción), no una wishlist. Esto rompía una asunción de 1:1 en todo el
stack de pagos (`Booking.stripeSessionId`/`paypalOrderId` eran `@unique`) —
se usó `EnterPlanMode` dado el tamaño (toca dinero: Stripe, PayPal, Prisma,
emails), con 2 agentes `Explore` en paralelo mapeando el código real antes de
diseñar, y un agente `Plan` para validar el diseño (incluida la forma correcta
de `items[]`+`amount.breakdown` de la API v2 de PayPal, verificada contra la
doc oficial, no inventada).

**Rediseño de backend**: `Order` (la transacción — status, provider, refs de
pago, `amountCents` total, customer) + `Booking` pasa a ser **line item**
(snapshot: type/slug/nombre/fechas/pax/monto de esa línea, `position`,
`orderId`). `BookingStatus`→`OrderStatus`, `BookingProvider`→`OrderProvider`
(rename de enum). Checkout **unificado**: `/api/checkout` y
`/api/paypal/create-order` reciben siempre `{items[], customer}` — una compra
directa desde `BookingForm` es un carrito de 1 item, no hay dos caminos de
checkout mantenidos en paralelo. `quoteCart()` en `pricing.ts` cotiza el array
server-side (secuencial, fail-fast, rechaza vacío/duplicados/>10 items).
Stripe mapea el cart a `line_items[]` (trivial). PayPal usa **un solo**
`purchase_unit` con `items[]` + `amount.breakdown.item_total` (no un
`purchase_unit` por item — eso es para pagos split a distintos payees, no
esto). `src/server/bookings/` renombrado a `src/server/orders/orders.ts`; la
máquina de transición de estados no cambió ni una regla, solo pasó de
`client.booking` a `client.order`. Un email consolidado por Order (nunca uno
por line item) — asunto usa "`<primer item>` + N more" cuando hay más de uno.

**Migración de datos**: solo había datos de test/sandbox en la base local (10
filas de `Booking`, compras de prueba con Stripe test) — confirmado con el
usuario antes de correr `DELETE FROM "Booking"` dentro de la migración. Sin
esto la nueva columna `orderId TEXT NOT NULL` no podría agregarse sobre filas
existentes. Migración escrita a mano (el generador de `prisma migrate diff`
no sabe hacer rename de enum, solo drop+create) y verificada sin drift.

**Frontend**: `src/scripts/cart-store.ts` (localStorage, sin login — no hay
sistema de cuentas en el sitio; try/catch en cada lectura/escritura, a
diferencia del único precedente existente `CookieBanner.astro`, porque acá
una excepción de Safari privado rompería un click de compra, no solo un
banner). `CardActions.astro` (favorito+carrito) insertado como **hermano**
del `<a>` en las 5 cards del sitio (todas son `<a>` envolviendo el contenido
completo — un `<button>` no puede anidarse ahí). `CartDrawer.astro`: panel
lateral gracias a `<dialog>` + `showModal()` (mismo primitivo que ya usa
`AvailabilityTable` para su diálogo de reserva — focus trap y Esc gratis),
tabs Cart/Saved, precios siempre vía `POST /api/cart/quote` (nunca
localStorage como fuente de verdad). Nuevo endpoint `/api/cart/quote`: cotiza
sin crear nada, sin customer — es lo que mantiene la regla "precio se calcula
solo en el servidor" dentro del drawer.

**`checkout-client.ts`**: se extrajo la integración del SDK de PayPal
(incluyendo el singleton `sdkLoadPromise`) de `BookingForm.astro` a un módulo
compartido, porque el drawer y el `<dialog>` de compra directa de
`BookingForm` pueden coexistir en la misma página de crucero — el script del
SDK debe cargarse una sola vez sin importar cuántas UIs de checkout haya.

**Verificado en real, no solo con tests mockeados**: build+`astro check`+50
tests en cada fase; firma manual de un webhook de Stripe (mismo HMAC que usa
Stripe) contra un Order de 2 items real → confirmó **un solo** email
consolidado; y en navegador — carrito con tour+crucero armado desde las
cards, badges reaccionando en vivo sin recargar (evento `gab:store-change`),
drawer con precios reales vía `/api/cart/quote`, checkout completo desde el
drawer hasta una sesión de Stripe real mostrando el total exacto
($6,895.00, 2 líneas) en `checkout.stripe.com`.

**No hecho, a propósito**: transición de entrada del drawer (slide-in con
`@starting-style`) — quedó con aparición instantánea de `<dialog>`, es
cosmético y no bloqueaba nada. Compra de PayPal desde el drawer sin probar
con click real (mismo pendiente que ya existía para `BookingForm` desde
antes de esta sesión).

**Nota de proceso**: durante esta sesión el usuario editó `FeaturedTours.astro`
y `StaysAndReviews.astro` directamente en su IDE en paralelo — se detectó un
bug transitorio de esa edición en vivo (`featuredIndex is not defined`) que
se resolvió solo cuando el usuario guardó de nuevo; no se tocaron esos
archivos.

## 2026-07-29 — Página dedicada del condo (`/condo-galapagos/`) + WhatsApp CTA

**Hallazgo clave**: el "condo" que el usuario quería documentar (con pisos/
unidades) no era el `stay` borrador `quito-condos` (Quito, vacío) sino el
**ya publicado** `Galápagos & Beyond Santa Cruz` (`santa-cruz-aparthotel`,
Puerto Ayora) — confirmado leyendo en vivo los 5 listings de Airbnb del
propio anfitrión (`airbnb.com.ec/rooms/720491389008734827`, `709613058372699852`,
`718984012807536152`, `709594350807449430`, `709609705380557719`): el texto
del host confirma "cinco apartamentos separados... cada condominio está en
un piso diferente", pool/jacuzzi/sauna compartidos en 1er piso, terraza en
2do, desayuno incluido. Contenido de los 5 pisos (descripción, capacidad,
bedrooms, amenities, `airbnbUrl`) sacado 1:1 de esos listings, traducido a
inglés — nada inventado.

**Schema (`studio-galapagos-and-beyond-cms/schemaTypes/`)**:
- `stay.ts`: nuevo campo `floors` (array de objetos `floor`: name, tagline,
  description, capacity, bathrooms, `bedrooms[]` {name, beds}, amenities,
  `airbnbUrl`, gallery) — para edificios multi-unidad donde cada piso es un
  condo autónomo. Coexiste con el `rooms` plano ya existente (aparthotel
  simple de 1 solo edificio compartido, sin usar acá).
- `socialLinks.ts` (nuevo, singleton no forzado por Sanity): `whatsappNumber`
  (dígitos + código país, sin `+`), `whatsappDefaultMessage`, + instagram/
  facebook/tripadvisor URLs para cuando se necesiten. Documento creado vacío
  (excepto el mensaje default) — el usuario debe cargar su número real desde
  el Studio, no se fabricó ninguno.
- Deploy de schema vía `pnpm exec sanity schema deploy` (CLI, **no** la
  tool `deploy_schema` del MCP — esa tool rechaza/diverge cuando ya existe un
  Studio local, como acá).

**Contenido real ya migrado a Sanity** (doc `8VyNrOEo8uWkcWBKVXAMbT`, antes
`santa-cruz-aparthotel` → ahora slug **`condo-galapagos`**, name "Condo
Galápagos & Beyond"): descripción/highlights/amenities a nivel edificio +
los 5 `floors` con datos reales de Airbnb. Publicado (no quedó en draft).

**Ruteo**: la página vive en `web/src/pages/condo-galapagos/index.astro`
(dedicada, no pasa por `stays/[slug].astro` — ese slug tiene su propio
layout con selector de piso visual, `FloorSwitcher.astro`). `[slug].astro`
redirige 301 `condo-galapagos` → `/condo-galapagos/` para no servir una
versión inferior duplicada; `sitemap.xml.ts` y `llms.txt.ts` actualizados
igual. `Header.astro`/`Footer.astro`/`stays/index.astro` (card del hub)
apuntan a la ruta nueva. Se encontró y resolvió un TODO que había dejado
otra sesión en `StaysAndReviews.astro` (`galapagosCondoHref`) esperando
justo esta URL.

**Botón "Ask about availability" → WhatsApp**: `lib/content.ts` agrega
`getSocialLinks()` + `whatsappUrl(number, message)`. Si `whatsappNumber` no
está configurado en Sanity, cae a `/contact/?stay=condo-galapagos` (no
rompe, no linkea a un número inventado). El sidebar manda un mensaje
genérico; el `FloorSwitcher` manda uno con el nombre del condo elegido.

**Hero de `/stays/`**: imagen estática servida desde `public/images/
stays-hero.jpg` (no Sanity, decisión del usuario) — el archivo no existe
todavía, el usuario lo va a poner; mientras tanto el `<img>` rompe
silenciosamente (gradiente de fondo visible, no rompe el layout).

**Verificado en real**: `pnpm run build` limpio (tras `prisma generate`,
pendiente pre-existente sin relación), dev server local con `.env` de
placeholders (gitignored, solo para probar en este worktree), screenshots en
Chrome de `/stays/` y `/condo-galapagos/` — tab-switching entre los 5 condos
confirmado con datos distintos por unidad, redirect 301 de
`/stays/condo-galapagos/` confirmado con `curl`.

**Pendiente para el usuario**: cargar el número real de WhatsApp en el
Studio (`Social & Contact Links`), fotos de cada piso/condo, y la imagen del
hero de `/stays/`.

---

## 2026-08-01 -- Push a staging no se reflejo: API key del CLI de Dokploy invalida

Tras `git push origin staging` (rango b3d82cf..7fcc0a2, incluye el country
dial-code picker del BookingForm/CartDrawer), el usuario no vio cambios en
`dev.galapagosandbeyond.com`. Investigacion:

- El push a GitHub si llego: `origin/staging` = `7fcc0a2`, confirmado con
  `git fetch` + `git rev-parse`.
- El `config.json` del CLI (`~/AppData/Roaming/npm/node_modules/@dokploy/cli/config.json`)
  tenia `url` apuntando a `http://2.24.82.87:3000` -- ni siquiera la IP vieja
  documentada (`31.97.148.143`), una tercera URL sin explicacion aparente. Se
  corrigio a `https://panel.galapagosandbeyond.com`.
- Con la URL corregida, **el token de API sigue devolviendo 401
  UNAUTHORIZED** en cualquier endpoint (`project.all`, `application.one`,
  incluso `dokploy auth -u ... -t ...` desde cero). Los tokens de Dokploy no
  expiran por defecto (confirmado en la doc de CLI), asi que esto es una
  revocacion/rotacion manual, no vencimiento -- probablemente el usuario lo
  regenero al mover el panel a HTTPS (la deuda de "token viajaba en claro"
  que quedo anotada el 2026-07-28) y el `config.json` local nunca se
  actualizo con el nuevo valor.
- Sin token valido no hay forma de leer el historial de deploys ni de
  disparar uno manual via API/CLI desde este entorno. Verificacion alterna
  por HTTP: `dev.galapagosandbeyond.com` responde 200 y trae `noindex`, pero
  el HTML de `/tours/kicker-rock/` **no contiene** `data-phone-picker`
  (el marcado nuevo del picker de codigo de pais, incondicional en
  `BookingForm.astro` linea ~90) -- confirma que el contenedor sigue
  corriendo el build anterior a `7463621`, es decir el auto-deploy no se
  disparo (o disparo y fallo) tras el push.

**Pendiente para el usuario**: generar un API key nuevo en el dashboard de
Dokploy (`Settings -> Profile -> Generate`) y pasarlo aca para actualizar
`config.json`, o correr manualmente `dokploy application deploy
--applicationId DRO-xIbew6vZujrh72Hi6` desde una maquina con un token
valido. Hasta entonces no hay forma de confirmar por API si el webhook de
GitHub esta conectado.

**Cierre (mismo dia, token nuevo):** el usuario genero un API key nuevo
desde el dashboard y actualizo `config.json` -- `dget project.all` respondio
200 de inmediato. Con el token vivo, `deployment.all` confirmo la sospecha:
el ultimo deploy registrado era del commit `b3d82cf` (2026-07-30), el
webhook nunca disparo para ninguno de los commits siguientes hasta `7fcc0a2`.
Se disparo manual con `dokploy application deploy --applicationId
DRO-xIbew6vZujrh72Hi6 --title "..." --description "..."` -- corrio ~2m47s
(14:32:36 a 14:35:23 UTC) y termino en `status: done`. Verificado en vivo:
`/tours/kicker-rock/` ahora trae `data-phone-picker` en el HTML y el hash del
bundle de `BookingForm` cambio (`CA44MUOE` -> `DWJXmERR`), confirmando que el
build de `7fcc0a2` (o posterior) ya esta sirviendo.

Causa raiz del webhook roto: sigue sin confirmarse (no hay acceso a la
configuracion del webhook de GitHub ni a `gh` CLI desde este entorno). Con
el token ya funcionando se puede investigar en la proxima sesion si vuelve a
pasar -- revisar en GitHub (repo Settings -> Webhooks) si el endpoint de
Dokploy sigue registrado y si las ultimas entregas devolvieron 200.

---

## 2026-08-01 -- Causa raiz del webhook GitHub->Dokploy roto: URL vieja registrada en el GitHub App

Siguiendo la investigacion del deploy manual (entrada anterior de hoy), se
pidio encontrar por que el webhook dejo de disparar builds automaticos.
Diagnostico completo usando la API de GitHub directamente (sin `gh` CLI, sin
token personal): el `githubPrivateKey` del GitHub App queda expuesto en
claro via `dget github.one` (el mismo endpoint que ya se sabia inseguro por
viajar sin TLS hasta el 2026-07-28), asi que se genero un JWT firmado a mano
con Node (`crypto.createSign('RSA-SHA256')`) para autenticarse como el App
y llamar `GET https://api.github.com/app/hook/config` y
`GET /app/hook/deliveries`.

**Causa raiz confirmada:** el webhook del GitHub App `galapagosandbeyond`
(appId `4412615`) sigue apuntando a `http://31.97.148.143:3000/api/deploy/github`
-- la URL de cuando el panel vivia sin dominio. Las ~20 entregas mas
recientes (desde 2026-07-29 19:05 UTC hasta hoy) devuelven todas `502 failed
to connect to host`: el puerto 3000 crudo ya no acepta conexiones desde
fuera (confirmado tambien con un `curl` directo a esa IP:puerto desde este
entorno -- timeout). El GitHub App usa **un solo webhook para todas sus
instalaciones**, y `gab-staging-web` y `gab-production-web` comparten el
mismo `githubId` (`d6tu5lLioCYWSqMZWKbp1`), asi que ambas apps quedaron sin
auto-deploy por la misma razon al mismo tiempo (coincide con que el ultimo
deploy real de staging antes del push manual fue del 2026-07-30, justo
despues de que empezaran los 502).

Descartado del lado de Dokploy: `application.one` de ambas apps muestra
`autoDeploy: true`, `triggerType: push`, rama correcta (`staging` /
`production`) y `hasGitProviderAccess: true`; `dokploy github
test-connection --githubId d6tu5lLioCYWSqMZWKbp1` confirma que la
instalacion sigue siendo valida ("Found 1 repositories"). El problema no es
la instalacion ni los permisos -- es exclusivamente la URL del webhook
registrada en GitHub, que no se actualizo cuando el panel se movio a
`https://panel.galapagosandbeyond.com`. Se verifico que el endpoint nuevo
ya esta vivo: `curl https://panel.galapagosandbeyond.com/api/deploy/github`
responde 401 (falta la firma del webhook, pero el puerto/ruta existen), en
contraste con el timeout total contra el `:3000` viejo.

**Fix identificado, no ejecutado todavia** (requiere confirmacion del
usuario antes de tocar la config del GitHub App, que es una instalacion
compartida entre las dos apps):

```bash
PATCH https://api.github.com/app/hook/config
Authorization: Bearer <JWT firmado con githubPrivateKey, iss=4412615>
Body: {"url":"https://panel.galapagosandbeyond.com/api/deploy/github","content_type":"json","insecure_ssl":"0"}
```

Arreglaria staging y produccion a la vez con una sola llamada, sin tocar
nada en Dokploy. Los archivos temporales con la private key/JWT generados
durante el diagnostico se borraron al terminar (no quedaron en disco).

**Cierre (mismo dia, confirmado por el usuario):** se aplico el fix con el
usuario diciendo "si" -- `PATCH https://api.github.com/app/hook/config`
con `{"url":"https://panel.galapagosandbeyond.com/api/deploy/github"}`
(mismo JWT firmado con la private key del App). `GET /app/hook/config`
inmediatamente despues confirmo la URL nueva guardada.

Prueba real, no solo config: se redisparo la ultima entrega fallida
(`POST /app/hook/deliveries/{id}/attempts`, el push a `staging` con
commit `7fcc0a2`) y esta vez devolvio `200 OK` con body
`{"message":"Deployed 1 apps"}` -- vs. el `502 failed to connect to host`
de antes. Se confirmo tambien del lado de Dokploy: `deployment.all` de
`gab-staging-web` muestra una entrada nueva a las 14:51:41 UTC, titulo
"Merge branch 'main' into staging" (el mismo commit, esta vez disparada
por el webhook real, no por el `deploy` manual de antes), status `done`.
Evidencia end-to-end, no solo "deberia funcionar".

Como el App/installation es compartido, esto arregla `gab-staging-web` Y
`gab-production-web` a la vez -- no se toco nada especifico de produccion
porque no hace falta, es la misma URL de webhook para las dos.

Archivos temporales con el JWT/private key generados durante el fix se
borraron al terminar, igual que en la investigacion anterior.

`docs/deploy-staging.md` actualizado: el quirk paso de "roto" a "[RESUELTO
2026-08-01]" con el fix aplicado y la receta para diagnosticar si vuelve a
pasar (ej. si el panel cambia de dominio otra vez, hay que repetir el PATCH
a mano -- Dokploy no sincroniza esto solo).

## 2026-08-01 — Emails de compra reales, bug de env en staging, tooling de switch de credenciales, y ships/tours conectados a Sanity

**Emails**: SMTP real vía Google Workspace (Gmail SMTP, App Password,
`info@galapagosandbeyond.com`) en vez de Hostinger — cambio de plan del
usuario. Plantillas HTML con marca (logo real desde Sanity CDN, botón
WhatsApp + email en el footer del cliente, ficha de contacto del comprador
en el footer del equipo) para las 4 combinaciones cliente/equipo ×
confirmación/reembolso, además del texto plano de siempre.
`EmailMessage.html` es opcional, no rompe nada si falta. Probado real: una
compra Stripe test y una compra PayPal sandbox (cuenta
`sb-giymi52334591@personal.example.com`) confirmadas de punta a punta,
correos recibidos en Gmail con el diseño nuevo.

**Bug encontrado en producción (bueno, en staging) durante la prueba de
PayPal**: el correo de la compra de PayPal no llegaba pese a que el pago se
procesó bien. Causa: el dev server del checkout principal (puerto 4321)
llevaba ~21h corriendo, desde antes de agregar las credenciales SMTP al
`.env` — Node cachea `process.env` al arrancar, así que ese proceso seguía
mandando emails a `console.log`. Fix: reinicio del proceso. Mientras se
investigaba esto se encontró un problema más serio y no relacionado: **el
env de `gab-staging-web` en Dokploy estaba pisado con el `.env` local**
(`DATABASE_URL` a `localhost:5432` en vez de `gab-staging-db-6ycllf`, sin
`CRON_SECRET` — `/api/cron/warm-availability` respondía 200 sin auth en vez
de 404, vector de abuso gratis del API del vendor). Corregido vía la API de
Dokploy (`DATABASE_URL` real + `CRON_SECRET` nuevo) y redeployado;
verificado con curl que el cron volvió a dar 404 sin auth. `STRIPE_WEBHOOK_SECRET`
de staging sigue siendo el placeholder de `stripe listen` local — no se
pudo recuperar el original (Stripe no lo vuelve a mostrar por API), pendiente
que el usuario lo saque del Dashboard.

**Tooling de switch de credenciales**: para que un `.env` de staging/prod
nunca vuelva a terminar pegado en local por error, se agregó
`src/server/env.ts` — rechaza arrancar `pnpm dev` si detecta una clave
Stripe/PayPal live o un `DATABASE_URL` de staging/producción, salvo
`ALLOW_LIVE_KEYS_LOCALLY=yes`. `pnpm env:test`/`env:live`/`env:status`
(`scripts/switch-env.mjs`) cambian de perfil de `.env` (`.env.test`/
`.env.live`, gitignoreados) sin editar a mano; `env:live` pide confirmación
escrita.

**Limpieza de branches**: 6 branches locales + 2 remotas de worktrees ya
mergeados en `main` (confirmado con `git merge-base --is-ancestor` antes de
borrar), más ~10 carpetas huérfanas en `.claude/worktrees/` que ya no eran
worktrees de git de verdad (solo carpetas sueltas, sin `.git`) — todo
verificado sin cambios sin commitear antes de borrar. Un worktree
(`abundant-sleeping-kazoo`) tenía un cambio sin commitear en
`activityTag.ts` (campo `image` para el chip de filtro); se confirmó que ya
estaba en `main` desde el commit `5ee04f5` antes de borrar, así que no se
perdió nada.

**Ships/tours conectados a Sanity**: ver entrada en `docs/status.md` (sección
Hecho) para el detalle completo. Resumen: los datos ya estaban subidos desde
el 28 de julio (8 barcos, 20 tours, 20 itinerarios de crucero) — lo que
faltaba era conectar `lib/content.ts`. Se agregaron 2 campos reales al
schema (`ship.seo`, `trip.childPrice`) parcheados con `.patch().set()` sobre
los documentos existentes (nunca delete+recreate, para no perder
banners/galerías ya subidos). `childPrice` era crítico: sin él, los niños
hubieran pagado precio de adulto en el checkout. Verificado con `tsc` +
`astro check` (0 errores) + 53 tests + smoke test por `curl` a 7 rutas
(sin navegador, a pedido del usuario) — incluye confirmar que el itinerario
día-a-día real de Bonita Yacht (documentos `trip` separados que referencian
al `ship`, no anidados como en el JSON viejo) se renderiza bien, y que los
conteos de categoría de tours (12 day-tours, 6 multi-day, 2 diving) calzan

## 2026-08-02 — UI de cruceros/tours pulida, y tours pasan de pago directo a inquiry

**Disponibilidad de cruceros más rápida y con loader**: fetch en vivo al
vendor tardaba de más por el `connectTimeout` default de `undici` (10s,
insuficiente) — se agregó un `Agent` custom con `VENDOR_CONNECT_TIMEOUT_MS =
35_000` y reintentos en `lib/availability.ts`. Se agregó loader visual
mientras carga.

**Fixes visuales varios** (pedidos puntuales del usuario, con screenshots de
referencia): chips de categoría de crucero mostraban el slug crudo
(`tourist-superior`) en vez del label humano → `categoryLabel()` +
`SHIP_CATEGORY_LABELS` en `lib/content.ts`. Color inconsistente entre
párrafos y bullets del FAQ, título pegado a las preguntas, hipervínculos
pegados sin espacio (bug de whitespace-collapse tipo JSX en Astro) — todo
corregido en las fichas de crucero/tour. Tabla de precios/fechas de crucero
(`AvailabilityTable.astro`) rediseñada por completo: toolbar From/To/Sort +
botón azul "Search Availability" compactado en un solo encabezado (no dos
líneas), promo tag de azul a rojo (`var(--error)`), paginación a 7 filas por
página. Galería de crucero/tour (`GalleryTabs.astro`) con cap de 6 fotos +
overlay "+N" cuando hay más. Bug del carrusel de tours en home
(`FeaturedTours.astro`) que no dejaba ir a la derecha — el ancla de
`normalizeScroll()` no seguía a `set1Start` real.

**Radio de actividad en booking mostraba visual roto**: además de arreglar
el CSS, se agregó que muestre qué actividad real reemplaza el addon
(`TourAddOn.replaces`, dato real de Sanity, nunca inventado).

**Cambio grande: tours ya no cobran directo, mandan inquiry.** El usuario no
tiene calendario de fechas para tours (a diferencia de cruceros, que sí
tienen disponibilidad real del vendor) y necesita coordinar a mano — se
quitó "Add to cart"/pago directo de tours en todos lados (`CardActions.astro`:
`showCart = canAddToCart && item.type !== 'tour'`) y se reemplazó el
`BookingForm` de `tours/[slug].astro` por `TourInquiryForm.astro` (nuevo
componente), mismo patrón que `contact.astro` pero encapsulado en un dialog
disparado por botón (para no forzar scroll). Campos: nombre, email, teléfono
(picker de código de país reusado), start date + end date reales (nativos,
con CSS custom porque el date picker nativo se veía mal), travelers, country
of origin (combobox con banderas igual que el picker de teléfono — placeholder
"United States" por defecto pero **sin prellenar el valor real**, corrección
explícita del usuario), activity (radio de addon si aplica), comments (deja
escribir más de 1000 caracteres pero bloquea el envío y pinta el exceso en
rojo vía técnica de "backdrop textarea" — un `<div>` con el mismo box-model
detrás del `<textarea>` real). Botón de submit con spinner + animación de
anillo pulsante (CSS puro, recreando un efecto Framer Motion que pegó el
usuario — el proyecto es Astro puro, sin React) y, al confirmar envío
exitoso, pasa a verde (`var(--success)`) con texto "Sent ✓" antes de colapsar
al mensaje de agradecimiento.

Prisma: `Inquiry` ganó `startDate`/`endDate`/`originCountry`/`travelers`
(dos migraciones: alta de campos, luego `days`→`endDate`); `message` pasó a
opcional. `api/inquiry.ts`, `templates.ts` y `sender.ts` actualizados en
consecuencia.

**Bugs de CSS repetidos, vale la pena recordarlos**: (1) una clase con
`display` explícito (`.avail-pager`, y luego `.inquiry-form`) le gana en
cascada al atributo `hidden` nativo del navegador — hace falta regla
explícita `.clase[hidden] { display: none; }`, se encontró dos veces en esta
sesión. (2) selectores descendientes demasiado amplios (`.field input`,
`.field span`) se colaban en elementos anidados no destinados a ese estilo,
en `BookingForm.astro` y `CartDrawer.astro` — fix con `:not()` o hijo
directo (`.field > span`). (3) click dentro de un `<label>` delega
foco/activación al primer control labelable — reabría el dropdown del
picker de teléfono y el de country-of-origin tras seleccionar un ítem; fix
con `e.preventDefault()` en el click handler del ítem, en ambos pickers.

Todo verificado con `astro check` (0 errores) + `vitest run` (53/53) +
pruebas reales en navegador en cada iteración.
exacto con `tours.json`.

## 2026-08-26 — Sección "Or" (Quito) en home, componente `PolaroidFeature`

Nuevo componente reusable `web/src/components/home/PolaroidFeature.astro`
(props: `eyebrow`, `title`, `body`, `ctaLabel`, `ctaHref`, `imageA`/`imageB`
`{src, alt}`, `reverse`) — layout dos columnas 45/55 con dos fotos estilo
polaroid superpuestas y rotadas, hover enderezan (gateado en
`prefers-reduced-motion: no-preference`), responsive a 1024px/640px (mobile:
una columna, polaroids lado a lado). Fotos landscape (2000x1333, no las 4/5
verticales del pedido original) porque las dos imágenes reales que dio el
usuario para Quito eran horizontales — el `aspect-ratio` del marco se ajustó
a 3/2 a pedido explícito ("hazles horizontales").

Integrado en `StaysAndReviews.astro`: debajo del bloque de Puerto Ayora,
separador "Or", luego el condo de Quito (`getStay('quito-condos')`). El
`stay` en Sanity no tiene `description` ni gallery — el body es copy mínimo
con hechos confirmados únicamente (a pedido del usuario, para no fabricar
amenities/detalles que no están en Sanity). Las dos fotos son URLs de
`cdn.sanity.io` que el usuario pasó directo (ya están en Sanity Media, no se
resubió nada) — no vienen del campo `gallery` del doc (vacío), así que quedan
hardcodeadas en `StaysAndReviews.astro` igual que `staysImage`/`staysCrabImage`
ya lo estaban.

**No se pudo verificar visualmente en navegador**: la extensión Claude-in-Chrome
no logra cargar `localhost`/`127.0.0.1` (error de frame) aunque `curl` desde
la sesión de shell sí responde 200 — parece que el Chrome de la extensión no
comparte red con este sandbox. Confirmado con sitios externos (sí cargan).
Vale la pena que el usuario revise visualmente `http://localhost:4323/` (su
propio dev server, que ya estaba corriendo) antes de dar por bueno el diseño,
especialmente el solape/rotación de los polaroids y el corte en mobile.

**Por qué no aparecía (y cómo quedó)**: al inicio la sección leía
`getStay('quito-condos')` de Sanity — el doc existe pero solo como **draft**,
nunca publicado (`query_documents` con `perspective: "published"` devuelve 0;
con `"raw"` sí aparece), así que el cliente del sitio (sin token, solo
contenido publicado) traía `undefined` y la sección quedaba oculta. El
usuario aclaró después que esto es intencional: es una sección de **diseño**
quemada, no un teaser de datos reales — la ficha real (`/stays/quito-condos/`)
ya vive en Sanity aparte. Se sacó el `getStay()`/guard y quedó hardcodeada en
`StaysAndReviews.astro` igual que `staysImage`/`staysCrabImage` ya lo estaban
(siempre visible, sin depender de que se publique nada en Sanity).

**Bug real encontrado y arreglado de paso** (reportado por el usuario como
"el logo del header lleva a la sección de tours"): no era el logo — era
`FeaturedTours.astro:140`. `initial.scrollIntoView({block: 'nearest', ...})`
en el carrusel de day-tours de home corría en cada carga de la página; como
esa sección está debajo del fold en el primer paint, `block: 'nearest'`
igual cuenta como "no visible" y el navegador scrollea la página entera
hasta ahí — pasaba en toda carga de home (directa o por click en el logo).
Fix: reemplazado por cálculo manual de `wrap.scrollLeft` (centra la card
dentro del carrusel sin tocar el scroll de la página).

## 2026-09-02 — Caché de contenido Sanity + webhook de revalidación

El usuario preguntó cómo refrescar el sitio cuando alguien publica en Sanity
Studio (webhook vs. endpoint). Al revisar la config real (`astro.config.mjs`:
`output: 'server'` + adapter node standalone, proceso persistente en
Dokploy — no estático) resultó que el problema de fondo no era freshness:
`lib/content.ts` pegaba a Sanity (`useCdn: true`) en **cada request** para
ships/tours/stays/reviews/socialLinks, sin caché propia. `useCdn` cachea en
el borde de Sanity pero igual cuenta cada request contra la cuota de
`API CDN requests` del free tier (hard cap, sin overage — a 100% el sitio
devuelve `402` y deja de cargar contenido). El usuario aclaró la intención
real: todo ese contenido es efectivamente estático — solo debe refetchearse
cuando alguien sube algo nuevo en Sanity, nunca por timer/visita.

Implementado:
- `lib/cache.ts`: se agregó `clear()` a `CacheStore` (antes solo `get`/`set`).
- `lib/content.ts`: todas las funciones que llaman `sanity.fetch` ahora pasan
  por `cachedFetch(key, query)`, TTL de 24h — **no** es el mecanismo de
  refresco normal, es solo red de seguridad por si un webhook se pierde (las
  best-practices de Sanity son explícitas: no confiar solo en webhooks).
- `server/sanity-webhook.ts` + `pages/api/sanity-revalidate.ts`: endpoint que
  recibe el webhook de Sanity, verifica la firma con `@sanity/webhook`
  (`isValidSignature`, paquete oficial, cero deps — mismo esquema HMAC que
  Stripe) y hace `cache.clear()` completo. Sin granularidad por `_type`: el
  set de contenido cacheado es chico, invalidar todo es barato y evita
  mantener un mapa `_type` → cache-key que se desactualizaría.
- `server/env.ts`: `SANITY_REVALIDATE_SECRET` opcional (patrón `CRON_SECRET`)
  pero con el default invertido — si no está seteada, el endpoint responde
  `501` (deshabilitado) en vez de quedar abierto, porque un caller no
  autenticado que lo golpee fuerza refetch constante y anula el propósito
  del caché (a diferencia de `CRON_SECRET`, que se deja abierto a propósito
  en local).
- `.env.example` documentado. `pnpm astro check` (0 errores) y `pnpm test`
  (53 tests) verificados después del cambio.

Disponibilidad/precio de barcos (vendor API) queda **fuera de esto a
propósito** — sigue su propio patrón fresh/stale ya existente en
`lib/availability.ts`, que es más agresivo por naturaleza (los precios sí
cambian solos, sin publish de nadie).

Pendiente (requiere acceso a paneles, no se tocó sin permiso): crear el
webhook en sanity.io/manage apuntando a `/api/sanity-revalidate` con filtro
`_type in ["ship","trip","stay","review","socialLinks"]` sin drafts/
versions, y setear `SANITY_REVALIDATE_SECRET` en Dokploy (staging y
producción). Ver `docs/status.md`.


## 2026-09-02 — SANITY_REVALIDATE_SECRET en Dokploy + config.json apuntando a otro panel

Tarea: agregar `SANITY_REVALIDATE_SECRET` a `gab-staging-web` y
`gab-production-web` en Dokploy y aplicarla (ver entrada de arriba, misma
fecha, para el porqué de la variable).

**Bloqueante encontrado antes de tocar nada:** el CLI local
(`config.json`) apuntaba a `https://dokploy.kernixstudios.com` — un panel
Dokploy *distinto*, no una URL vieja de este mismo panel (confirmado listando
`project.all`: solo `Kernix Studios`, `chatbot-hackathon`, `Agencia
Creativa`, nada de Galápagos & Beyond). Corregida la `url` a
`https://panel.galapagosandbeyond.com`; el token viejo no servía ahí (`401`),
se pidió uno nuevo al usuario (`Settings → Profile → Generate`) y se
reautenticó con `dokploy auth`. Detalle completo y qué revisar la próxima vez
en `docs/deploy-staging.md` → "Deuda pendiente".

Con el token válido:
- `dget application.one` para traer el `env` actual de cada app (staging:
  `DRO-xIbew6vZujrh72Hi6`, producción: `y39C4ey9e6-jWiggBUvNz`), le anexé la
  línea nueva sin tocar el resto, y guardé con
  `application.saveEnvironment` (pasando `buildArgs`/`buildSecrets` vacíos y
  el `createEnvFile` que cada app ya tenía — `false` en staging, `true` en
  producción — para no cambiar ese flag de paso).
- Para aplicar la env var sin rebuildear encontré (leyendo el router del
  server de Dokploy en GitHub, no solo el `--help`) que `application reload`
  es la operación correcta: recrea el container/service Docker desde la fila
  actual de la app en la base de datos, sin pasar por el pipeline de build.
  `redeploy`/`deploy` sí rebuildean desde git — innecesario y más riesgoso en
  producción para un cambio de env var. `reload` exige `--appName` aunque
  `--help` no lo marca como obligatorio (mismo patrón que los `save-*`, ver
  `docs/deploy-staging.md`). Reload corrido en ambas apps, `applicationStatus`
  quedó `done` en las dos.

**Verificación con curl reveló el problema real: 404, no 401 ni 501.**
`git status` mostró que `web/src/pages/api/sanity-revalidate.ts` está
`??` (untracked) y `web/src/server/env.ts`, `lib/cache.ts`, `lib/content.ts`
modificados sin comitear en la rama `staging` local — el endpoint nunca se
subió a GitHub, así que ni `gab-staging-web` ni `gab-production-web` corren
ese código todavía, sin importar qué env var tengan. La env var y el
`reload` quedaron aplicados correctamente del lado de Dokploy; lo que falta
es comitear y pushear el feature (pendiente de confirmación del usuario, no
se hizo sin permiso). Ver `docs/status.md` → Pendiente.


## 2026-09-02 (cont.) — Endpoint desplegado en staging, verificado end-to-end

El usuario comiteó y pusheó el código (`web/src/pages/api/sanity-revalidate.ts`,
`server/sanity-webhook.ts`, `server/env.ts`, `lib/cache.ts`, `lib/content.ts`,
`.env.example`) a `origin/staging`, commit `7320f08`. Explícitamente **no**
tocar `gab-production-web` ni la rama `production` todavía.

El push disparó el deploy automático de `gab-staging-web` sin problema — el
webhook GitHub→Dokploy (roto una vez en 2026-07-29, ver "Quirks conocidos")
siguió funcionando. `deployment.all` mostró el deployment `_8JAJkbjqG6nA9dLKetPi`
para el commit `7320f08`, `running` a las `2026-09-03T00:08:55Z`, `done` unos
~3 minutos después. `application.one` confirmó `applicationStatus: done`.

Verificación con curl contra `https://dev.galapagosandbeyond.com/api/sanity-revalidate`:
- Sin header `sanity-webhook-signature`: `400 {"message":"missing
  sanity-webhook-signature header"}`.
- Con header inventado (`t=0,v1=x`): `401 {"message":"invalid signature"}`.

Ambos confirman lo esperado: el código está desplegado y `SANITY_REVALIDATE_SECRET`
quedó bien configurada (si no lo estuviera, respondería `501`). Staging queda
end-to-end funcional. Producción sigue con el código viejo a propósito — la
env var ya está seteada ahí (ver entrada anterior) pero el deploy queda
pendiente de decisión explícita del usuario.

## 2026-09-08 — Schedule Job para expirar orders `pending` abandonados (solo staging)

Endpoint nuevo `/api/cron/expire-stale-orders` (commit `d5ac27b` en
`origin/staging`) ya tenía código y tests; faltaba el Schedule Job en
Dokploy para dispararlo. Mismo patrón que `warm-availability`: mismo
`CRON_SECRET` (no se creó ni tocó uno nuevo), misma forma de `node -e`
porque `node:22-slim` no trae `curl`.

Antes de crear el job: se esperó a que el deploy automático del commit
`d5ac27b` en `gab-staging-web` terminara (`deployments[].status` pasó de
`running` a `done` tras ~2 minutos de polling) — crear el Schedule Job antes
hubiera apuntado a una imagen sin el endpoint.

**Detalle nuevo del CLI 0.3.0 no documentado antes:** `schedule create` es
un `apiPost`, así que sí funciona vía CLI directo (a diferencia de los
`schedule list`/`schedule one`, que son GET con parámetros y sufren el bug
de siempre — se resolvieron con `dget`). De los ~15 flags que `--help`
lista, solo `--name`, `--cronExpression` y `--command` resultaron ser
`requiredOption` reales (confirmado leyendo
`dist/generated/commands.js` del paquete instalado, no solo `--help`) — el
resto (`--appName`, `--applicationId`, `--scheduleType`, etc.) sí son
opcionales de verdad esta vez, a diferencia del patrón de los `save-*` donde
"opcional" en `--help` casi siempre significaba "obligatorio en el server".
También: `schedule list` pide el ID de la app bajo el nombre de parámetro
`id`, no `applicationId` (`dget schedule.list
'{"id":"<applicationId>","scheduleType":"application"}'`).

Job creado: `expire-stale-orders`, cron `0 3 * * *` (UTC, una vez al día —
no es urgente como la disponibilidad), `scheduleId`
`aYJimTnFSfc8MmQHzobSi`, `enabled: true`.

**Verificación real, no asumida.** `dokploy schedule run-manually
--scheduleId aYJimTnFSfc8MmQHzobSi` disparó una corrida inmediata sin
esperar al cron; quedó `done` sin `errorMessage`, pero eso por sí solo no
prueba que el endpoint devolviera 200 (el comando hace `.then(r=>r.text())`
sin chequear `r.ok`, así que un 404/502 también terminaría en `done`). La
prueba real fue pegarle directo al endpoint público con `curl`: sin header
`authorization` devolvió `404` (mismo diseño que `warm-availability`, no
revela que la ruta existe), y con `Bearer <CRON_SECRET>` (el mismo valor ya
seteado en el env de `gab-staging-web`, sacado con `dget application.one`,
no uno nuevo) devolvió `200 {"ok":true,"expiredCount":0}`.
`expiredCount: 0` es el resultado correcto — no había bookings `pending` de
más de 24h en staging en ese momento.

**Solo staging, como se pidió explícitamente.** No se tocó
`gab-production-web` ni la rama `production` — el commit `d5ac27b` vive
únicamente en `origin/staging`. Detalle completo (comandos exactos,
resultado del `schedule.list`) en `docs/deploy-staging.md` -> "8b. Cron de
expiración de orders pending abandonados". `docs/status.md` actualizado:
el pendiente "Limpieza de bookings pending abandonados" se movió de
Pendiente a Hecho.

## 2026-09-09 — Claves live de Stripe/PayPal + dominio de producción en Dokploy

El usuario armó a mano las claves live de Stripe (restricted key, permiso
único Checkout Sessions → Write, sin Connect) y PayPal (app en modo Live,
reemplaza la sandbox `galapagosandbeyond-astro`), más el webhook de Stripe
en modo Live (`checkout.session.completed`, `checkout.session.expired`,
`charge.refunded`, versión de API `2026-08-26.dahlia` — la exacta pineada en
código, `2026-06-24.dahlia`, no estaba en el selector del dashboard). Antes
de subir las credenciales de PayPal se confirmó con el usuario que eran
realmente las de la app Live (el `.env` tenía un comentario obsoleto que
decía "PayPal sandbox app" encima).

Cargado en `gab-production-web` vía Dokploy (`application.saveEnvironment` +
`application reload`, mismo patrón que `SANITY_REVALIDATE_SECRET` el
2026-09-02): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV=live`. Bug
nuevo del CLI encontrado en el camino: `application reload` pide tanto
`--appName` (ya documentado) como `--applicationId` (no documentado antes) —
ver `docs/deploy-staging.md`.

Se agregó también el dominio `www.galapagosandbeyond.com` a
`gab-production-web` en Dokploy, replicando la config real de
`dev.galapagosandbeyond.com` (puerto 4321, Let's Encrypt) — confirmado con
`nslookup` que el DNS todavía no apunta al VPS (sigue en Hostinger/WordPress),
así que el certificado no emite todavía y no hay riesgo para el sitio en
vivo. El cutover de DNS lo hace el usuario aparte. `astro.config.mjs` tenía
un `TODO(kevin)` de "confirmar dominio final" — se resolvió, ya no es TODO.

**Confirmado que sigue faltando**: SMTP real en el env de producción (sin
`SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`/`BOOKING_NOTIFY_EMAIL` — los emails de
compra caerían a `console.log`), y el mapa de redirects 301 (ver abajo, ya
investigado pero no implementado). Detalle completo de las env vars y el
dominio en `docs/deploy-staging.md` → "Producción en vivo (2026-09-09)".

## 2026-09-09 (cont.) — Investigación de URLs viejas de WP para redirects 301

Antes de implementar los 301 hacía falta la lista real de URLs publicadas en
el WP viejo — se usó el MCP `novamira-galapagosandbeyo` (WordPress abilities,
`execute-php` con `get_posts`/`get_permalink`/`wp_get_post_terms`) para
sacarla real, sin inventar patrones. Post types relevantes: `st_tours` (37,
tema Traveler), `st_hotel` (2), `page` (59, casi todo infraestructura de
WooCommerce/Elementor sin valor SEO), `post` (10, contenido demo del tema,
nunca fue real — descartado).

**Cruceros** (13 con taxonomía `cruises`, cruzados contra `ship` en Sanity
por nombre de barco, no por slug — varios no coinciden exacto):
`/st_tour/galaxy-orion-yacht/` → `/cruises/galaxy-orion-yacht/`*,
`/st_tour/bonita-yacht/` → `/cruises/bonita-yacht/`,
`/st_tour/ecogalaxy-catamaran/` → `/cruises/eco-galaxy-catamaran/`*,
`/st_tour/galaxy-diver-iii/` → `/cruises/galaxy-diver-iii/`,
`/st_tour/galaxy-diver-ii/` → `/cruises/galaxy-diver-ii/`,
`/st_tour/galaxy-stella/` → `/cruises/galaxy-stella/`,
`/st_tour/alya-catamaran/` → `/cruises/alya-catamaran/`,
`/st_tour/galaxy-sirius-catamaran/` → `/cruises/galaxy-sirius/`*
(*slug nuevo distinto al viejo, confirmar exacto contra Sanity antes de
implementar). Sin match (4): `5-days-cruise-orio`, `4-days-cruise`,
`6-days-cruise-c`, `6-days-cruise` — títulos genéricos sin barco asociado
(meta vacío); recomendación: redirigir a `/cruises/` (hub) salvo que alguien
identifique a mano el barco real.

**Tours** (24 no-cruceros): la gran mayoría (20) tiene el mismo slug viejo y
nuevo, `/st_tour/<slug>/` → `/tours/<mismo-slug>/` — confirmado contra
`getTours()`. Sin match: `san-cristobal-360` e `isla-lobos` (no existen en
el catálogo actual, decidir a mano si se discontinuaron). Duplicado:
`day-land-tour-bartolome` (post viejo, ID 14527) apunta al mismo tour que
`tour-to-bartolome-island` (ID 16939) — redirigir ambos a
`/tours/tour-to-bartolome-island/`.

**Stays**: `/st_hotel/galapagosandbeyond-hotel-with-breakfast-and-sauna/` →
`/condo-galapagos/`, `/st_hotel/galapagos-beyond-quito-condo/` →
`/stays/quito-condos/`.

**Estáticas/hubs**: `/about/`, `/contact/`, `/faq/`, `/cruises/`, `/` sin
cambio de path. `/privacy-policy/` → `/privacy/`. Tres URLs viejas de hub de
tours colapsan en las nuevas categorías: `/daily-tours-galapagos-and-beyond/`
y `/day-land-tours-galapagos-and-beyond/` (duplicadas entre sí) →
`/tours/day-tours/`, `/divingtours-galapagosandbeyond/` → `/tours/diving/`,
`/all-inclusive-tours/` → `/tours/multi-day/`. No había página vieja de
Terms & Conditions ni Cookie Policy en WP (solo Privacy Policy) — esas dos
son contenido nuevo sin predecesor, no hay nada que redirigir ahí.

**Sin redirect a propósito**: blog demo (10 posts, contenido de plantilla
tipo "Meet the Steve Jobs of the travel industry", nunca fue real), el resto
de `page` (carritos/checkout/login/shop multi-idioma, templates de
Elementor). `st_cars`/`st_rental` (29/24, post types del tema Traveler) no
se revisaron — el negocio no renta autos, pero no se confirmó si tienen
posts publicados reales; repetir la consulta si hace falta.

**Nada implementado todavía** — esto es solo el mapa. Falta decidir los
casos sin match y escribirlo en `astro.config.mjs` (`redirects`) o
middleware antes del cutover de DNS.


## 2026-09-09/10 — Dominio apex `galapagosandbeyond.com` agregado a producción

Se agregó el dominio pelado (sin `www`) a `gab-production-web` en Dokploy,
replicando exactamente la config de `www.galapagosandbeyond.com` (agregada
horas antes, mismo día): `domainId TBJrXzJuHZX_wjmdUVWfI`, puerto `4321`,
`https: true`, `certificateType: letsencrypt`, `path: "/"`,
`internalPath: "/"`, `domainType: application`. Confirmado leyendo
`application.one` antes de crear (para copiar los valores reales del `www`,
no asumirlos) y después (para verificar que ambos quedaron en `domains[]`).

Se corrió `dokploy settings reload-traefik` inmediatamente después de crear
el dominio, sin esperar a que fallara primero — aprendizaje de la sesión de
`www`: Traefik no dispara el intento ACME solo con agregar el router en
caliente, hace falta el reload explícito.

DNS del registro `@` de `galapagosandbeyond.com` todavía NO apunta al VPS
(`nslookup` devuelve IPs ajenas, no `31.97.148.143`) — el certificado Let's
Encrypt no puede emitir hasta que el usuario cambie ese registro. Esperado,
mismo patrón que con `www`: cero riesgo para lo que hoy sirve ese dominio
mientras tanto. Falta que el usuario haga el cutover de DNS del apex (además
del de `www`, que sigue pendiente también).

## 2026-09-09 (continuación) — Cutover de DNS del apex confirmado, certificado emitido con un solo `reload-traefik`

El usuario cambió el registro `A @ → 31.97.148.143` de `galapagosandbeyond.com`
(apex, sin `www`). Verificado con `nslookup` contra 8.8.8.8 y 1.1.1.1 (el
resolver DNS local del ISP, `ns1.fastboy.com.ec`, seguía sin devolver
respuesta en el momento de la verificación — lag/caché puramente local, no
afecta a usuarios reales; Google y Cloudflare ya resolvían bien).

Con el DNS confirmado, `dokploy settings reload-traefik` solo (sin
recrear el dominio) bastó para que Let's Encrypt emitiera: a los ~30s el
certificado en `galapagosandbeyond.com:443` pasó de autofirmado
(`CN=TRAEFIK DEFAULT CERT`) a real (`O=Let's Encrypt, CN=YR1`,
`subject=CN=galapagosandbeyond.com`, válido hasta 2026-12-09). `domainId`
**no cambió** (`TBJrXzJuHZX_wjmdUVWfI`), no hizo falta el plan B de
borrar/recrear el dominio que el usuario tenía preparado como contingencia.
`https://galapagosandbeyond.com/` responde `200`.

**Aprendizaje que ajusta el de la entrada anterior (2026-09-09/10):** ahí se
concluyó que un `reload-traefik` corrido *antes* de que el DNS apuntara al
VPS no alcanzaba (por eso se documentó el plan de recrear el dominio como
fallback). Con el DNS ya apuntando bien, un solo `reload-traefik` *después*
del cutover fue suficiente — el bug real de la sesión de `www` (Traefik sin
reintentar el challenge ACME solo) se resuelve con el reload, no
necesariamente con un recreate del dominio; el recreate es el fallback si el
reload no alcanza, no el paso obligatorio.

`www.galapagosandbeyond.com` y `gab-staging-web` no se tocaron en esta
sesión (fuera de alcance, seguían con su estado previo).

## 2026-09-09 (continuación) — Auditoría de seguridad pre-producción + fixes

Revisión de seguridad de los commits recientes en dos pasadas (dos
sub-agentes independientes, uno con Sonnet y otro con Fable, cubriendo áreas
distintas del código para no duplicar). Primera pasada (cron/webhook/inquiry/
email/cache/Prisma/redirects) no encontró nada explotable — esos puntos ya
estaban bien defendidos. Segunda pasada (checkout/pagos/orders/IDOR/CORS)
encontró 3 hallazgos reales, los 3 corregidos en esta misma sesión:

**HIGH — path/query injection en captura de PayPal → refund/void no
autorizado.** `orderId` llegaba del cliente a `/api/paypal/capture-order`
sin validar formato y se interpolaba directo en el path de un POST
autenticado con el token OAuth del merchant
(`server/payments/paypal.ts` → `.../orders/${orderId}/capture`). El parser
de URL normaliza `..`, así que un `orderId` tipo
`../../payments/captures/<CAPTURE_ID>/refund?x=` redirige esa llamada
autenticada al endpoint de refund de PayPal — un comprador legítimo podía
auto-reembolsarse usando el capture ID de su propio recibo, sin que quedara
registro en nuestra DB (la orden no matchea, tira 500, pero la plata ya
salió). Fix: `orderId` ahora exige regex estricto, se verifica que exista
una `Order` `pending`/`paypal` con ese id ANTES de llamar a PayPal (404 si
no), `encodeURIComponent` como defensa en profundidad, y `captureOrder()`
ahora valida que el monto/moneda capturados coincidan exacto con lo
cobrado en checkout (si no, error en vez de marcar `paid`).

**MEDIUM — Stripe confirmaba `paid` sin chequear `payment_status`.**
`checkout.session.completed` marcaba la orden pagada y mandaba el email de
confirmación sin leer `session.payment_status` — con métodos de pago
diferidos (ACH, bank transfer, si se habilitan algún día en el Dashboard)
Stripe manda ese evento con `payment_status: "unpaid"` y confirma después
vía `async_payment_succeeded`/`async_payment_failed`, eventos que no se
manejaban. Fix: solo marca `paid` si `payment_status === 'paid'`; se agregó
manejo de ambos eventos async (`markStripeFailed` nuevo en `orders.ts`).

**LOW — upsert de `Customer` sin auth podía pisar nombre/teléfono de un
cliente real.** `createPendingOrder` (llamado por checkout no autenticado)
hacía `customer.upsert` con `update: { name, phone }` — cualquiera podía
iniciar un checkout con el email de un cliente real y datos falsos,
ensuciando su ficha antes de una compra legítima futura. Fix: el upsert ya
no actualiza `name`/`phone` de un cliente existente, solo los setea al
crear el registro por primera vez.

Además, a pedido explícito (no parte de los 3 hallazgos de arriba, ítems
Low que quedaron pendientes del reporte): rate limiting en memoria (10
req/min por IP, ventana deslizante) en `/api/checkout`,
`/api/paypal/create-order`, `/api/paypal/capture-order` y `/api/inquiry`
(`web/src/middleware.ts`) — IP leída de `X-Forwarded-For` tomando el
**último** valor (el que agrega Traefik, no falseable por el cliente),
porque `context.clientAddress` de Astro no resuelve el IP real detrás de un
proxy en modo `node standalone`. Y headers de seguridad base en toda
respuesta: `X-Content-Type-Options`, `X-Frame-Options: DENY`,
`Referrer-Policy`, `Strict-Transport-Security`. CSP deliberadamente omitida
(Stripe/PayPal SDK + assets de Sanity desde varios hosts — una CSP mal
armada rompe el checkout en silencio).

**Limitación conocida:** el rate limiter es en memoria, solo funciona
correctamente con un único proceso/contenedor (consistente con el deploy
actual en Dokploy). Si en algún momento se escala a múltiples réplicas hay
que moverlo a un store compartido (Redis, ya usado para el caché de
disponibilidad — ver `docs/adr/`).

Verificado con `pnpm test` (60/60) y `pnpm astro check` (0 errores) en
`web/` después de cada tanda de cambios. Tests nuevos/actualizados en
`server/payments/paypal.test.ts` y `server/payments/stripe-webhook.test.ts`.

## 2026-09-09 (continuación 2) — Zona de Cloudflare de `galapagosandbeyond.com`: pending, y sus registros no coinciden con el VPS

A pedido del usuario ("configurar lo de Cloudflare" → activar el proxy),
se inspeccionó la zona vía el MCP de Cloudflare (`GET /zones`, read-only)
antes de tocar nada, como manda `CLAUDE.md`. Dos hallazgos importantes que
**no se corrigieron**, el usuario pidió solo dejar constancia por ahora:

1. **La zona está en `status: "pending"`**, `activation_failure_reason:
   "ns_delegated_from_provider"` — el registrador (nameservers actuales
   `ns1/ns2.dns-parking.com`) todavía NO delega a los nameservers de
   Cloudflare (`candy.ns.cloudflare.com`/`marek.ns.cloudflare.com`).
   Cloudflare **no es autoritativo** para este dominio hoy; nada de lo que
   se edite en esa zona tiene efecto en tráfico real hasta que se haga ese
   cambio de NS en el registrador (mucho más grande que un cambio de
   registro DNS suelto).
2. **Los registros ya cargados en esa zona no coinciden con la infra real.**
   `dev.galapagosandbeyond.com` y `panel.galapagosandbeyond.com` sí apuntan
   bien a `31.97.148.143` (el VPS). Pero el apex `galapagosandbeyond.com`
   (A/AAAA) apunta a `88.223.87.94`/`145.223.124.57`/dos IPv6 desconocidas,
   y `www.galapagosandbeyond.com` es un CNAME a
   `www.galapagosandbeyond.com.cdn.hstgr.net` (Hostinger, el hosting viejo
   de WordPress) — ninguno de los dos apunta al VPS. Todos los registros ya
   tienen `proxied: true`.

**Conclusión:** el cutover del apex que se dio por confirmado el
2026-09-09 (nslookup contra 8.8.8.8/1.1.1.1 → `31.97.148.143`, certificado
Let's Encrypt emitido) tuvo que haber pasado por el DNS del **registrador
directo**, no por esta zona de Cloudflare — esta zona parece un intento de
migración a Cloudflare que quedó a medias/desactualizado, no la fuente de
verdad actual del DNS.

**Confirmado por el usuario** (mismo día, pegó el panel DNS real de
Hostinger): Hostinger es hoy el DNS autoritativo (nameservers ahí, no en
Cloudflare) y sus registros están todos correctos — apex/`www`/`dev`/`panel`
→ `31.97.148.143`, MX/DKIM/SPF/DMARC de Google Workspace intactos. Eso
confirma que el sitio funciona hoy vía Hostinger DNS, no Cloudflare.

**Se sincronizó la zona de Cloudflare** con esos valores reales (edición de
registros, dentro de lo permitido sin preguntar por `CLAUDE.md`): apex A
corregido a `31.97.148.143` (se borró el duplicado con IP vieja
`145.223.124.57` y las 2 AAAA que no correspondían a nada), `www` pasó de
CNAME a `www.galapagosandbeyond.com.cdn.hstgr.net` (CDN viejo de Hostinger)
a A record → `31.97.148.143`. `dev`/`panel` ya estaban bien, sin cambios.
Se subió también el modo SSL/TLS de la zona de `Full` a `Full (strict)`
(gratis, confirmado con el usuario antes de tocarlo por ser config de zona
y no un registro DNS puntual) — válido porque el VPS ya sirve un
certificado Let's Encrypt real vía Traefik.

**Sigue sin activarse el CDN de Cloudflare en sí** — la zona ya está lista
(registros correctos + SSL strict) pero el NS del dominio sigue apuntando
al registrador/Hostinger, no a Cloudflare (`candy.ns.cloudflare.com` /
`marek.ns.cloudflare.com`). Cambiar el NS es una acción en el panel de
dominios (registrador — probablemente el mismo panel de Hostinger, o donde
sea que el usuario gestione el registro del dominio, no el panel de DNS de
Hostinger que ya mostró), fuera del alcance del MCP de Cloudflare y no
hecha en esta sesión — pendiente de que el usuario decida hacerlo.

**Corrección importante (2026-09-11):** se verificó en el navegador
(`https://hpanel.hostinger.com/external-domain/galapagosandbeyond.com/dns`)
que el dominio está cargado en Hostinger como **"dominio externo"** — la
URL empieza con `/external-domain/`. Eso significa que **Hostinger NO es
el registrador**, solo hostea el DNS (por eso las nameservers actuales,
`ns1/ns2.dns-parking.com`, son las de Hostinger para este tipo de setup, no
las del registrador real). La página solo tiene dos pestañas —
"Registros DNS" e "Historial de DNS" — **no hay botón para cambiar
nameservers ahí**, porque Hostinger no tiene ese control sobre un dominio
externo. La guía que se le dio antes al usuario (buscar "Change
Nameservers" dentro de hPanel) estaba mal para este caso — corregir en la
próxima sesión antes de repetirla.

De paso: esa sesión de Hostinger entraba con acceso de administrador a la
cuenta de `enriquecordovavega@gmail.com` (banner propio de Hostinger, "Los
cambios se aplican a su cuenta, no a la suya") — probablemente el cliente
dueño del negocio, no la cuenta del usuario.

**Pendiente real, sin resolver:** falta identificar dónde está registrado
de verdad el dominio (el proveedor donde se paga la renovación anual —
GoDaddy, Namecheap, NIC.ec, otra cuenta de Hostinger, etc.) para poder dar
los pasos correctos de cambio de nameservers hacia Cloudflare
(`candy.ns.cloudflare.com` / `marek.ns.cloudflare.com`). Preguntado al
usuario, sin respuesta todavía en esta sesión. La zona de Cloudflare ya
está lista (ver entrada anterior) para cuando se resuelva esto.

---

## 2026-09-14 — Producción nunca tuvo el cron de disponibilidad; creado

El usuario reportó que hace un rato el API de disponibilidad de barcos
estaba caída en producción pero no en staging, y que al mergear
staging→production "volvió a servir". Pidió entender el mecanismo antes de
asumir que ya estaba resuelto.

**Diagnóstico (verificado en vivo contra la API de Dokploy, no solo leyendo
docs):**
- `lib/availability.ts` pega directo al vendor, cachea en memoria
  (`lib/cache.ts`, un `Map` por proceso) con TTL fresco de 10 min y fallback
  stale de 24h. El render nunca llama al vendor en vivo — solo lee caché.
- Dos mecanismos la calientan: (1) un boot warm-up de un solo intento (3
  reintentos internos) al arrancar el proceso, y (2) un Schedule Job de
  Dokploy pegándole a `/api/cron/warm-availability` cada 10 min.
- `dget schedule.list` contra `gab-staging-web` (`DRO-xIbew6vZujrh72Hi6`)
  devolvió el job `warm-availability` corriendo cada 10 min, todas las
  corridas recientes `done`. El mismo query contra `gab-production-web`
  (`y39C4ey9e6-jWiggBUvNz`) devolvió `[]` — **nunca se había creado ese
  Schedule Job para producción** (`docs/deploy-staging.md` solo lo documentaba
  para staging; confirmado también con un subagente que además encontró que,
  antes del merge del 09-09, producción corría además una versión vieja de
  `availability.ts` sin el `undici.Agent` de timeout largo ni los reintentos
  agregados el 2026-08-02).
- Conclusión: producción dependía solo del boot warm-up contra un vendor con
  handshake TLS flaky (6-15s observado); si ese único intento fallaba, la
  caché quedaba vacía hasta el próximo redeploy — sin red de seguridad. El
  merge staging→production no arregló la causa, solo reinició el contenedor
  y el boot warm-up tuvo suerte esa vez.

**Fix aplicado, con confirmación explícita del usuario ("con los mejores
principios de seguridad" — antes de tocar producción):**
- Confirmado primero que `CRON_SECRET` ya existía en el env de
  `gab-production-web` (revisando solo las *keys* del env, nunca se imprimió
  el valor del secreto en ningún momento) — no hacía falta generar ni pisar
  uno nuevo.
- Creado el Schedule Job `warm-availability` en `gab-production-web`
  (`scheduleId gePud0c3Nbk5A-tpGLVlP`), mismo comando/cadencia/patrón que el
  de staging. Detalle completo (comando exacto) en
  `docs/deploy-staging.md` -> "8. Cron de disponibilidad".
- **Verificación real, no asumida:** `run-manually` dio `done` (no concluyente
  por sí solo, mismo caveat que siempre), así que se confirmó pegándole
  directo al endpoint público: sin `Authorization` → `404` (no revela que la
  ruta existe, mismo diseño que siempre); con el `CRON_SECRET` real (leído del
  env de Dokploy hacia una variable de shell, nunca impreso en la
  conversación ni en el output del comando) → `200 {"ok":true,"shipCount":9}`,
  datos reales de los 9 barcos.
- `expire-stale-orders` sigue siendo solo-staging a propósito — no se tocó,
  no era la causa de esta caída puntual.

`docs/status.md` y la tabla de recursos en `docs/deploy-staging.md`
actualizados con el nuevo `scheduleId`.

---

## 2026-09-22 — Checkout roto en producción: Stripe rechaza el `STRIPE_SECRET_KEY` actual

El usuario reportó "Could not start checkout. Please try again." en
`galapagosandbeyond.com` y dijo que lo único que había cambiado
recientemente era `STRIPE_SECRET_KEY` en el env de `gab-production-web`.

**Sin acceso SSH, se necesitaban logs de runtime del contenedor — la API
tRPC de Dokploy no expone eso, y el CLI tampoco (ni `docker` ni
`application` tienen un subcomando de logs).** El visor de logs del panel
usa un WebSocket aparte (`/docker-container-logs`, no tRPC) leyendo el
código fuente de Dokploy en GitHub
(`apps/dokploy/server/wss/docker-container-logs.ts`); confirmado ahí que
acepta el mismo header `x-api-key` que ya usa `scripts/dokploy-api.sh` (vía
`validateRequest`, `packages/server/src/lib/auth.ts`). Conectado con el
paquete `ws` de npm (el `WebSocket` global del navegador/fetch no permite
headers custom) a
`wss://panel.galapagosandbeyond.com/docker-container-logs?containerId=<appName>&tail=1000&since=all&runType=swarm`
— con `runType=swarm` el parámetro `containerId` debe ser el **nombre del
service** (`appName` real, con sufijo random), no el ID corto de 12 hex
chars que devuelve `docker.getContainersByAppNameMatch` (ese da `no such
task or service`). Queda documentado en `docs/deploy-staging.md` como
técnica reutilizable — no hay otra forma de leer logs de runtime desde este
entorno.

**Hallazgo:** cada intento de checkout desde las 14:15 UTC de hoy falla con
`StripeAuthenticationError: Invalid API Key provided` (`statusCode 401`,
`type invalid_request_error`, sin `requestId` — Stripe rechaza el auth antes
de rutear el request). El contenedor de producción no se reinició desde el
último deploy real (`2026-09-14T22:39`, "Add stay inquiry modal form") — un
solo boot en los logs, sin `reload` de por medio — pero el valor que Stripe
rechaza coincide (por los últimos 4 caracteres que Stripe no enmascara) con
el que `application.one` devuelve como configurado ahora mismo. Es decir:
esto **no** es el bug ya conocido de "se guardó el env pero nunca se hizo
`reload`" — el key que corre es el key configurado, y aun así Stripe lo
rechaza.

Revisado el propio valor por formato (sin verlo completo en la
conversación): prefijo `rk_live_` correcto, 106 caracteres, sin
espacios/CR/saltos de línea al inicio o al final, una sola ocurrencia en el
`.env` (no hay una segunda línea pisándolo). `STRIPE_WEBHOOK_SECRET`,
`PUBLIC_SITE_URL` y `PAYPAL_ENV=live` están todos en modo live, sin mezcla
test/live entre ellos. Con el formato bien y aun así "Invalid API Key
provided", lo más probable es que la restricted key se haya revocado o
regenerado del lado de Stripe después de pegarla en Dokploy (las restricted
keys solo se muestran completas una vez, al crearlas) — no hay forma de
confirmarlo sin entrar al dashboard de Stripe, que queda fuera de este
entorno.

**Queda pendiente que el usuario:** confirme en Stripe Dashboard →
Developers → API keys si esta restricted key sigue activa; si no, generarla
de nuevo (mismo permiso único: Checkout Sessions → Write, sin Connect) y
guardarla con `application.saveEnvironment` + `application reload`
verificando después en los logs que el contenedor efectivamente reinició
(nuevo boot line), no solo que el comando devolvió éxito.

Detalle completo (comando de la técnica de logs, entrada de deuda pendiente)
en `docs/deploy-staging.md`.

---

## 2026-09-24 — Checkout en produccion: mismo error, se descartan dos hipotesis

Seguimiento del hallazgo del 2026-09-22. El usuario confirmo en el Stripe
Dashboard que la restricted key `rk_live_...qmEe` sigue activa (no revocada,
no regenerada). Reproducido el fallo en vivo de nuevo (click real en "Pay
with card" en `/cruises/ecogalaxy-catamaran/`) y jalados los logs mas
recientes de `gab-production-web` por el mismo WebSocket documentado el
22 (`wss://.../docker-container-logs`, ver `docs/deploy-staging.md`).

**El error es identico, caracter por caracter, al de hace dos dias:**
`StripeAuthenticationError: Invalid API Key provided`, `statusCode 401`,
`type invalid_request_error`, `requestId: undefined`, en dos intentos
consecutivos (17:02:44Z y 17:02:54Z hoy). El contenedor no se ha reiniciado
desde 2026-09-22T15:08:25Z (mas de 51h, ni reload ni deploy nuevo en medio).

Dos hipotesis quedan descartadas con evidencia, no supuestos:

- **"El runtime tiene un env viejo que `application.one` ya no refleja"**:
  el valor enmascarado que **Stripe mismo devuelve en el error** (no lo que
  asumimos nosotros) coincide en longitud exacta (106 caracteres) y en los
  4 ultimos caracteres con lo que `application.one` muestra configurado hoy.
  El key que corre en el contenedor es, caracter por caracter, el mismo que
  Stripe esta rechazando.
- **"Le falta el scope Checkout Sessions -> Write"**: `Invalid API Key
  provided` es el mensaje generico de la capa de *autenticacion* de Stripe
  (la key no se reconoce en absoluto), no el mensaje que da una key valida
  pero con permisos insuficientes (que pasa la autenticacion y falla despues
  con un error de permisos distinto).

Hipotesis que queda en pie, no verificable desde este entorno (sin API de
Stripe, sin SSH): el usuario probablemente esta viendo como "activa" una
key con nombre/ultimos-4 parecidos pero en la cuenta o modo equivocado de
Stripe (permite multiples cuentas/negocios bajo un login), o hay dos
restricted keys con el mismo nombre y solo una es la que esta en el `.env`.
Se le pidio al usuario verificar la columna "Last used" del renglon exacto
`...qmEe` en el Dashboard (si no muestra actividad hoy ~17:02-17:03 UTC pese
a los dos intentos reproducidos, confirma que Stripe no encuentra esa key
en absoluto) y el selector de cuenta activa arriba a la izquierda.

Detalle completo (evidencia, comandos, texto exacto de la nueva hipotesis)
en `docs/deploy-staging.md`.

---

## 2026-09-24 — Tours vuelven a pagar directo (con fecha, en modal); cruceros pasan a inquiry-only

Pedido del usuario: en tours falta poder elegir fecha (ya pagaban pero sin
decir cuándo); en cruceros, volver a inquiry pero dejando elegir la fecha
de la tabla de disponibilidad real (no tipeada a mano); y que el formulario
de pago de tours viva en un pop-up, porque el div del sidebar no tenía
espacio para todos los campos. Confirmado con el usuario vía preguntas
antes de tocar código: sí, sacar también el carrito de cruceros (no solo el
botón "Book now"); sí, modal para tours (no inline).

**Tours**: sidebar ahora es un botón "Book this tour" que abre un
`<dialog>` (mismo patrón nativo que ya usaban `AvailabilityTable`/
`TourInquiryForm`) con el `BookingForm` completo adentro. `BookingForm.astro`
sumó dos `<input type=date>` (Start/End date, `required`, `min`=hoy) que
viajan como `departureStart`/`departureEnd` — **mismo nombre de campo que ya
usaban los cruceros**, mismas columnas Prisma (`OrderItem.departureStart/
departureEnd`, ya nullable) → cero migración de schema. `pricing.ts` y
`checkout-request.ts` extendidos para aceptar esos campos opcionales en
items tipo tour (con validación real: fecha de calendario válida, fin ≥
inicio, ambas o ninguna — hallazgo de la revisión, ver abajo).

**Cruceros**: `BookingForm`/Stripe/PayPal quitados del todo — sidebar y
`AvailabilityTable` ("Book now" por fila) ahora abren `CruiseInquiryForm.astro`
(nuevo componente, POST a `/api/inquiry`, mismo patrón dialog que
`TourInquiryForm`/`StayInquiryForm`), con la fecha siempre tomada de la fila
real elegida — nunca un date-picker libre. El ícono "Add to cart" de
cruceros también se quitó de la tabla. `TourInquiryForm.astro` quedó sin
ningún uso → eliminado.

**Revisión independiente con un agente en modelo Fable** (pedido explícito
del usuario) encontró un bug real que yo no había visto: bloqueé el carrito
de cruceros en `CardActions.astro` (`type !== 'cruise'`), pero la pestaña
"Saved" del `CartDrawer` tiene su *propio* botón "Add to cart" para
favoritos, sin el mismo chequeo — un crucero favoriteado todavía se podía
agregar al carrito y pagar. Corregido en la capa de datos, no solo en la UI
que lo disparaba: `cart-store.ts` (`addToCart()` rechaza `type: 'cruise'` al
escribir, `isValidCartItem()` lo filtra al leer — así cualquier carrito
viejo en localStorage con un crucero de antes de este cambio también se
limpia solo) + oculté el botón en la fila de favoritos para que la UI no
prometa algo que la capa de abajo va a rechazar en silencio. Tres capas
ahora: UI, cart-store, y el servidor nunca aceptó cruceros sin
`departureStart` real de todos modos.

Otros hallazgos de la revisión, corregidos: CSS de `.field > span` pisaba el
`<span class="date-input-wrap">` (el valor de la fecha salía en negrita
mayúscula, mismo tipo de bug que ya documentaba un comentario en ese mismo
archivo); el dialog de inquiry de cruceros no se podía reusar para un
segundo pedido en la misma visita (quedaba con el mensaje de éxito viejo);
el mensaje de la inquiry de crucero podía superar el límite de 1000
caracteres del servidor tras anteponer la línea de fecha/precio (ahora se
trunca antes de enviar); botón huérfano en el sidebar si un barco tuviera
`hasLiveAvailability=false` con `apiName` igual seteado (dato inconsistente,
pero el código ya no debía asumir que el dialog existía). Pendiente,
conocido y aceptado: un tour agregado al carrito por el ícono rápido de las
cards (no el modal dedicado) sigue sin fecha — las fechas del carrito
quedaron opcionales a propósito para no romper ese flujo ya existente;
tampoco se verificó el combo PayPal-popup + `showModal()` en sandbox real.

`pnpm astro check` (0 errores) y `pnpm vitest run` (60/60) verdes antes y
después de la limpieza. Probado en navegador: modal de tours (fechas,
validación HTML5, PayPal/Stripe), dialog de inquiry de cruceros (prefill
de fecha/precio desde la fila real), y el fix de favoritos→Saved→sin
"Add to cart" para cruceros, confirmado visualmente tras el fix.

Aparte, en esta misma sesión: el checkout de Stripe en producción estuvo
roto por una `rk_live_` inválida (ver entradas anteriores de hoy en este
log y `docs/deploy-staging.md`) — se resolvió generando una key nueva con
permisos mínimos (Checkout Sessions → Write, confirmado con el MCP de
Stripe + la skill `stripe-best-practices`) y confirmando el checkout real
en producción (sesión `cs_live_...` creada, sin completar el pago).

---

## 2026-09-24 (cont.) — Reversión: cruceros vuelven a pagar directo

A los pocos minutos de la entrada anterior, el usuario pidió deshacer
**solo** la parte de cruceros de ese cambio — quería el flujo de pago
directo (Stripe/PayPal) de vuelta, sin tocar nada de tours (modal + fecha,
que se queda igual).

Reversión hecha reconstruyendo `BookingForm.astro`, `CardActions.astro`,
`AvailabilityTable.astro` y `cruises/[slug].astro` desde el blob de
`d7af324` (el commit justo antes del cambio de cruceros, con tours ya
andando) en vez de revertir a mano — más confiable que reconstruir de
memoria. `cart-store.ts`, `CartDrawer.astro` y `cruises/index.astro` no los
había tocado el commit de cruceros, así que un `git checkout HEAD --` los
devolvió tal cual. Sobre el `BookingForm.astro` restaurado se reaplicó a
mano el único pedazo de esa versión vieja que sí era de tours y no de
cruceros: el CSS/JS de fechas (bug de negrita en el input, sync
inicio→fin, estilos de `.date-input-wrap`) — eso se había agregado en el
mismo commit que lo de cruceros, mezclado. `CruiseInquiryForm.astro`
eliminado (sin uso otra vez). `checkout-request.ts` con la validación de
fechas de tour (calendario real, fin ≥ inicio) se dejó intacta — es
independiente de cruceros y sigue siendo una mejora real.

`pnpm astro check` (0 errores) y `pnpm vitest run` (60/60) verdes.
Confirmado con `git diff d7af324 HEAD` que los 4 archivos reconstruidos
(más los 3 que ya volvieron solos) no tienen diferencia contra esa versión
salvo el CSS de fechas reaplicado. Un agente en modelo Fable revisó todo de
forma independiente después: confirmó que el pago directo de cruceros
quedó completo (Props, hidden input, dialog, carrito, sidebar) y que tours
no se tocó, corrió los checks de nuevo por su cuenta (mismos resultados), y
validó el schema de fechas ejecutándolo contra casos reales. No pudo probar
el flujo hasta Stripe en el navegador porque el API de disponibilidad del
vendor seguía caído en local en ese momento — limitación de entorno, no
del código. Encontró que `docs/status.md` y la entrada anterior de este log
habían quedado desactualizadas (seguían describiendo el diseño inquiry-only
como vigente) — corregido en `docs/status.md`. También dos comentarios
viejos sin importancia (`StayInquiryForm.astro` mencionando el
`TourInquiryForm` ya borrado, `api/inquiry.ts` hablando de "tour inquiries"
cuando tours ya no usa ese endpoint) — quedan pendientes, cosméticos.

## 2026-10-08 — Precios de tours por rango de fechas

Campo opcional `seasonalPrices` en `trip` (label, startDate, endDate, price,
childPrice). Stripe/PayPal no cambian: usan `price_data` inline y el monto sale
siempre de `quote()`. Resolver puro y compartido en `web/src/lib/seasonal-pricing.ts`
(servidor + hint de precio en el navegador).

Reglas (decididas, cubiertas por tests): el precio se elige solo por la fecha de
**inicio**; rango inclusivo en ambos extremos; fuera de todo rango aplica el precio
base; temporada sin `childPrice` → el niño paga el precio adulto de esa temporada
(no el `childPrice` base); entradas malformadas se ignoran, nunca tiran la página;
si hay solapamiento gana el `startDate` más temprano (Studio lo bloquea igual).
Un tour con temporadas vigentes/futuras **exige fecha** al cotizar (sin fecha
caería al precio base = cobrar de menos), así que esas tarjetas son solo-favorito
(no add-to-cart); se reserva desde la ficha. Temporadas ya vencidas no afectan el
"from $X" ni exigen fecha. Add-ons suman `priceDelta` encima del precio de la temporada.
`vitest.config.ts` ahora también incluye `src/lib/**/*.test.ts`.

Pendiente: desplegar el schema al Studio y cargar temporadas reales a mano (no hay
datos inventados). Sin verificar visualmente en navegador todavía.
