---
paths: ["src/**", "astro.config.*", "public/**"]
---
# Rendimiento (presupuesto en CLAUDE.md, regla 2)
- Medir contra `pnpm build && pnpm preview` o el Preview de Vercel, nunca `pnpm dev`.
- JS de cliente en páginas de contenido < 50 KB; si una dependencia lo rompe, se descarta o se aísla en una isla.
- Fuente Jost autoalojada y con preload; sin Google Fonts remoto.
- Terceros (GTM, Pixel, reseñas): diferidos tras interacción o `idle`; las reseñas de Google se traen en build.
- Reporta antes/después con números (LCP, CLS, INP, peso total) al cerrar cualquier cambio de rendimiento.
