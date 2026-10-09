---
paths: ["src/pages/**", "src/layouts/**", "astro.config.*", "docs/URL-MAP.md"]
---
# SEO
- Cada página: `<title>`, meta description, canonical absoluto, Open Graph, un `h1`.
- JSON-LD: `Restaurant` (por local, con horarios y `hasMenu`), `Menu`, `Event`, `Article`, `FAQPage`, `BreadcrumbList`.
- Todo cambio de ruta actualiza `docs/URL-MAP.md` y el redirect 301 correspondiente; los redirects se prueban URL por URL antes de lanzar.
- Páginas técnicas (gracias, confirmaciones) con `noindex`. Contenido vencido: archivar o `noindex`, no borrar sin 301.
- `sitemap` generado por el build; `robots.txt` apunta al dominio de producción (nunca a localhost/preview).
