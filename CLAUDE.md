# Estância Website

Rediseño y migración del sitio de **Estância Brazilian Steakhouse** (churrascaria, Austin y Leander, TX) de WordPress + Elementor a **Astro + Sanity**, más rápido y con otra UI. Sitio actual: https://estancia.com. Se conservan tipografía (Jost), paleta y marca; cambia el diseño y la jerarquía de navegación.

## Estado
- Estado y bloqueos: `docs/STATUS.md` · Decisiones: `docs/DECISIONS.md` · Auditoría del sitio actual: `docs/SITE-AUDIT.md` · Ruta: `docs/MIGRATION-PLAN.md`.
- Fase actual: **demo local completa** (108 páginas, 111 redirects; ADR-010). Falta revisión del cliente, Sanity, optimización de peso y VPS.

## Stack (propuesto, ver ADRs)
Astro 5 (SSG por defecto, SSR/ISR solo donde haga falta) · Sanity (Studio + GROQ + TypeGen) · TypeScript strict · pnpm · **VPS** (Caddy/nginx sirviendo estático; ADR-003) · CSS propio con tokens (sin framework de UI pesado) · islas de JS solo donde sea imprescindible.

## Comandos
- `pnpm dev` (usa `pnpm exec astro dev --port 4327` si el 4321 está ocupado) · `pnpm build` · `pnpm exec astro check` (requiere TypeScript 6)
- Sanity: `pnpm sanity dev` (Studio) · `pnpm sanity typegen generate` · `pnpm sanity schema deploy`
- Rendimiento: Lighthouse contra el build de preview, no contra `dev`.

## A quién delegar (tabla de ruteo)
Los agentes de `.claude/agents/` son la forma normal de trabajar: delégales con la herramienta Agent (su nombre es el `subagent_type`).

| Tema | Agente | Lee antes |
|---|---|---|
| Plan antes de un cambio grande (más de 3 archivos, esquema Sanity, rutas, dependencias nuevas) | `architect` | `docs/DECISIONS.md` |
| Páginas, layouts, componentes Astro, islas, UI | `astro-expert` | `.claude/rules/astro-frontend.md`, `docs/DESIGN-TOKENS.md` |
| Esquemas Sanity, GROQ, Studio, modelado de contenido | `sanity-modeler` | `.claude/rules/sanity.md`, `docs/CONTENT-MODEL.md` |
| Extraer contenido de WordPress, redirects, mapa de URLs, importación a Sanity | `content-migrator` | `docs/MIGRATION-PLAN.md`, `docs/URL-MAP.md` |
| Velocidad: LCP/INP/CLS, imágenes, fuentes, JS, caché | `perf-auditor` | `.claude/rules/performance.md` |
| SEO: metadatos, canonical, JSON-LD (Restaurant, Menu, Event), sitemap, redirects 301 | `seo-auditor` (solo lectura) | `.claude/rules/seo.md` |
| Verificar responsive y UX: desbordes, carruseles, menú móvil, formularios, animaciones, imágenes, consola, táctil (`node scripts/qa.mjs --quick`) | `qa-responsive` (corre scripts, mira capturas) | `.claude/agents/qa-responsive.md` |
| Auditar una página original vs. la nueva (contenido faltante, jerarquía UX, SEO, JSON-LD, redirects) | `uiux-seo-expert` (solo lectura; se carga al reiniciar Claude Code) | `docs/PENDIENTES-HOLIDAYS.md` |
| Revisión de diff antes de commit | `code-reviewer` (siempre) + `seo-auditor` (si toca rutas públicas) | — |

Cierre de sesión: `/wrap-up` (actualiza `docs/STATUS.md`).

## Cómo trabajar en cada sesión
1. Lee `docs/STATUS.md`. 2. Elige agente con la tabla. 3. Antes de dar algo por terminado: `pnpm astro check`, `pnpm lint`, `pnpm build`. 4. Revisión (`code-reviewer`). 5. Al cerrar, `/wrap-up`.

## Skills útiles (verifica contra docs actuales; Astro y Sanity cambian rápido)
- **Astro:** `astro-best-practices`, `create-component`, `content-collection`, `migrate`, `docs-lookup`, `add-integration`
- **Sanity:** `sanity-best-practices`, `content-modeling-best-practices` y las reglas del MCP (`list_sanity_rules` → `get_sanity_rules`)
- **Interactividad:** `scroll-world` (instalada de `oso95/scroll-world`, commit `71cc36d`, 2026-07-28). Ver límites abajo.
- **Animación:** `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-utils`, `gsap-performance` (+ `gsap-react`/`gsap-frameworks`, que aquí no aplican: Astro no usa React por defecto). Oficiales de `greensock/gsap-skills`, commit `aed9cfd`, 2026-04-21. Ver presupuesto abajo.
- **SEO/GEO:** `seo-technical`, `seo-schema`, `seo-images`, `geo-audit` · **Web moderna:** `modern-web-guidance` · **Vercel:** `vercel:deploy`, `vercel:verification`

