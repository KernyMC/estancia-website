# Estado

**Última actualización:** 2026-10-08 · **Fase:** demo local completa (sitio Astro con las rutas acordadas). Pendiente: revisión del cliente, Sanity, optimización de peso y despliegue en el VPS.

## Hecho
- Sitio completo en Astro 7 estático: **108 páginas** (home, menú ×7, Austin/Leander ×3 cada una + bar & patio, locations, reserve, order, private dining, events ×7, specials, gift cards, news ×(1+5 temas+68 posts), FAQ, contact, careers, subscribe, privacy, 404) y **111 redirects 301** desde las URLs de WP (`docs/URL-MAP.md`).
- Diseño nuevo conservando Jost, dorado `#B29955` y negro. Navbar que se oculta al bajar y reaparece al subir (o al llevar el mouse arriba); hero con Ken Burns, titulares por palabra, máscaras de imagen con parallax, scroll horizontal de cortes, moneda verde/roja interactiva, marquesinas, contadores, selector de local, indicador «Open now» (hora de Texas), cursor luminoso, drawer móvil. Todo con CSS + ~6 KB de TS propio.
- Contenido real extraído de estancia.com: textos, horarios, teléfonos, enlaces a Resy/Toast/DoorDash/Uber Eats/Grubhub/Tripleseat/SecureTree, FAQ, reseñas, 68 posts con sus imágenes.
- Verificado: build sin errores, `astro check` 0 errores, 0 enlaces o imágenes rotas en `dist/`, sin errores de consola, navbar y transiciones probadas con puppeteer (`scripts/behavior.mjs`), capturas de escritorio y móvil.
- Página de gift cards con tarjetas 3D (tilt, foil, abanico) y sección «Green means go» con tarjeta roja/verde que voltea y pasos que se iluminan (`flow.css`, `gift.css`). Memoria del proyecto (ADR-007) y skills `scroll-world` y `gsap-*` instaladas (no usadas todavía).

## En curso
- Nada a medias. Revisión legal/UX con `uiux-seo-expert` aplicada: ver `docs/PENDIENTES-LEGAL.md` (datos que debe dar el cliente y pendientes de lanzamiento). Auditoría de feriados completada (ADR-011): hub `/holidays/` y páginas de Thanksgiving, Christmas y New Year's con datos reales; pendientes por confirmar en `docs/PENDIENTES-HOLIDAYS.md`.

## Siguiente
1. Revisión del cliente en local (`pnpm dev`, puerto 4321 o `--port`). Ajustar copy, imágenes y orden.
2. Medir con Lighthouse/CrUX y bajar peso: imágenes a AVIF/WebP responsivas, `astro:assets`, preload de Jost; reemplazar los 8 posts sin imagen.
3. Crear proyecto Sanity, modelar según `docs/CONTENT-MODEL.md` e importar `src/data/*` + posts; webhook de rebuild (ADR-008).
4. Servidor del VPS: Caddy/nginx con los 301 reales, staging, y plan de DNS sin tocar correo (ADR-009).

## Bloqueos
- Decisiones del cliente: Sucuri vs Cloudflare delante del VPS; quién tiene la cuenta de GoDaddy; datos del VPS (SO, SSH, ¿Dokploy?).
- Precios y menús à la carte no públicos (no se inventaron; se invita a llamar). Austin no tiene imagen de menú à la carte.

## Problemas conocidos
- Peso de imágenes (54 MB en `public/img/w`) y 640 MB de originales en `assets-src/`: solo para demo.
- Formularios son demo (no envían). La política de privacidad es un placeholder `noindex`.
- 8 de 68 posts no tienen imagen destacada (fallback genérico); fallaron 8 descargas por el WAF Sucuri.
- Páginas de evento vencidas (Easter, Father's Day, etc.) redirigen a `/events/`; ver "Pendiente" en `docs/URL-MAP.md`.
- `astro check` exige TypeScript 6 (TS 7 no soportado todavía).

## Notas para la próxima sesión
- Puerto 4321 puede estar ocupado por otro proyecto: errores de Vite de otros sitios llegan por HMR a todas las pestañas. Usa `pnpm exec astro dev --port 4327`.
- Capturas: `node scripts/shot.mjs /ruta prefijo 1440 900` (requiere el dev server en 4327 y Chrome); con Git Bash anteponer `MSYS_NO_PATHCONV=1`.
- `pnpm-workspace.yaml` permite el postinstall de esbuild (pnpm 11).
- Regenerar posts: `node scripts/build-posts.mjs <posts.json> <cats.json>`; regenerar mapa: `node scripts/gen-url-map.mjs`.
- No hay git ni commits aún. No subir `assets-src/`.
