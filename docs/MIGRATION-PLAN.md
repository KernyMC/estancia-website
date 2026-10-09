# Ruta de migración: WordPress → Astro + Sanity

**Fecha:** 2026-10-07 · Estado: **propuesta para aprobar** (ver ADRs).

## Objetivo
1. Misma marca (Jost, dorado `#B29955`, negro/blanco), **UI nueva**.
2. Navegación reestructurada (abajo).
3. Contenido en Sanity, editable por el equipo sin tocar código.
4. Mucho más rápido: LCP < 2.0 s móvil, JS de cliente mínimo.
5. **Sin perder posicionamiento:** 301 para todo, misma o mejor información.

## Nueva jerarquía de navegación (propuesta)
Principio: el visitante llega con una de cuatro intenciones — *comer aquí* (reservar), *comer en casa* (pedir), *celebrar con grupo* (eventos privados), *regalar* (gift cards). Y siempre elige primero **local**.

**Barra principal** (máx. 6 entradas + 1 CTA):
| Entrada | Contiene |
|---|---|
| **Menu** | Dinner (churrasco) · Brunch · Salad Bar · Sides · Bar & Cocktails · Dessert · (Coastal Collection) |
| **Locations** | Austin · Leander (cada una: horas, mapa, estacionamiento, menú local, reservar, grupos) |
| **Private Dining** | Grupos y eventos (Tripleseat), calculadora de grupo, por local |
| **Events & Specials** | Weekly Specials · Holidays · Cenas de vino/martini (todo con fechas; lo vencido se archiva) |
| **Order** | Takeout (Toast) · DoorDash · Grubhub, por local |
| **Gift Cards** | Comprar / consultar saldo (SecureTree) |
| **CTA fijo: Reserve** | Selector Austin/Leander → Resy |

**Pie:** News (blog) · FAQ · Contact · Careers · Subscribe · Privacy · redes · horas y teléfono de ambos locales.

Cambios clave vs. hoy: se eliminan "Menu List" duplicado y las páginas de menú sueltas; Holidays pasa de N páginas permanentes a **documentos de evento con fecha**; Reserve se vuelve CTA persistente, no una entrada más; "Contact" y "Careers" bajan al pie.

## Rutas nuevas (resumen; detalle en `docs/URL-MAP.md`)
`/` · `/menu/` `/menu/{brunch,bar,salad-bar,sides,dessert,churrasco}/` · `/austin/` `/leander/` (+ `/menu/`, `/private-dining/`, `/bar-and-patio/`) · `/reserve/` · `/order/` · `/private-dining/` · `/events/` `/events/{slug}/` · `/specials/` · `/gift-cards/` · `/news/` `/news/{slug}/` · `/faq/` `/contact/` `/careers/` `/subscribe/` `/privacy/`

## Arquitectura técnica
- **Astro 5, salida estática** por defecto. Contenido de Sanity consultado en build (GROQ + TypeGen). Reconstrucción por **webhook de Sanity → deploy hook de Vercel** al publicar.
- **Sin SSR salvo necesidad.** Candidatos a SSR/ISR: nada por ahora. Reseñas de Google: se traen en build (o job programado), no widget.
- **Islas** (`client:visible`/`client:idle`) solo para: selector de local en el CTA de reservar, calculadora de grupo, menú móvil. Todo lo demás, HTML/CSS.
- **Imágenes:** Sanity image CDN (`auto=format`, `w`, `q`) o `astro:assets`; WebP/AVIF, `srcset`, `width/height`, LCP con `fetchpriority="high"`.
- **Fuentes:** Jost variable autoalojada, subset latino, `preload` del peso 400/700, `font-display: swap`.
- **Terceros:** GTM/Pixel con `partytown` o carga tras interacción; Resy/Toast/Tripleseat/SecureTree como **enlaces** (nueva pestaña) salvo que se decida incrustar.
- **SEO:** JSON-LD `Restaurant` por local (con `openingHoursSpecification`, `hasMenu`), `Menu`, `Event`, `Article`, `FAQPage`; sitemap generado; canonical; OG por página.

