# 0001 — Un solo tipo `trip` unificado, no tipos separados por categoría

**Fecha**: 2026-07-16
**Estado**: Aceptado

## Contexto

Había que modelar en Sanity: day tours, tours multi-día en tierra, paquetes
todo-incluido, e itinerarios de crucero (A/B/C por barco). La alternativa
obvia era un tipo de documento por categoría (`dayTour`, `multiDayTour`,
`cruiseItinerary`...), como hace WP con post types separados.

## Decisión

Un solo tipo `trip` con campo `kind` como discriminador
(`day-tour`/`multi-day`/`all-inclusive`/`cruise-itinerary`), y campos
específicos de cada kind ocultos condicionalmente vía `hidden` callback.
`ship` y `stay` se referencian, nunca se copian.

## Por qué (trade-off real)

- **A favor de unificar**: una sola query GROQ puede traer/filtrar/buscar
  sobre *todo* lo reservable a la vez (necesario para el buscador que el
  usuario quiere en producción). Evita repetir el mismo schema 4 veces.
  Prepara el terreno para expansión a Perú (nuevo `destination`, no nuevo
  tipo de documento).
- **En contra de unificar**: el schema de un solo tipo es más grande y con
  más campos condicionales que leer, y el Studio muestra campos ocultos
  en el JSON aunque no se vean en el form.
- **Alternativa descartada**: tipos separados por categoría. Más simple de
  leer un tipo a la vez, pero obliga a fusionar 4 queries distintas para
  cualquier vista cruzada (home, buscador, sitemap) y duplica el 80% de los
  campos comunes (precio, galería, FAQ, highlights).

## Consecuencia

Difícil de revertir sin migrar documentos existentes (20 cruise-itinerary +
19 tours ya creados bajo este modelo). Cualquier campo nuevo común a todos
los kinds se agrega una vez en `trip`; cualquier campo específico de un kind
nuevo se agrega con su propio `hidden` callback.
