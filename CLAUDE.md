# Galápagos & Beyond — migración WP → Astro + Sanity

Router de contexto. Este archivo se carga entero cada sesión — mantenlo corto.
Detalle vive en `docs/` y en el `CLAUDE.md` de cada subcarpeta (`web/CLAUDE.md`
ya tiene las reglas de arquitectura del código Astro, no las dupliques aquí).

## Commits en github

Nunca hagas commits como tu como coautor lo haces como yo y me preguntas antes de hacer commit

## Worktrees

No crear un worktree por cada cambio. Trabaja directo sobre el checkout
principal (`main`) salvo que:

- esté por arrancar el flujo hacia producción, o
- yo te lo pida explícitamente.

Si el harness exige aislar la sesión en background para poder editar, usa un
worktree temporal solo como paso intermedio (entrar, editar/probar, copiar el
resultado de vuelta al checkout principal, salir y borrar el worktree) — no
lo dejes viviendo aparte.

## Dónde mirar

| Necesitas | Ve a |
|---|---|
| Qué está hecho / en progreso / pendiente | `docs/status.md` |
| Historial de decisiones y hallazgos por sesión | `docs/log.md` |
| Por qué se decidió algo (irreversible + no obvio) | `docs/adr/` |
| Glosario del dominio (trip, kind, ship, stay...) | `CONTEXT.md` |
| Reglas de arquitectura del código Astro | `web/CLAUDE.md` |
| Schemas de Sanity | `studio-galapagos-and-beyond-cms/schemaTypes/` |
| Pipeline de fotos (scripts, manifest, dedupe) | `migration/` |
| Desplegar staging/producción en Dokploy | `docs/deploy-staging.md` — quirks del CLI ya descubiertos, no re-derivar |
| Cronograma simple para gerencia — **no tocar sin permiso** | `cronograma-migracion.md` |

## Reglas duras (no negociables)

- **pnpm, nunca npm.** En todo el proyecto (web, studio, migration).
- **Disponibilidad/precio de barcos: solo lectura de caché durante render.**
  Nunca llamar en vivo al API del vendor (~26s) desde una página o request de
  usuario. Ver `docs/adr/` para el porqué.
- **No fabricar contenido.** Si un dato no existe en WP (specs de barco, fotos
  de un tour), se deja vacío/undefined — nunca se inventa.
- **Antes de migraciones batch a Sanity**: correr primero con un solo
  documento de prueba, confirmar con el usuario, luego batch completo.
- **Reutilizar assets ya subidos a Sanity Media** — nunca resubir una foto que
  ya existe solo para "buscarla" (ver `asset-cache.mjs` en el studio).
- **Cuenta de Cloudflare en plan Free — nunca activar nada pago.** El MCP de
  Cloudflare (`mcp__plugin_cloudflare_cloudflare__*`) expone tools genéricas
  (`execute`/`search`/`docs`), no llamadas acotadas por diseño — la
  disciplina de no tocar nada pago es responsabilidad de quien lo usa, no del
  tool. Con esa cuenta: **solo DNS** (leer/crear/editar/borrar registros).
  Nunca activar/contratar vía ese MCP ni por el dashboard: upgrade de plan de
  zona (Pro/Business/Enterprise), Workers pagos, Load Balancing, Argo, Bot
  Management, WAF/Rate Limiting pagos, Images, Stream, R2 fuera del free
  tier, Spectrum, certificados pagos, ni ninguna feature marcada de pago. Si
  una operación no es 100% claramente DNS de solo lectura o edición de
  registros, **preguntar antes de ejecutarla** — no asumir que "probablemente
  es gratis".

## Al terminar una sesión con trabajo relevante

Actualiza `docs/status.md` (si cambió el estado de algo) y agrega una entrada
breve en `docs/log.md` (fecha + qué se decidió/hizo + por qué, si no es obvio).
No hace falta para cambios triviales.


## Usar documentacion correcta con las tecnologias que trabajamos cuando lo requieras

Cuando haya que hacer alguna implementacion en astro revisa su documentacion con su mcp para tener siempre la mejorar calidad y no romper nada de codigo, aplica la misma regla para sanity si no sabes algo usa el mcp recuerda es prioridad para nosotros cachear la informacion cuando sea estatica para no gastarnos el plan gratuito

Para Dokploy (panel, CLI, deploy) igual: antes de asumir un comando o flag,
revisa `https://docs.dokploy.com/docs/core` (conceptos: apps, dominios,
databases, scheduled jobs) y `https://docs.dokploy.com/docs/cli` (comandos
del CLI). Pero primero mira `docs/deploy-staging.md` — ahí ya están anotados
los bugs reales del CLI 0.3.0 encontrados a mano (GETs con parámetros que dan
400, Git Bash rompiendo paths con `/`, flags "opcionales" que en realidad son
obligatorios, `mode: host` en el servicio de Dokploy que hace que `ufw` no
sirva para cerrar el puerto 3000). Repetir esa investigación cuesta tiempo
real; el doc existe para no tener que hacerlo dos veces.