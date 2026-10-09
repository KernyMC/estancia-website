---
name: wrap-up
description: >-
  Cierra la sesión de trabajo actualizando la memoria del proyecto: reescribe docs/STATUS.md como tablero corto, registra los ADR nuevos en docs/DECISIONS.md y mantiene al día URL-MAP y el modelo de contenido, para que la próxima sesión sepa dónde quedó todo sin leer el código. Úsalo con /wrap-up, "cerremos", "terminamos por hoy" o cuando el usuario pida guardar el progreso.
---

# Cerrar la sesión

Hazlo en este orden. No hagas commit ni push: pregunta antes de commitear cualquier cosa que no esté en el plan aprobado.

1. **Qué cambió.** Si hay git: `git status`, `git diff --stat`, `git log --oneline -15`. Siempre repasa la conversación.

2. **Reescribe `docs/STATUS.md`** (reemplaza, no lo alargues; máximo ~60 líneas). Secciones: encabezado (fecha y fase), **Hecho**, **En curso** (archivo y punto exacto), **Siguiente** (3 pasos concretos), **Bloqueos**, **Problemas conocidos** (apunta a documentos, no copies), **Notas para la próxima sesión**.

3. **ADR.** Si se tomó una decisión de arquitectura, añade un ADR al final de `docs/DECISIONS.md` con el siguiente número libre. Nunca borres ADRs: márcalos «Reemplazada por ADR-XXX» o «ampliada por ADR-XXX». Pasa de «Propuesta» a «Aceptada» solo con OK del cliente.

4. **Documentos vivos.** Si cambió el esquema de Sanity → `docs/CONTENT-MODEL.md`. Si cambió una ruta → `docs/URL-MAP.md` y su redirect. Si cambiaron tokens → `docs/DESIGN-TOKENS.md`. Si cambió el rendimiento medido → anótalo en `docs/SITE-AUDIT.md` (antes/después).

5. **Reglas.** Si descubriste una regla que Claude debe seguir siempre, propónla al usuario para `CLAUDE.md` o `.claude/rules/` en vez de escribirla directo.

6. **Consistencia antes de cerrar.**
   - `CLAUDE.md` sigue por debajo de 150 líneas y cada agente de `.claude/agents/` tiene su fila en la tabla de ruteo.
   - Ningún documento contiene secretos, tokens ni datos personales (el repo puede ser público).
   - Si tocaste archivos con acentos, comprueba que no quedaron caracteres rotos (`Ã`, `â€`).

7. **Resumen al usuario**: 5 líneas. Pregunta si quiere commit.
