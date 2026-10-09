# Pendientes legales, formularios y QA (auditoría `uiux-seo-expert`, 2026-10-08)

Orientación práctica, **no asesoría legal**. Todo lo marcado «verificar» debe confirmarlo el abogado del cliente. Los textos viven en `src/data/legal.ts`.

## Hecho
- `/terms/` y `/accessibility/` creadas (borradores; `/terms/` y `/privacy/` con `noindex` hasta aprobar). Footer con Privacy · Terms · Accessibility · Your Privacy Choices.
- Formularios: aviso de aceptación de Terms/Privacy en consultas de eventos + casilla de marketing **opcional y sin marcar**; lista VIP con aviso de opt-in, cumpleaños solo **mes y día** y mayoría de 13 años; empleo con declaración EEO, at-will y aviso de uso de datos, sin la pregunta de condenas penales ni la autorización de antecedentes (FCRA exige un aviso separado), y con `name` en todos los campos.
- Privacidad: sin «no vendemos» sin matices (menciona cookies de publicidad y Meta Pixel), sección «Your Privacy Choices» con señal GPC, Turnstile, cumpleaños.
- Enlace «Skip to content» visible al enfocar. (El botón «Pause animations» se quitó por decisión del cliente; el sitio sigue respetando `prefers-reduced-motion`. Riesgo WCAG 2.2.2 por el video y las marquesinas: se asume.)
- SEO/JSON-LD: se quitó el `aggregateRating` hecho a mano; horarios de `Restaurant` generados desde `hoursSpec`; `hasMenu` por local; `og:url`, `og:site_name`, `twitter:card`, `og:type=article` en noticias; `robots.txt`; sitemap sin páginas `noindex`; descripciones ≤155 y títulos sin sufijo cuando son largos; eventos con aviso «ended» y fechas de corte tomadas de la fecha del build.

## Datos que debe dar el cliente
1. **Correo de privacidad/legal** (hoy se usa `events.austin@estancia.com`).
2. **Plazo de retención** de solicitudes de empleo y de consultas de eventos.
3. **Facturación y volumen de datos** para saber si aplican TDPSA (Texas) o CCPA (California). Con ingresos bajos probablemente no.
4. **Condado para el fuero** en `/terms/` (Travis o Williamson).
5. Confirmar que las gift cards **«never expire»** y los términos exactos de SecureTree.
6. Proveedor de **email marketing** (para nombrarlo en la política y asegurar baja en 10 días hábiles, dirección postal en cada correo: CAN-SPAM).

## Preguntas para el abogado
- ¿La ordenanza «Fair Chance Hiring» de Austin sigue vigente tras HB 2127? (Mientras tanto la pregunta de condenas **no está** en el formulario.)
- Aviso FCRA separado si se hacen verificaciones de antecedentes.
- ¿Basta con el aviso de «Your Privacy Choices» o se necesita banner? (No hay rastreadores todavía.)
- Texto final de `/privacy/`, `/terms/` y `/accessibility/` y quitar `noindex` al aprobarlos.

## Antes de lanzar (técnico)
- **Cloudflare Turnstile** verificado en el servidor en los tres formularios, además del honeypot.
- **GTM y Meta Pixel diferidos**; no cargar si `navigator.globalPrivacyControl` está activo; nunca enviar datos de formularios al Pixel. Crear `src/scripts/consent.ts` cuando existan los IDs.
- **Endpoint de formularios** (VPS): validación, límite de tamaño y tipo del currículum, correo cifrado o sistema de selección (ATS) para empleo, **nada en Sanity ni en logs**.
- Quitar los avisos «Demo build: nothing was sent» de los tres formularios.
- Decidir un solo camino para grupos (Tripleseat **o** el formulario propio; hoy conviven).

## QA pendiente (P1/P2 del informe, no hechos aún)
- **Menús accesibles:** hoy son imágenes con alt corto; crear versión en HTML (texto indexable y legible por lectores de pantalla) o PDF etiquetado.
- **Datos de negocio fuera de componentes** (regla 6): bono de gift cards, premios de grupos, aforos, «22K+», notas de horario de menús → `site.ts`/`holidays.ts`/`content.ts`.
- `JobPosting` genérico en `/careers/`: quitar o crear uno por puesto real con fecha, dirección y salario.
- Pasar imágenes por `astro:assets` (width/height, CLS) y el drawer del menú: `inert` en `main` mientras está abierto.
- Reseñas «Posted on Google» copiadas a mano: traerlas en build o quitar la atribución.
- Encabezados: `events/index.astro` salta de h1 a h3; `HolidayPage` usa h4 sin h3 padre.
