export const GAME = { width: 960, height: 540, gravity: 1850, maxDt: 1 / 30 };
export const DEBUG_COLLISIONS = false;
export const PLAYER_VISUAL_SCALE = 1;
export const PLAYER_REFERENCE_HEIGHT = 96;
export const NORMAL_ENEMY_REFERENCE_HEIGHT = 88;
export const SMALL_ENEMY_REFERENCE_HEIGHT = 38;
export const PROJECTILE_REFERENCE_SIZE = 18;

export const CONTROLS = {
  left: ["ArrowLeft", "KeyA"], right: ["ArrowRight", "KeyD"],
  jump: ["Space", "KeyW", "ArrowUp"], crouch: ["ArrowDown", "KeyS"],
  run: ["ShiftLeft", "ShiftRight"], skirt: ["KeyJ", "KeyZ"], fan: ["KeyK", "KeyX"], guitar: ["KeyL", "KeyC"],
  pause: ["Escape", "KeyP"], restart: ["KeyR"]
};

export const PALETTE = {
  ink: "#0b1020", navy: "#17223d", red: "#c72c48", red2: "#ef455a",
  gold: "#eac75b", cream: "#fff2cf", skin: "#d99168", white: "#f3f0e6",
  green: "#5f8f55", teal: "#4db6ac"
};
