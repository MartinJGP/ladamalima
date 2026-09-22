export const ASSETS = {};
const CACHE_VERSION = "pardillaje-1";

const SOURCES = {
  heroine: "./assets/sprites/heroine-tuna-normalized-atlas.png",
  heroineAspirant: "./assets/sprites/heroine-aspirant-normalized-atlas.png",
  heroineNovice: "./assets/sprites/heroine-novice-normalized-atlas.png",
  enemies: "./assets/sprites/enemy-atlas.png",
  urbanEnemies: "./assets/sprites/urban-enemy-atlas.png",
  thrower: "./assets/sprites/thrower-v4-atlas.png",
  victory: "./assets/sprites/victory-tuna-normalized-atlas.png",
  victoryAspirant: "./assets/sprites/victory-aspirant-normalized-atlas.png",
  victoryNovice: "./assets/sprites/victory-novice-normalized-atlas.png",
  defeat: "./assets/sprites/defeat-tuna-normalized-atlas.png",
  defeatAspirant: "./assets/sprites/defeat-aspirant-normalized-atlas.png",
  defeatNovice: "./assets/sprites/defeat-novice-normalized-atlas.png",
  attacks: "./assets/sprites/attack-tuna-normalized-atlas.png",
  attacksAspirant: "./assets/sprites/attack-aspirant-normalized-atlas.png",
  attacksNovice: "./assets/sprites/attack-novice-normalized-atlas.png",
  guitarSpecial: "./assets/sprites/guitar-special-normalized-atlas.png",
  crouch: "./assets/sprites/crouch-pandero-tuna-normalized-atlas.png",
  crouchAspirant: "./assets/sprites/crouch-pandero-aspirant-normalized-atlas.png",
  crouchNovice: "./assets/sprites/crouch-pandero-novice-normalized-atlas.png",
  crouchIdle: "./assets/sprites/crouch-idle-tuna-normalized-atlas.png",
  crouchIdleAspirant: "./assets/sprites/crouch-idle-aspirant-normalized-atlas.png",
  crouchIdleNovice: "./assets/sprites/crouch-idle-novice-normalized-atlas.png",
  goalTuna: "./assets/sprites/goal-tuna-animated-atlas.png",
  bouquet: "./assets/sprites/bouquet-atlas.png",
  boss: "./assets/sprites/tuna-boss-atlas.png",
  bossDialogue: "./assets/sprites/boss-dialogue-portraits.png",
  epilogueShots: "./assets/sprites/epilogue-shots.png",
  epilogueRunning: "./assets/sprites/epilogue-running.png",
  epiloguePoses: "./assets/sprites/epilogue-poses.png",
  epiloguePyramid: "./assets/sprites/epilogue-pyramid.png",
  regalia: "./assets/sprites/final-regalia-atlas.png",
  guitarItem: "./assets/sprites/guitar-equipment.png",
  lima: "./assets/backgrounds/plaza-mayor.png",
  barranco: "./assets/backgrounds/barranco.png",
  trujillo: "./assets/backgrounds/trujillo.png"
};

export async function preloadAssets() {
  await Promise.all(Object.entries(SOURCES).map(([key, src]) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { ASSETS[key] = image; resolve(); };
    image.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    image.src = `${src}?v=${CACHE_VERSION}`;
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
