# Decisiones de arquitectura

> Solo crece. Nunca se borra una decisión: si cambia, se marca **Reemplazada por ADR-XXX** y se agrega una nueva.
> Formato: contexto → decisión → consecuencias. Corto.

---

## ADR-001 — Salir de WordPress + Elementor
**Fecha:** 2026-10 · **Estado:** Propuesta
**Contexto:** El sitio carga ~50 scripts, 27 CSS y PNG sin optimizar (ver `docs/SITE-AUDIT.md`); la UI no gusta; Elementor Pro + addons encarecen el mantenimiento.
**Decisión:** Reconstruir con Astro; WordPress queda solo como fuente de migración y se apaga tras el lanzamiento.
**Consecuencias:** Se pierde el editor visual de Elementor; el contenido pasa a Sanity. Hay que replicar SEO (Yoast) a mano.

## ADR-002 — Astro estático + Sanity como CMS
**Fecha:** 2026-10 · **Estado:** Propuesta
**Contexto:** Sitio de contenido con poca interactividad; la velocidad es el objetivo. Los servicios transaccionales son externos.
**Decisión:** Astro con salida estática; contenido de Sanity leído en build; rebuild por webhook al publicar. JS de cliente solo en islas.
**Consecuencias:** Publicar tarda lo que tarda un build (minutos). Si se necesita contenido en vivo (p. ej. "abierto ahora"), se resuelve en cliente con datos ya embebidos, no con SSR.

