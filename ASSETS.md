# Recursos generados

Modo utilizado: herramienta integrada de generación de imágenes (`imagegen`). Las fotografías aportadas se utilizaron únicamente como referencias de personaje, vestido y entorno.

## Hoja de animación de la protagonista

Prompt final:

> Convert the generated heroine sprite atlas into a production 2D game spritesheet: remove the dark gradient background and all row labels; place every existing sprite frame on a genuinely transparent background in a clean regular grid with equal-size cells and ample gutters. Preserve the exact heroine design, face, braid, red flower, black-and-red dress, red fan, pixel-art palette, animation poses, and hard pixel edges; do not redesign any frame; no text, glow, watermark, or scenery.

Nota: el generador conservó un fondo granate pese a solicitar transparencia. Por eso la hoja se entrega como referencia conceptual y el runtime usa una versión Canvas coherente y sin fondo.

## Panorama de Lima

Prompt final:

> Create an original wide 16-bit pixel-art panorama inspired by Lima, Peru, using the supplied Plaza Mayor image only as visual reference. Include overcast coastal sky with garúa, distant colonial arcades, warm ochre facades, palm trees, carved balconies, a plaza fountain, patterned gardens and layered rooftops. Use a side-scrolling composition with a clear traversable lower band, hard pixel edges and parallax-friendly depth. Golden late-afternoon light filtered through Lima mist; slate blue-gray, ochre, stone cream, palm green, terracotta and muted gold. No text, logos, watermark, photo texture, UI or characters.

## Audio

No se incorporó audio comercial. La música y los efectos se generan en tiempo real con osciladores de Web Audio API, por lo que son originales y no requieren archivos externos.
