# Prompt: banner de Gift Cards

Destino del archivo: `public/img/w/giftcards-hero.jpg` (2400 × 1200 px, horizontal 2:1, JPG calidad 85). Después cambiar `HERO` en `src/pages/gift-cards.astro` a `/img/w/giftcards-hero.jpg`.

El hero superpone un degradado oscuro de abajo hacia arriba y el título a la izquierda, así que **la mitad izquierda e inferior debe quedar oscura y despejada**; el interés visual va a la derecha.

## Prompt principal (para Midjourney / GPT Image / Firefly / Flux)

```
Cinematic luxury still life for a high-end Brazilian steakhouse gift card campaign.
On a dark polished black marble surface with fine gold veining, a small fan of three
elegant gift cards in deep navy and charcoal marble with gold foil lettering, slightly
overlapping, softly angled, one lifted toward the camera. Beside them, a handmade
gold satin ribbon bow and a single wax-sealed envelope. In the soft background, out of
focus, the warm glow of a churrasco fire grill with glowing embers and the silhouette
of a skewer of prime picanha, bokeh golden lights. Warm candlelight rim lighting,
subtle gold dust particles floating in the air, shallow depth of field, 85mm lens,
f/1.8, rich blacks, color palette: deep black #1D1D1D, antique gold #B29955, warm
amber, hint of emerald green. Composition: subject cluster on the right third, large
empty dark space on the left half and lower third for text overlay. Editorial,
photorealistic, premium, moody, no text, no logos, no watermark, no people.
--ar 2:1 --style raw
```

## Prompt negativo (si la herramienta lo permite)

```
text, letters, words, logo, watermark, people, hands, faces, cartoon, illustration,
oversaturated, neon, plastic look, cluttered background, low resolution, distorted cards
```

## Variantes

- **Más elegante / minimal:** quitar el fuego y dejar solo las tarjetas, el moño dorado y el mármol negro, con una única luz lateral cálida.
- **Navideña (temporada):** añadir luces bokeh cálidas, ramas de pino oscuras y un detalle de listón verde esmeralda.
- **Con carne:** una tabla de madera oscura con picanha y sal gruesa desenfocada al fondo, las tarjetas al frente.

## Cómo usarlo con tus tarjetas reales

Mejor aún: genera solo el **fondo** (sin tarjetas) y compón `card25/100/150.jpg` encima en Canva/Photoshop con sombra suave. Así las tarjetas reflejan el diseño real y no una versión inventada por la IA. Pide al generador: *"empty dark marble table with gold veining, warm fire glow bokeh in background, space on the left, no objects"*.
