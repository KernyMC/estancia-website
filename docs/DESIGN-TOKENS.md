# Tokens de diseño

Origen: kit global de Elementor de estancia.com (2026-10-07). Fuente de verdad para CSS custom properties (`src/styles/tokens.css`).

## Color
| Token | Valor | Uso |
|---|---|---|
| `--color-gold` | `#B29955` | Marca. Acentos, líneas, botones con texto oscuro, texto **grande** (≥ 24 px o 19 px bold) |
| `--color-gold-ink` | `#8A6F2E` | Dorado para **texto pequeño** sobre blanco (≈ 4.8:1, pasa AA). Valor calculado, validar con herramienta |
| `--color-ink` | `#222222` | Texto primario, títulos |
| `--color-black` | `#1D1D1D` | Fondos oscuros (footer, hero oscuro) |
| `--color-text` | `#575757` | Cuerpo (≈ 7:1 sobre blanco) |
| `--color-white` | `#FFFFFF` | Fondo base |

Contraste medido: `#B29955` sobre `#FFFFFF` ≈ 2.8:1 → **no usar para texto pequeño**. Sobre `#1D1D1D` ≈ 6.5:1 → sí pasa. Extender la paleta (tonos cálidos neutros, estado de error/éxito) solo con aprobación y registrando aquí.

## Tipografía
- Familia única: **Jost**. Pesos usados hoy: 400 (cuerpo), 500 (acento), 700 (títulos).
- Autoalojada (variable `wght` 400–700, subset `latin`), `font-display: swap`, preload de la fuente variable.
- Escala fluida con `clamp()`; cuerpo ≥ 16 px; interlineado 1.5–1.65.

## Espaciado y forma (a definir en Fase 2)
Escala de espaciado en `rem`, radios y sombras mínimos. El rediseño es nuevo: este archivo se completa con la maqueta aprobada.

## Qué NO conservar
Layouts, patrones de sección y widgets de Elementor; carruseles; iconos como fuentes.
