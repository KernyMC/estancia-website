---
paths: ["sanity/**", "studio/**", "src/lib/sanity/**", "sanity.config.*"]
---
# Sanity
- Antes de tocar esquemas: `list_sanity_rules` → `get_sanity_rules` (schema, groq) y `get_schema` del MCP.
- Consultas GROQ con `defineQuery` + TypeGen; proyecciones mínimas (solo campos usados); nunca `*[]` sin filtro de `_type`.
- Perspectiva `published` en el build de producción; `drafts` solo en preview.
- Token de lectura/escritura solo en servidor o en scripts de migración; nunca en el bundle de cliente.
- Cambios de esquema que renombran o borran campos: migrar datos primero. No borrar datasets ni importar sobre `production` sin OK explícito.
- Contenido temporal (`event`, `special`) se filtra por fecha en la consulta.
