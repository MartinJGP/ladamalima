export const ASSETS = {};

const SOURCES = {
  heroine: "./assets/sprites/heroine-v3-atlas.png",
  enemies: "./assets/sprites/enemy-atlas.png",
  urbanEnemies: "./assets/sprites/urban-enemy-atlas.png",
  victory: "./assets/sprites/victory-v3-atlas.png",
  guitar: "./assets/sprites/guitar-equipment.png",
  bouquet: "./assets/sprites/bouquet-atlas.png",
  background: "./assets/backgrounds/plaza-mayor.png"
};

export async function preloadAssets() {
  await Promise.all(Object.entries(SOURCES).map(([key, src]) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { ASSETS[key] = image; resolve(); };
    image.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    image.src = src;
  })));
  return ASSETS;
}

export function drawAtlasFrame(ctx, image, frame, dest, flip = false, alpha = 1) {
  if (!image?.complete || !frame) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (flip) {
    ctx.translate(dest.x + dest.w, dest.y);
    ctx.scale(-1, 1);
    ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, 0, 0, dest.w, dest.h);
  } else {
    ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, dest.x, dest.y, dest.w, dest.h);
  }
  ctx.restore();
}
