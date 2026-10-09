# 0002 — VPS + Dokploy en vez de hosting serverless

**Fecha**: 2026-07-12
**Estado**: Aceptado

## Contexto

Frontend nuevo en Astro. La opción "obvia" para un sitio Astro moderno es
desplegarlo en una plataforma serverless (Vercel u equivalente).

## Decisión

VPS único con Dokploy (deploys por git push, SSL automático, contenedores),
detrás de Cloudflare como CDN/proxy gratuito.

## Por qué (trade-off real)

- **Vercel Hobby (gratis) prohíbe uso comercial** — este sitio vende viajes,
  es comercial por definición. El plan Pro ($20/mes) cuesta aproximadamente
  lo mismo que el VPS completo, así que no hay ahorro real en ir serverless.
- **El API de disponibilidad del vendor (Galaxy) tarda ~26 segundos.** El
  cron que refresca la caché (fresh/stale, ver `CONTEXT.md`) no puede correr
  bajo un límite de timeout serverless típico. En un VPS el cron no tiene
  ese límite.
- **Redis y Postgres locales al VPS evitan el problema de connection
  pooling** que aparece con Postgres serverless + funciones efímeras.
- **Alternativa descartada**: serverless + Postgres/Redis gestionados
  (ej. Upstash, Neon). Más simple operacionalmente (cero mantenimiento de
  servidor), pero no resuelve el límite de timeout del cron ni el costo, y
  agrega otro proveedor más a la cuenta mensual.

## Consecuencia

El usuario mantiene el VPS (backups, updates de SO, monitoreo vía
UptimeRobot). A cambio, el cron de disponibilidad y los servicios locales
(Redis/Postgres) no tienen restricciones de tiempo de ejecución.