## ADR-003 — Hosting en VPS (estático)
**Fecha:** 2026-10-07 · **Estado:** Aceptada (decisión del dueño). Reemplaza la propuesta inicial de Vercel.
**Contexto:** El dueño usa un VPS. El sitio es estático, así que no necesita runtime de Node para servir páginas.
**Decisión:** Build de Astro (`output: 'static'`) servido por Caddy o nginx en el VPS (o por Dokploy si ya se usa). Redirects 301 en la config del servidor, generados desde `docs/URL-MAP.md`. Sin adaptador de Vercel. HTTPS automático (Caddy/Let's Encrypt). Delante, CDN opcional (Cloudflare gratis) para caché global.
**Consecuencias:** Asumimos operación: backups, actualizaciones, monitoreo y TLS. Los formularios necesitan un endpoint propio (proceso pequeño en el VPS). Sin previews por rama automáticos: se resuelven con un subdominio `staging.` y un build por rama. Ver ADR-008.

## ADR-008 — Publicación desde Sanity con rebuild en el VPS
**Fecha:** 2026-10-07 · **Estado:** Propuesta
**Contexto:** El equipo de marketing edita en Sanity Studio y espera ver el cambio en el sitio sin ayuda técnica.
**Decisión:** Webhook de Sanity (al publicar) → receptor pequeño en el VPS (firma HMAC verificada) → `pnpm build` con cola/debounce (unifica ráfagas de publicaciones) → intercambio atómico del directorio servido (symlink). Studio alojado en Sanity (`*.sanity.studio`). Vista previa de borradores en `staging.` con perspectiva `drafts`.
**Consecuencias:** El cambio aparece en 1–3 min. Si el build falla, el sitio anterior sigue sirviéndose. Alerta (correo) en fallo. Tiempos de build se vigilan al llegar a cientos de páginas.

## ADR-009 — Cambio de DNS sin tocar el correo
**Fecha:** 2026-10-07 · **Estado:** Propuesta
**Contexto:** DNS en GoDaddy (`ns09/ns10.domaincontrol.com`). El dominio usa Microsoft 365 para correo (MX `estancia-com.mail.protection.outlook.com`, SPF, verificación `MS=`), más Google Search Console y Facebook. Hoy el A apunta a `192.124.249.15` (Sucuri CloudProxy) y `www` es CNAME a la raíz.
**Decisión:** El lanzamiento cambia **solo** el registro A de la raíz (y `www` sigue como CNAME). No se tocan MX, TXT ni los registros de Microsoft. TTL a 300 s con 48 h de antelación; plan de vuelta atrás documentado.
**Consecuencias:** Se pierde el WAF de Sucuri: hay que reemplazarlo (Cloudflare delante del VPS, fail2ban, actualizaciones). Requiere acceso a la cuenta de GoDaddy.

## ADR-004 — Redirects 301 y estructura de URLs
**Fecha:** 2026-10 · **Estado:** Propuesta
**Contexto:** 43 páginas y 62 posts indexados; URLs planas en la raíz.
**Decisión:** Nuevas rutas jerárquicas (`/menu/…`, `/austin/…`, `/events/…`, `/news/…`); todas las URLs viejas con 301 definidos en `docs/URL-MAP.md` y aplicados vía `redirects` de Astro/Vercel.
**Consecuencias:** Prueba automática de redirects en CI. Ninguna URL vieja puede quedar sin destino.

## ADR-005 — Marca conservada, UI nueva
**Fecha:** 2026-10 · **Estado:** Propuesta
**Contexto:** El cliente quiere mantener tipografía y colores pero rehacer el diseño.
**Decisión:** Jost + paleta del kit de Elementor (`docs/DESIGN-TOKENS.md`) como tokens CSS. Diseño nuevo, sin framework de UI.
**Consecuencias:** El dorado `#B29955` se usa para acentos y texto grande; para texto pequeño se usa una variante más oscura con contraste AA.

## ADR-006 — Terceros enlazados, no reimplementados
**Fecha:** 2026-10 · **Estado:** Propuesta
**Contexto:** Resy, Toast, DoorDash, Grubhub, Tripleseat y SecureTree ya resuelven reservas, pedidos, grupos y gift cards.
**Decisión:** Se enlazan (URLs viven en `location`/`siteSettings`). La calculadora de grupo se reevalúa como isla propia.
**Consecuencias:** El flujo de compra sale del dominio; se acepta. Cambios de URL del proveedor se corrigen en un solo lugar.

## ADR-007 — Memoria y proceso del proyecto
**Fecha:** 2026-10-07 · **Estado:** Aceptada
**Contexto:** Se quiere el mismo sistema de memoria que `catcaged-productions-sistem`.
**Decisión:** `CLAUDE.md` corto con tabla de ruteo, `docs/STATUS.md` como tablero, `docs/DECISIONS.md` (este archivo), reglas en `.claude/rules/`, agentes en `.claude/agents/`, skill `/wrap-up`, bloqueos en `.claude/settings.json`.
**Consecuencias:** Cada sesión empieza leyendo `STATUS.md` y termina con `/wrap-up`.

## ADR-010 — Demo local con contenido embebido (antes de Sanity)
**Fecha:** 2026-10-08 · **Estado:** Aceptada (temporal)
**Contexto:** El cliente quiere ver el sitio completo en local antes de migrar a Sanity. Todo el contenido público ya está extraído de estancia.com.
**Decisión:** Sitio Astro 7 estático (`pnpm dev` / `pnpm build`) con datos en `src/data/{site,content}.ts` y los 68 posts en `src/data/posts.json` (generado por `scripts/build-posts.mjs` desde la API REST de WordPress). Imágenes reutilizadas del WP, redimensionadas (máx. 2000 px) en `public/img/w/`; los originales (640 MB) viven fuera de `public/` en `assets-src/` (ignorado por git). Movimiento con CSS + `IntersectionObserver` en `src/scripts/motion.ts` (sin GSAP, sin librerías), transiciones de página con `ClientRouter`. Blog en `/news/` (ADR-004 actualizado).
**Consecuencias:** El peso de imágenes aún no cumple el presupuesto (pendiente: AVIF/WebP vía Sanity CDN o `astro:assets`). Los formularios son demo (sin envío). Al migrar, `src/data/*` se reemplaza por consultas GROQ y los tipos de `docs/CONTENT-MODEL.md`.

## ADR-011 — Feriados: hub propio y URLs estacionales conservadas
**Fecha:** 2026-10-08 · **Estado:** Aceptada (auditoría `uiux-seo-expert`)
**Contexto:** El primer migrado redirigía `/holidays/`, `/thanksgiving/`, `/christmas/`, `/new-years/` y `/easter/` a `/events/`, con texto genérico y sin precios, horarios ni takeout. Esas URLs rankean por búsquedas estacionales y la temporada empieza en 7 semanas.
**Decisión:** `/holidays/` pasa a ser un hub (tabla de horarios y precios, tarjeta cortesía, bono de gift cards, grupos con recompensas, formulario, FAQ). `/thanksgiving/`, `/christmas/` y `/new-years/` se conservan como páginas completas (200) con datos de `src/data/holidays.ts`; `/easter/` y `/fathersday/` quedan archivadas («ended») en 200. Solo los eventos únicos fechados viven en `/events/`. `/holidays-schedule/` → 301 `/holidays/`.
**Consecuencias:** Los datos con fecha viven en un solo archivo con ISO y se actualizan cada año. Toda cifra dudosa del original se lista en `docs/PENDIENTES-HOLIDAYS.md` y no se publica sin confirmar. Ver también ADR-004 (redirects).
