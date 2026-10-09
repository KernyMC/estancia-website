---
paths: ["src/**/*.astro", "src/**/*.css", "src/components/**", "src/layouts/**"]
---
# Astro / frontend
- Componentes `.astro` por defecto. Una isla (`client:visible` / `client:idle`) solo si hay interacción real; justifícala en un comentario de una línea.
- Estilos: tokens de `src/styles/tokens.css` (ver `docs/DESIGN-TOKENS.md`). Sin framework de UI, sin librería de animación; transiciones con CSS.
- HTML semántico (`header/nav/main/footer`), un `h1` por página, foco visible, contraste AA.
- Imágenes: componente de imagen del proyecto (`astro:assets` o Sanity CDN), siempre `alt`, `width`, `height`. La imagen LCP lleva `fetchpriority="high"` y nunca `loading="lazy"`.
- Enlaces a terceros (Resy, Toast, Tripleseat, SecureTree): `rel="noopener"`, URL leída de `location`/`siteSettings`, nunca escrita en el componente.
- Verifica con la skill `modern-web-guidance` antes de usar APIs CSS/JS nuevas.
