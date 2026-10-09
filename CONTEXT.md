# Glosario — Galápagos & Beyond

Glosario puro, sin detalles de implementación. Fuente de verdad para nombrar
las cosas igual en conversación, código y Sanity.

## Entidades de contenido

- **Ship** — un barco de crucero (Galaxy Sirius, Galaxy Diver II/III, etc.).
  Tiene specs propias (capacidad, eslora, crew), fotos, `apiShipId` para
  mapear con el API de disponibilidad. No incluye el itinerario — eso es un
  `Trip` separado.
- **Trip** — tipo unificado para *todo lo reservable*: day tour, tour
  multi-día en tierra, paquete todo-incluido, o itinerario de crucero. El
  campo `kind` determina cuál es:
  - `day-tour` — excursión de un día, sale y vuelve el mismo día.
  - `multi-day` — tour en tierra de varios días (puede referenciar un `Stay`).
  - `all-inclusive` — paquete todo-incluido (puede referenciar un `Stay`).
  - `cruise-itinerary` — la ruta A/B/C de un `Ship` específico (referencia
    obligatoria a `ship` + `apiItineraryCode` para casar con el API de
    disponibilidad). Es un documento separado, NO un campo embebido dentro
    de `Ship` — un mismo barco puede tener varios itinerarios.
  Un mismo `Trip` puede tener varios `Destination` (ej. combo Galápagos +
  Machu Picchu).
- **Stay** — alojamiento propio de la agencia (aparthotel Santa Cruz, condos
  Quito). Puede ser referenciado por un `Trip` de tipo `multi-day` o
  `all-inclusive` como el hotel de las noches en tierra.
- **Destination** — taxonomía de país/región (Galápagos, Perú...). Existe
  pensando en expansión futura — hoy casi todo es Galápagos, pero el modelo
  ya soporta agregar Perú sin re-arquitecturar.
- **Island** — sitio/isla visitada dentro de un `Trip` (ej. Bartolomé,
  Española). Es un resumen rápido para filtro — el detalle día a día vive en
  `itineraryDays` del propio `Trip`.
- **ActivityTag** — actividad transversal (snorkel, diving, hiking...). Tiene
  slug pensando en filtros de UI futuros y en que barcos/tours nuevos puedan
  traer actividades que hoy no existen.
- **Review** — reseña de huésped. `reviewType` distingue `agency` (reseña
  general de la marca, ej. TripAdvisor) de `stay` (reseña específica de un
  `Stay`, referenciada). No confundir con calificación de un `Trip` — hoy
  no hay reviews por tour/crucero, solo por agencia o por stay.

## Disponibilidad / pricing

- **API vendor** — el servicio externo (`galagentssystem.com`) que devuelve
  disponibilidad y precio real de los barcos Galaxy. Lento (~26s) y frágil —
  nunca se consulta en el camino de una request de usuario.
- **Fresh / stale** — dos copias en caché del resultado del API vendor: fresh
  (10 min TTL, se usa si existe) y stale (24h TTL, fallback si fresh expiró
  y el refresh en curso aún no responde). Nunca se sirve un precio que no
  venga de una de estas dos copias.
- **Warm-up / cron de disponibilidad** — el único proceso autorizado a llamar
  al API vendor en vivo; repuebla fresh+stale cada 10 min, solo en producción.

## Migración / pipeline de fotos

- **Manifest** — el registro (`migration/data/*.json`) de qué foto de WP ya
  fue procesada (renombrada, alt-text generado, subida a Sanity) — evita
  reprocesar en reruns.
- **Asset cache** (`asset-cache.mjs`) — mapa en memoria `{_id, originalFilename}`
  de todo lo ya subido a Sanity Media, consultado una sola vez por corrida de
  migración, para nunca resubir bytes de una foto que ya existe.
