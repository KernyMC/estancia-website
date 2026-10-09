# Cronograma de Migración — Galápagos & Beyond

Migración del sitio a nueva plataforma (Astro + Sanity CMS) con rediseño, reorganización de navegación y nuevos métodos de pago.

Horas estimadas por tarea = tiempo estándar de un desarrollador para ese alcance (referencia de mercado), no horas de reloj de la sesión de desarrollo asistido.

## Fase 0 — Preparación de entornos

| Tarea | Estado | Horas est. |
|---|---|---|
| Proyecto Astro (TypeScript, SSR, estructura de carpetas) | ✅ Hecho | 2 - 3 h |
| Sistema de diseño (tipografía, colores de marca, tokens CSS) | ✅ Hecho | 3 - 4 h |
| Cambio de gestor de paquetes a pnpm (seguridad de supply-chain) | ✅ Hecho | 0.5 h |
| Servidor / VPS contratado y Dokploy configurado | ⏳ Pendiente (depende de ti) | 2 - 3 h |
| Cuentas Stripe / PayPal Business activadas | ⏳ Pendiente (depende de ti) | — |

**Subtotal hecho: ~6 h | Pendiente: ~2-3 h + gestiones tuyas**

## Fase 1 — Migración de contenido al nuevo CMS

| Tarea | Estado | Horas est. |
|---|---|---|
| Extracción de datos reales de WordPress (8 barcos, 19 tours, stays) | ✅ Hecho | 4 - 5 h |
| Script de transformación y limpieza de datos (dedup, categorización) | ✅ Hecho | 3 - 4 h |
| Capa de acceso a datos (`lib/content.ts`) — lista para reemplazar por Sanity sin tocar páginas | ✅ Hecho | 2 - 3 h |
| Pipeline de fotos: nombres SEO + alt text con IA local | ✅ Validado, en ejecución (61/391 al momento de escribir esto) | 5 - 6 h |
| Compresión de imágenes a WebP &lt;200KB (herramienta propia) | ✅ Integrado y funcionando | incluido arriba |
| Procesar el resto del lote de fotos (330 restantes) + tu revisión de muestra | ⏳ En curso | 1 - 2 h |
| Definir schemas de Sanity (barco, tour, stay, review) | ⏳ Pendiente | 4 - 5 h |
| Subir contenido + fotos definitivas a Sanity | ⏳ Pendiente | 3 - 4 h |

**Subtotal hecho: ~15 h | Pendiente: ~8-11 h**

## Fase 2 — Maquetación / rediseño

| Tarea | Estado | Horas est. |
|---|---|---|
| Header con navegación por categorías + menú móvil | ✅ Hecho | 4 - 5 h |
| Footer con sitemap completo | ✅ Hecho | 1.5 h |
| Homepage (hero, cruceros destacados, tours, stays + reviews) | ✅ Hecho | 7 - 8 h |
| Hub de cruceros + filtro por clase | ✅ Hecho | 4 - 5 h |
| Página de detalle de crucero (galería, itinerario día a día, FAQ, relacionados) | ✅ Hecho | 9 - 10 h |
| Hub de tours + 3 categorías + detalle individual | ✅ Hecho | 6 - 7 h |
| Hub de stays + detalle | ✅ Hecho | 2 - 3 h |
| Página About (con contenido real, sin inventar historia) | ✅ Hecho | 1.5 h |
| Términos, Privacidad, Cookies + banner de consentimiento | ✅ Hecho | 3 - 4 h |
| Formulario de Contact + endpoint de inquiry | ✅ Hecho | 2.5 - 3 h |
| Guías de viaje / FAQ (contenido) | ⏳ Pendiente — se publica después del lanzamiento | (fuera de esta fase) |

**Subtotal hecho: ~41-46 h | Pendiente: 0 h (contenido de guías es post-launch)**

## Fase 3 — Disponibilidad en tiempo real

| Tarea | Estado | Horas est. |
|---|---|---|
| Caché de disponibilidad (10 min fresh / 24h stale, sin bloquear el render) | ✅ Hecho | 3 - 4 h |
| Endpoints `/api/availability` y `/api/cron/warm-availability` | ✅ Hecho | 2 h |
| Migrar el caché de memoria a Redis real (cuando haya VPS) | ⏳ Pendiente | 2 - 3 h |

**Subtotal hecho: ~5-6 h | Pendiente: ~2-3 h**

## Fase 4 — Pagos y reservas

| Tarea | Estado | Horas est. |
|---|---|---|
| Stripe Checkout + webhooks | ⏳ Pendiente | 10 - 12 h |
| PayPal SDK (PayPal + Venmo) | ⏳ Pendiente | 6 - 8 h |
| Base de datos de reservas (Postgres + Prisma) | ⏳ Pendiente | 6 - 8 h |
| Conectar formulario de inquiry a email real + base de datos | ⏳ Pendiente | 3 - 4 h |

**Pendiente: ~25-32 h**

## Fase 5 — QA, SEO y puesta en producción

| Tarea | Estado | Horas est. |
|---|---|---|
| Mapa de redirecciones 301 desde URLs de WordPress | ⏳ Pendiente | 3 - 4 h |
| Sitemap, schema.org (TravelAgency, Product/Offer, FAQPage) | ⏳ Pendiente | 3 - 4 h |
| Pruebas de compra reales de punta a punta | ⏳ Pendiente | 4 - 5 h |
| Core Web Vitals / performance final | ⏳ Pendiente | 2 - 3 h |
| Switch de DNS (cambio a producción) | ⏳ Pendiente | 1 h |

**Pendiente: ~13-17 h**

## Resumen

| | Horas |
|---|---|
| **Ya completado** | ~67-73 h |
| **Pendiente** | ~50-63 h |
| **Total del proyecto** | ~117-136 h |

A ritmo de desarrollo actual, esto equivale a **6.5 - 8.5 semanas** de calendario (el tiempo de reloj es mucho menor gracias a desarrollo asistido por IA, pero el alcance de trabajo entregado es el mismo que reportaría un desarrollador tradicional).

## Notas

- El sitio actual sigue funcionando y vendiendo con normalidad durante todo el desarrollo; el cambio se hace en un solo paso al final, ya probado.
- Tras el lanzamiento, el sitio anterior queda como respaldo 2-4 semanas antes de apagarse definitivamente.
- El contenido nuevo (guías de viaje, FAQ, comparativas) se publica después del lanzamiento de forma continua, no bloquea el lanzamiento.
- Los tiempos pueden variar según ajustes solicitados durante el proceso y disponibilidad de accesos/credenciales de los proveedores de pago (Stripe, PayPal) y del servidor.
