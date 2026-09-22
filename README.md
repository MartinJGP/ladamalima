# La Dama de Lima

Videojuego de plataformas 2D retro para navegador, ambientado en Lima, Barranco y Trujillo. El cliente estático vive en `game/` y `api/ranking.js` añade un ranking global persistente preparado para Vercel Functions y Neon Postgres.

## Decisiones de diseño

- **Stack:** Canvas 2D + JavaScript ES Modules + Web Audio API. No necesita dependencias ni compilación, mantiene 60 FPS con delta time y es fácil de extender.
- **Resolución lógica:** 960 × 540, escalada de forma responsiva.
- **Sprite lógico de la protagonista:** hitbox estable de 42 × 82 px y atlas normalizado a celdas de 200 × 200 px con un único `PLAYER_VISUAL_SCALE`.
- **Controles:** A/D o flechas para moverse; Shift para correr; Espacio/W/↑ para saltar; S/↓ para agacharse; J/Z para ataque 1 —patada elegante de la Aspirante o falda en los demás trajes—; K/X para abanico; L/C para guitarra; P/Esc pausa; R reinicia.
- **Mecánicas:** aceleración, desaceleración, gravedad, plataformas, cámara lateral, resistencia, habilidades desbloqueables con ventanas de impacto y cooldown, daño, tres vidas, lanzadores con proyectiles esquivables, enemigos, jefe final, metas animadas, puntuación y victoria.
- **Progreso:** el estado de la partida permanece en memoria durante la sesión; no utiliza `localStorage`. El ranking global se guarda en Neon mediante `/api/ranking`.

## Campaña configurable

La campaña de 30 capítulos se define como datos en `game/src/data/levels.js`:

1. **Lima (1–10):** traje de aspirante y patada elegante con abanico como ataque 1. El capítulo 10 desbloquea el ataque de abanico independiente.
2. **Barranco (11–20):** traje de pardilla, recorridos más largos y falda + abanico. El capítulo 20 entrega la guitarra.
3. **Trujillo (21–30):** traje tunero completo y las tres habilidades. El capítulo 30 incluye al tuno jefe, la entrega de cintas y parches y el baile final.

Los capítulos se desbloquean en orden. Cada uno declara ancho, dificultad, plataformas, enemigos, peligros y meta; los recorridos aumentan progresivamente de longitud entre mundos.

## Arquitectura

```text
game/
  index.html
  assets/
    backgrounds/plaza-mayor.png
    backgrounds/barranco.png
    backgrounds/trujillo.png
    sprites/heroine-v3-atlas.png
    sprites/heroine-aspirant-atlas.png
    sprites/heroine-novice-atlas.png
    sprites/tuna-boss-atlas.png
    sprites/final-regalia-atlas.png
    sprites/urban-enemy-atlas.png
    sprites/victory-v3-atlas.png
    sprites/guitar-equipment.png
    audio/                 # reservado para pistas licenciadas futuras
  src/
    config.js
    main.js
    styles.css
    data/levels.js
    entities/Player.js
    entities/Enemy.js
    entities/Boss.js
    managers/AudioManager.js
    managers/InputManager.js
    managers/SaveManager.js
    scenes/Game.js
api/
  ranking.js              # función de Vercel para el ranking global
scripts/
  build-static.mjs        # genera vercel-dist/
vercel.json
```

El audio actual es original y se sintetiza en tiempo real con Web Audio API: música de menú, gameplay y victoria; efectos de salto, ataques, golpe, daño, botones y meta.

## Spritesheets previstos

- Protagonista: idle, caminar, correr, salto por fases, caída, aterrizaje, agacharse, falda, abanico, especial de guitarra, daño, derrota y celebración de ocho fases.
- Enemigos: adversario urbano ficticio, perseguidor, lanzador de piedras y paloma; idle, movimiento, alerta, ataque, daño y derrota.
- Mundo: flores-meta, partículas, peligros, plataformas, faroles, palmeras y elementos de primer plano.
- UI: corazones, resistencia, ataques disponibles, botones y cursores.

Los sprites se cargan y recortan desde atlas reales. La herramienta `tools/normalize_sprites.py` audita 78 celdas y normaliza dimensiones enteras, transparencia y anclaje inferior. Las hitboxes permanecen separadas e invisibles; pueden mostrarse únicamente durante desarrollo cambiando `DEBUG_COLLISIONS` en `game/src/config.js`.

Las pantallas intermedias de capítulo completado y derrota no se pueden cerrar accidentalmente. Al completar la aventura, el envío al ranking global es opcional y la persona puede omitirlo para volver al menú.

## Preparación para Vercel

1. Crea o conecta una base Neon desde **Vercel Marketplace → Storage**.
2. Comprueba que Vercel haya añadido `DATABASE_URL` al entorno **Production** del proyecto. También se admiten `POSTGRES_URL`, `NEON_DATABASE_URL` y `DATABASE_URL_UNPOOLED`.
3. Importa el repositorio en Vercel o vuelve a desplegarlo después de cambiar variables. La configuración incluida ejecutará `npm run build`, publicará `vercel-dist/` y desplegará `api/ranking.js` como Vercel Function.

La tabla `leaderboard` se crea automáticamente en la primera solicitud. No es necesario ejecutar SQL manualmente.

## Verificación local

Para verificar el frontend estático:

```powershell
npm install
npm run verify
npm run build
python -m http.server 4173 --directory vercel-dist
```

Abre `http://127.0.0.1:4173/`. En esta vista puramente estática el ranking indicará que no hay conexión; para probar también la función y Neon usa `npx vercel dev` con `DATABASE_URL` configurada.