## Modelo de contenido Sanity (borrador, detalle en `docs/CONTENT-MODEL.md`)
`siteSettings` · `location` (×2) · `menu` → `menuSection` → `menuItem` (con alérgenos/dietas) · `event` (fecha inicio/fin, local, estado) · `promotion`/`special` (vigencia) · `page` (secciones componibles: hero, texto, galería, CTA) · `post` + `category` · `faqItem` · `testimonial`/reseña (opcional) · `redirect`. Contenido temporal con campos de vigencia; lo vencido se oculta del build.

## Fases
| Fase | Entregable | Salida verificable |
|---|---|---|
| **0. Descubrimiento** ✅ | `SITE-AUDIT`, `URL-MAP`, esta ruta | Aprobación del cliente de IA y ADRs |
| **1. Medición base** | Lighthouse/CrUX de 5 páginas; qué eventos de GTM/Pixel se usan; destino de formularios | Tabla antes/después |
| **2. Diseño** | Tokens, sistema de componentes, 4 plantillas (home, local, menú, post) en Astro con datos de ejemplo | Maqueta navegable en Vercel Preview aprobada |
| **3. Modelo y Studio** | Esquemas Sanity, Studio desplegado, TypeGen | Un editor crea un evento y un ítem de menú sin ayuda |
| **4. Migración de contenido** | Script de importación (WP REST API `/wp-json/wp/v2/*` → Sanity), limpieza de Elementor, dedupe | Los 43+62 contenidos en Sanity, revisados por muestreo |
| **5. Ensamble** | Todas las rutas, JSON-LD, sitemap, redirects 301, formularios | Lighthouse ≥ 95 móvil en las 5 páginas; diff de URLs = 0 sin destino |
| **6. QA y SEO** | `seo-auditor`, accesibilidad, prueba de redirects URL por URL, staging con cliente | Checklist de lanzamiento firmado |
| **7. Lanzamiento** | Cambio de DNS, Search Console (sitemap nuevo), monitoreo 30 días | Sin caída de impresiones/clics > 10 % tras 2 semanas |

**Estrategia de contenido WP:** extraer por API REST (no scraping): `posts`, `pages`, `media`, `categories`. El cuerpo de Elementor viene como HTML sucio → convertir a Portable Text solo para posts; las páginas se rehacen a mano como secciones componibles (son pocas).

**Formularios:** reemplazar WPForms por endpoint propio (Vercel Function) → correo transaccional, con honeypot y Turnstile. Empleo: sin guardar datos sensibles en Sanity.

**Riesgos:** pérdida de SEO por redirects mal hechos (mitigar con URL-MAP y prueba automática) · contenido vencido indexado (archivar) · el equipo del restaurante no sabe usar Sanity (capacitación + Studio simple) · terceros (Resy/Toast) con cambios de URL (centralizar en `location`).

## Decisiones tomadas (2026-10-07)
- **Hosting:** VPS del dueño, sitio estático (ADR-003). Rebuild por webhook (ADR-008).
- **DNS:** GoDaddy; correo en Microsoft 365, no se toca (ADR-009). Falta acceso a la cuenta de GoDaddy.
- **Editores:** equipo de marketing, en Sanity Studio. Roles: `editor` (sin acceso a esquema ni a ajustes técnicos). Studio con vistas simples por tipo (Menús, Eventos, Especiales, News).
- **Blog:** los 62 posts son «Estância's News» (listado hoy en `/estancias-news/`). Se mantienen; el nombre de ruta sigue abierto (abajo).

## Decisiones abiertas
1. ~~Ruta del blog~~ Decidido: `/news/` (2026-10-07).
2. ¿Se incrusta Resy/Toast o solo se enlaza? (recomiendo enlazar)
3. ¿Se conserva Sucuri o se pasa a Cloudflare delante del VPS?
4. ¿Quién tiene la cuenta de GoDaddy? (hay que confirmarlo antes de la Fase 7)
5. ¿Cuántas personas de marketing editan y con qué frecuencia? (define permisos y ritmo de builds)
