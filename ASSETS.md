# Recursos visuales

Modo utilizado: generación integrada de imágenes (`imagegen`) y normalización local con Pillow/nearest-neighbor. Las fotografías aportadas por el usuario se usaron únicamente como referencias de personaje, vestido y entorno.

## Protagonista y ataque de guitarra

- `game/assets/sprites/heroine-v3-atlas.png`: atlas RGBA de 10 × 4 celdas de 200 × 200 px. Incluye idle, caminar, correr, salto por fases, caída, aterrizaje, agacharse, daño, falda, abanico, guitarra y derrota.
- `game/assets/sprites/guitar-equipment.png`: guitarra pixel-art transparente para la espalda.

Prompt principal:

> Create a strict transparent 16-bit pixel-art atlas for the same original Lima heroine. Use exactly ten equal cells per row and four rows. Preserve her face, braid, red flower, white blouse, black-and-red dress and red fan. Keep identical head, torso, leg and body scale in every frame; use transparent padding instead of resizing the character. Include idle, walk, run, jump phases, fall, land, crouch, hurt, skirt attack, fan attack, defeat and a continuous ten-frame guitar special from reaching back through ground impact and returning the guitar. Align grounded feet to one baseline. No text, grid, scenery, black background, halo or watermark.

## Adversarios y obstáculos urbanos

- `game/assets/sprites/urban-enemy-atlas.png`: atlas RGBA de 10 × 3 celdas de 217 × 241 px. Contiene un adversario urbano ficticio en verde azulino, lanzador de piedras, proyectiles, impactos y bolardos dañados.
- El personaje ficticio no reproduce escudos, insignias, nombres, rostros ni identidad de personas reales.

Prompt principal:

> Create a transparent 16-bit pixel-art atlas in a strict ten-column, three-row grid. Row one: a completely fictional caricatured urban patrol adversary in dark blue-green clothing, cap, dark trousers and boots, with idle, patrol, alert, chase, attack, hurt and defeat poses; no real insignia, logo, badge, name or identifiable person. Row two: a fictional street rock thrower with idle, walk, prepare, throw, recovery, hurt and defeat frames. Row three: original damaged urban bollards, a bent bollard, broken metal barrier, stones, impact bursts and dust. Keep full figures inside equal cells with transparent gutters, consistent scale and feet baseline. No scenery, labels, black background, halos or watermark.

La gama cromática verde azulino se estudió a partir de una referencia institucional contemporánea del Ministerio del Interior del Perú. Los bolardos se diseñaron como interpretación original de mobiliario urbano, tomando como referencia general publicaciones municipales.

## Celebración final

- `game/assets/sprites/victory-v3-atlas.png`: tira RGBA de ocho celdas de 256 × 256 px, con pies anclados al mismo suelo.

Prompt final:

> Create a production-ready transparent pixel-art victory spritesheet for the exact same heroine. One horizontal row of exactly eight equal square cells with transparent gutters. Keep identical body scale and feet on one bottom baseline in all frames. Sequence: initial step, lateral skirt flourish, fan movement, wider dress movement, small turn, dress follow-through, final fan flourish and final pose. Include foot, dress, braid, arm, face and fan movement; no jumping, floating, text, grid, scenery, black background, halo or watermark.

## Recursos conservados

- `game/assets/sprites/enemy-atlas.png`: perseguidor y paloma animados.
- `game/assets/sprites/bouquet-atlas.png`: meta de flores amarillas.
- `game/assets/backgrounds/plaza-mayor.png`: panorama pixel-art original inspirado en Lima.

## Auditoría

`tools/normalize_sprites.py` convierte los atlas de producción a cuadrículas con dimensiones enteras, mantiene RGBA real, alinea el último píxel visible con el anclaje inferior y elimina componentes residuales ajenos a cada celda sin borrar el negro intencional del dibujo. El renderizado Canvas desactiva `imageSmoothingEnabled`.

## Audio

No se incorporó audio comercial. La música y los efectos se generan en tiempo real con osciladores de Web Audio API.
