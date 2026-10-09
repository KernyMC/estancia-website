# Pendientes por confirmar con el cliente: feriados 2026

Fuente: auditoría del agente `uiux-seo-expert` (2026-10-08) sobre estancia.com/holidays, holidays-schedule, thanksgiving, christmas, new-years, easter y fathersday. Los datos viven en `src/data/holidays.ts`. **Nada de esto debe publicarse como definitivo hasta que el cliente lo valide.**

## Correcciones de calendario ya aplicadas (el original traía días de otros años)
| Original | Ahora |
|---|---|
| Cyber Monday «Monday, December 30th» | **Lunes 30 de noviembre de 2026** |
| Thanksgiving takeout «Thursday, November 26th, 2025» | Jueves 26 de noviembre de 2026 |
| Christmas pickup «Tuesday, December 24th / Wednesday, December 25th» | Jueves 24 y viernes 25 de diciembre |
| Links de Resy con `date=` de 2025 | Enlace base de Resy sin fecha |
| «June 21th» | June 21st |

## A confirmar (decide el cliente)
1. **Vigencia de la tarjeta cortesía:** las páginas dicen «Jan 4 – Mar 25, 2027» (holidays, christmas, new-years) y «Jan 5 – Mar 26, 2026» (thanksgiving, bono de gift cards, textos viejos). Se usó **4 de enero – 25 de marzo de 2027** en todas.
2. **Día de continuación de New Year's** («Thursday, January 2nd», brunch $45, cena $63, salad bar $35): el 2 de enero de 2027 es **sábado** y los precios vienen de una plantilla de 2024. **No se publicó.** ¿Existe en 2027?
3. **Salad bar $35 vs. $36** en esa cena de continuación: probable typo; se usa $36.
4. **Cena de New Year's Eve:** la tabla de `holidays-schedule` dice 6:00 – 10:30 pm y la página de New Year's dice 6:00 – 11:00 pm. Se usó **11:00 pm** (más reciente).
5. **Recompensa de grupos:** `/holidays/` da $25 a **cada invitado**; las páginas de Christmas y New Year's lo limitan a cenas. Se usó la versión de `/holidays/`.
6. **Horarios de pickup de New Year's takeout:** el original dice «Dec 31 – Friday, Jan 2nd» (inconsistente) y no da horas. Se muestra «por confirmar, llamar al local».
7. **Resy con `date=2026-12-28`** en `/holidays/`: no se sabe a qué evento corresponde; no se usó.
8. **Easter y Father's Day** (2026, ya pasaron): se conservan como páginas «ended» en 200. En marzo y mayo de 2027, reactivarlas con datos nuevos.
9. **Texto SEO de Thanksgiving** («Why choose Estância…»): no se copió; el cliente puede aportar redacción propia.
10. **Política de privacidad:** el original es la plantilla por defecto de WordPress (comentarios, Gravatar). Se redactó un borrador adaptado; **requiere revisión legal** y sigue `noindex`.
11. **Calculador de grupos:** el original mostraba un precio estimado por persona y no tenemos las tarifas. El formulario de `/private-dining/` recoge los mismos campos (horario, flexibilidad, tipo, sala privada, paquete) y avisa que el equipo envía la cotización con impuestos 8.25 %, propina 20 % y cargo admin 3 %.

## Hecho en esta pasada
- `/holidays/` hub propio, y `/thanksgiving/`, `/christmas/`, `/new-years/` con **horarios, precios, niños, takeout, tarjeta cortesía y Black Friday / Cyber Monday**; `/easter/` y `/fathersday/` archivadas.
- Eliminados los 301 de esas URLs (conservan su ranking estacional). `/holidays-schedule/` → `/holidays/`.
- JSON-LD `Event` (con ofertas), `FAQPage`, `BreadcrumbList` y `ItemList`.
- Menús reales con precios en `/austin/menu/` y `/leander/menu/` (imágenes + PDFs descargables); paquetes de eventos (PDF) en el hub.
- Boletos de DAOU Tasting (Tripleseat) en el evento; formulario de empleo completo; Coastal Collection en `/specials/`.
