# Auditoría del sitio actual (estancia.com)

**Fecha:** 2026-10-07 · Método: sitemap Yoast, HTML de la home y de 4 páginas clave, CSS de Elementor. Falta correr Lighthouse/CrUX (ver "Pendiente").

## Qué es
Estância Brazilian Steakhouse (churrascaria, rodízio). Dos locales:
- **Austin** — 10000 Research Blvd, Ste B · (512) 345-5600
- **Leander** — 2132 Raider Way · (512) 889-8000

## Stack actual
WordPress 7.1.3 · tema propio `estancia` (hijo/mínimo) · **Elementor 4.3 + Elementor Pro + Essential Addons** · Yoast SEO · Site Kit (Google) · Facebook Pixel · Pojo Accessibility / widget a11y de Elementor · WPForms · TrustIndex (reseñas) · TrustedSite.

## DNS y hosting actual (2026-10-07)
- DNS en **GoDaddy** (`ns09/ns10.domaincontrol.com`). `www` es CNAME a la raíz.
- A raíz → `192.124.249.15`, detrás de **Sucuri CloudProxy** (WAF/CDN, además de caché tipo Cloudflare `CF-Cache-Status: HIT`). Explica los cortes intermitentes a scripts.
- Correo en **Microsoft 365** (MX `estancia-com.mail.protection.outlook.com`, SPF, `MS=` y firmas `emailsignatures365`). **No tocar** en el cambio de DNS (ADR-009).
- Verificaciones activas: Google Search Console y Facebook domain.
- API REST de WordPress pública: sirve para extraer contenido sin acceso al admin.

## Marca a conservar
| Token | Valor | Origen |
|---|---|---|
| Fuente | **Jost** (400, 500, 700) | Elementor kit global |
| Dorado (accent/secondary) | `#B29955` | kit |
| Texto primario | `#222222` | kit |
| Negro profundo | `#1D1D1D` | kit |
| Texto cuerpo | `#575757` | kit |
| Blanco | `#FFFFFF` | kit |
Esquema general: blanco + dorado, footer oscuro.

## Línea base de rendimiento (home, descarga sin caché)
- HTML: **164 KB**, ~1.6 s hasta el HTML completo.
- **50 `<script>`**, **27 hojas CSS**, **72 `<img>`** (43 PNG, solo 9 WebP, solo 4 con `loading="lazy"`).
- ~57 referencias a `cdn.trustindex.io` (reseñas) + GTM + Facebook + TrustedSite + widget a11y externo.
- Causas probables de lentitud: Elementor Pro + Addons (CSS/JS por widget), PNG sin optimizar, widgets de terceros en la carga inicial, HTML inflado.
- Páginas de contenido pesan 114–178 KB de HTML cada una.

## Navegación actual (menú principal)
Menu · Austin (Group Dining, Menu List) · Leander (Group Dining, Menu List) · Takeout · Gift Cards · Holidays · Contact · Reservations (botón).
Pie: FAQ, Estância's News, Employee Application, Subscribe, Weekly Specials, Privacy.

Problemas de jerarquía:
- "Menu" y "Menu List" de cada local compiten; además hay páginas sueltas `brunch`, `bar`, `sides`, `salad-bar`, `dessert`, `prime-meat-steakhouse`, `coastal-collection`.
- Cada celebración es una página permanente (`easter`, `fathersday`, `christmas`, `new-years`, `thanksgiving`, `estancia-19anniversary`, `a-taste-of-fall`, `wine-dinner-caymus`, `martini-tasting-2`, `estancia-summer-special-tasting`…) → contenido vencido que sigue indexado.
- Duplicados: `martini-tasting-2`, post `what-makes-a-brazilian-steakhouse-different` y `-2`, `menu` vs `menu-list-*`, `holidays` vs `holidays-schedule`.
- Páginas técnicas expuestas: `group-dining-confirmed`, `events-calculator-leander`, `group-dining-calculator`, `google-reviews`, `estancia-ecard`.

## Servicios externos (se enlazan, no se migran)
| Función | Proveedor | Dónde |
|---|---|---|
| Reservas | **Resy** (un venue por local) | `/reserve-your-table/` |
| Pedido para llevar | **Toast** (Leander), DoorDash, Grubhub | `/takeout/` |
| Grupos / eventos privados | **Tripleseat** (formulario + portal de reservas directas) | `/group-dining*` |
| Gift cards | **SecureTree** (compra y consulta de saldo) | `/gift-card/` |
| Formularios | WPForms (contacto, empleo, subscribe) | varias |
| Reseñas | TrustIndex | home y otras |
| Redes | Instagram, TikTok, Facebook | pie |

Los **calculadores** de grupo (`group-dining-calculator`, `events-calculator-leander`) sí son lógica propia: revisar si se rehacen como isla pequeña.

## Inventario de URLs (sitemap Yoast del 2026-10-07)
- **43 páginas**, **62 posts**, 6 categorías (`churrasco`, `events`, `group-dining`, `happy-hour`, `news`, `uncategorised`), 1 autor. Lista completa en `docs/URL-MAP.md`.
- Los posts son SEO local de cola larga (Brazilian steakhouse Austin/Leander, "what is picanha", brunch, happy hour, business lunch…). Es un activo: se conserva.

## Pendiente por medir
- Lighthouse móvil y datos de campo (CrUX/PageSpeed) de home, `/menu/`, `/austin/`, un post. Se hace con `perf-auditor` (chrome-devtools MCP).
- Formularios: destino de los envíos (correo, CRM).
- Pixel de Facebook y GTM: qué eventos se usan de verdad.
