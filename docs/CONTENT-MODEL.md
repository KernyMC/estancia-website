# Modelo de contenido (Sanity) — borrador

Principios: contenido separado de presentación; datos de negocio una sola vez; lo temporal lleva vigencia. Usa las skills `content-modeling-best-practices` y `sanity-best-practices` antes de implementar.

| Tipo | Campos clave | Notas |
|---|---|---|
| `siteSettings` (singleton) | nombre, logo, redes, GTM/Pixel IDs, textos de pie, SEO por defecto | |
| `location` (×2) | nombre, slug, dirección, geo, teléfono, horarios (por día y excepciones), URLs: Resy, Toast, DoorDash, Grubhub, Tripleseat; imágenes; estacionamiento; amenities (patio, bar) | Alimenta JSON-LD `Restaurant` |
| `menu` | título, slug, local(es), secciones[] | Dinner, Brunch, Bar, Salad Bar, Sides, Dessert |
| `menuSection` / `menuItem` | nombre, descripción, precio, dietas/alérgenos, imagen opcional | Precios por local si difieren |
| `event` | título, slug, local(es), inicio/fin, descripción, imagen, CTA | Reemplaza easter, christmas, wine-dinner, etc. Oculto tras `fin` |
| `special` | título, vigencia, local(es), días | Weekly Specials, Monday special |
| `page` | título, slug, secciones[] (hero, texto, galería, CTA, FAQ, mapa) | Pocas páginas |
| `post` | título, slug, fecha, autor, categorías, cuerpo (Portable Text), imagen, SEO | ~62 a importar |
| `category`, `author` | | |
| `faqItem` | pregunta, respuesta, local(es), grupo | Alimenta JSON-LD `FAQPage` |
| `redirect` | origen, destino, permanente | Opcional; la fuente primaria es `URL-MAP.md` |

Reglas: sin HTML en campos de texto; imágenes con `alt` obligatorio; todo documento público con campos SEO (título, descripción, imagen OG) y `noindex` opcional.
