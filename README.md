# La Dama de Lima

Videojuego de plataformas 2D retro para navegador, inspirado en plazas, balcones y paisajes de Lima. Es una aplicación estática: abre `dist/index.html` mediante un servidor local o usa la versión publicada.

## Decisiones de diseño

- **Stack:** Canvas 2D + JavaScript ES Modules + Web Audio API. No necesita dependencias ni compilación, mantiene 60 FPS con delta time y es fácil de extender.
- **Resolución lógica:** 960 × 540, escalada de forma responsiva.
- **Sprite lógico de la protagonista:** 42 × 82 px dentro de celdas objetivo de 64 × 96 px.
- **Controles:** A/D o flechas para moverse; Shift para correr; Espacio/W/↑ para saltar; S/↓ para agacharse; J/Z para falda; K/X para abanico; P/Esc pausa; R reinicia.
- **Mecánicas:** aceleración, desaceleración, gravedad, plataformas, cámara lateral, resistencia, dos ataques con hitbox/cooldown, daño, tres vidas, enemigos, peligros, meta animada, puntuación y victoria.
- **Progreso:** nombre, puntuación, nivel desbloqueado, vidas, récord, progreso, ranking y audio guardados en `localStorage`; exportación/importación JSON incluida.

## Niveles configurables

Los tres niveles se definen como datos en `dist/src/data/levels.js`:

1. Plaza Mayor — introducción a movimiento, peligros y enemigos.
2. Puente de los Suspiros — plataformas más verticales y perseguidores.
3. Huaca al Amanecer — secuencias más exigentes y combinación de peligros.

Cada nivel declara ancho del mundo, paleta, plataformas, enemigos, peligros y meta; añadir otro nivel no requiere duplicar la lógica del juego.

## Arquitectura

```text
dist/
  index.html
  assets/
    backgrounds/plaza-mayor.png
    sprites/heroine-atlas.png
    audio/                 # reservado para pistas licenciadas futuras
  src/
    config.js
    main.js
    styles.css
    data/levels.js
    entities/Player.js
    entities/Enemy.js
    managers/AudioManager.js
    managers/InputManager.js
    managers/SaveManager.js
    scenes/Game.js
```

El audio actual es original y se sintetiza en tiempo real con Web Audio API: música de menú, gameplay y victoria; efectos de salto, ataques, golpe, daño, botones y meta.

## Spritesheets previstos

- Protagonista: idle, caminar, correr, saltar, caer, agacharse, ataque de falda, ataque de abanico, daño, derrota y victoria.
- Enemigos: guardia patrullero, perseguidor y paloma hostil; idle, movimiento, ataque, daño y derrota.
- Mundo: flores-meta, partículas, peligros, plataformas, faroles, palmeras y elementos de primer plano.
- UI: corazones, resistencia, ataques disponibles, botones y cursores.

Los sprites se cargan y recortan desde atlas reales: `heroine-atlas.png`, `enemy-atlas.png` y `bouquet-atlas.png`. Las hitboxes permanecen separadas e invisibles; pueden mostrarse únicamente durante desarrollo cambiando `DEBUG_COLLISIONS` en `dist/src/config.js`.

La pantalla de nivel completado y la de derrota son obligatorias: no incluyen cierre exterior ni botón X, por lo que el jugador debe elegir menú, siguiente nivel o reintentar.

## Ejecución local

Desde esta carpeta:

```powershell
python -m http.server 4173 --directory dist
```

Abre `http://127.0.0.1:4173/`.