## Modelo mental
- Un **restaurante, dos locales** (`location`: Austin, Leander). Casi todo cuelga de un local: menú, horarios, reservas, eventos privados.
- Los **servicios transaccionales son externos y se enlazan, no se reimplementan:** Resy (reservas), Toast/DoorDash/Grubhub (pedidos), Tripleseat (grupos), SecureTree (gift cards). Ver `docs/SITE-AUDIT.md`.
- Contenido **evergreen** (menú, locales, FAQ) ≠ contenido **temporal** (feriados, cenas de vino, especiales): son documentos distintos en Sanity, con fechas de vigencia, para que lo vencido se oculte solo.
- El blog actual (~62 artículos) es SEO local y debe conservar su valor: cada URL vieja necesita 301 o ruta equivalente.
- UI y copy públicos en **inglés** (público de Texas); docs, comentarios de proceso y chat en español.

## Reglas de oro
1. **Cero pérdida de SEO:** ninguna URL actual de `docs/URL-MAP.md` se elimina sin 301 a su reemplazo. Se verifica antes de cada release.
2. **Presupuesto de rendimiento:** LCP < 2.0 s en móvil 4G, CLS < 0.05, JS de cliente < 50 KB en páginas de contenido. Sin carrusel ni librería de animación que lo rompa.
3. Fuente única: **Jost** (400/500/700), autoalojada, `font-display: swap`, subset latino. Colores solo desde `docs/DESIGN-TOKENS.md`.
4. Imágenes siempre por el pipeline (`astro:assets` o Sanity image CDN con `auto=format`), con `width/height`, `loading` y `fetchpriority` correctos. Nada de PNG a tamaño completo.
5. Terceros (reseñas, pixel, analytics) se cargan diferidos o se reemplazan por datos en build. Las reseñas de Google se traen en build, no con widget en vivo.
6. Datos de negocio (horas, teléfonos, direcciones) viven **solo** en Sanity (`location`/`siteSettings`), nunca duplicados en componentes.
7. Secretos solo en `.env` / variables de Vercel; nunca en código, logs ni chat; no leer ni editar `.env*`. El token de Sanity de escritura nunca va al cliente.
8. Decisiones de arquitectura se registran en `docs/DECISIONS.md`.
9. Todo diff pasa por `code-reviewer` antes de commit. No hagas commit ni push sin que el usuario lo pida. Nada a producción ni al DNS de `estancia.com` sin OK del cliente.
10. Accesibilidad: contraste AA (el dorado `#B29955` sobre blanco NO pasa para texto pequeño; ver tokens), foco visible, navegación por teclado.

## Presupuesto de GSAP (regla 2)
- GSAP core ≈ 27 KB gzip y ScrollTrigger ≈ 12 KB: **juntos comen casi todo el presupuesto de 50 KB.** Por eso: GSAP solo en islas/páginas que lo necesiten (home, recorrido), importado con `import()` dinámico tras `idle`/visibilidad, y solo los plugins usados (sin importar el paquete completo).
- Primero CSS: `animation-timeline: scroll()/view()`, `@starting-style` y View Transitions cubren revelados y parallax simples sin JS (verifica con `modern-web-guidance`). GSAP solo para lo que CSS no puede (pin, scrub complejo, timelines).
- Animar solo `transform`/`opacity`; respetar `prefers-reduced-motion`; cero animación que mueva el LCP o genere CLS.

## Límites de `scroll-world` (chocan con las reglas 2 y 5)
- Genera videos pre-renderizados que se "escrubean" con el scroll: pesan MBs. **Solo** para una sección (hero o recorrido «de la brasa a la mesa»), nunca en todo el sitio.
- Cargar el video de forma diferida (tras LCP), con póster WebP como LCP; en móvil, la versión vertical o un póster estático; respeta `prefers-reduced-motion` (sin video) y `Save-Data`.
- Medir antes y después con `perf-auditor`. Si rompe el presupuesto (LCP < 2.0 s, JS < 50 KB), se descarta o se reduce.
- **Cuesta dinero** (Monid/Higgsfield, ~27 USD por cadena de 6 escenas, según su README) y exige CLIs externas. Nunca generar sin presupuesto aprobado por el usuario.
- Los `.mp4`/`.webp` generados se sirven desde el VPS; no se suben a Sanity. Los archivos descargados por la skill no incluyen llaves: las del CLI se quedan fuera del repo.

## Formularios y legal (ver `docs/PENDIENTES-LEGAL.md`)
- Todo formulario usa `FormConsent` (textos en `src/data/legal.ts`), honeypot y, en producción, Turnstile. Marketing por correo solo con aviso/casilla opcional sin marcar.
- Cumpleaños: solo mes y día (`BirthdayField`). No preguntar antecedentes penales en la solicitud de empleo. Datos de candidatos jamás en Sanity ni en logs.
- No cargar GTM/Meta Pixel sin respetar `navigator.globalPrivacyControl`. Páginas legales siguen `noindex` hasta aprobación del abogado.

## Conocido
- El sitio actual responde con errores de red intermitentes desde scripts (`curl` exit 6): usa reintentos (`--retry 5 --retry-all-errors`).
- El repo puede ser público: no pongas llaves, tokens ni datos de empleados (hay formulario de empleo).
