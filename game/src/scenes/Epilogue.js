import { ASSETS } from "../managers/AssetManager.js";

const SCENES = [
  { name: "black", end: 1.5, caption: "" },
  { name: "shots", end: 8.5, caption: "EL PARDILLAJE · PRIMER RETO" },
  { name: "running", end: 16.5, caption: "VUELTAS HASTA EL ATARDECER" },
  { name: "poses", end: 23.5, caption: "MARCAS DE UNA NOCHE INOLVIDABLE" },
  { name: "pyramid", end: Infinity, caption: "TRES PARDILLAS, UNA TUNA" }
];

export function epilogueSceneAt(seconds) {
  return SCENES.find(scene => seconds < scene.end) || SCENES.at(-1);
}

export class Epilogue {
  constructor(canvas, onScene) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onScene = onScene;
    this.startTime = 0;
    this.raf = 0;
    this.lastScene = null;
    this.draw = this.draw.bind(this);
  }

  start() {
    this.stop();
    this.startTime = performance.now();
    this.raf = requestAnimationFrame(this.draw);
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  draw(now) {
    const seconds = (now - this.startTime) / 1000;
    const scene = epilogueSceneAt(seconds);
    const ctx = this.ctx, width = this.canvas.width, height = this.canvas.height;
    ctx.fillStyle = "#02030a";
    ctx.fillRect(0, 0, width, height);
    if (scene !== this.lastScene) {
      this.lastScene = scene;
      this.onScene(scene.caption);
    }
    const image = ASSETS[`epilogue${scene.name[0].toUpperCase()}${scene.name.slice(1)}`];
    if (image) {
      const frameWidth = image.naturalWidth / 2, frameHeight = image.naturalHeight / 2;
      const start = scene === SCENES[1] ? SCENES[0].end : SCENES[SCENES.indexOf(scene) - 1]?.end || 0;
      const elapsed = Math.max(0, seconds - start);
      const frame = scene.name === "shots" ? Math.min(3, Math.floor(elapsed / 1.75)) : Math.floor(elapsed / (scene.name === "running" ? .35 : scene.name === "poses" ? 1.1 : .7)) % 4;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, frame % 2 * frameWidth, Math.floor(frame / 2) * frameHeight, frameWidth, frameHeight, 0, 0, width, height);
      // Brief black dissolve between memories; the last scene stays visible forever.
      if (scene.name !== "pyramid") {
        const remaining = scene.end - seconds;
        if (remaining < .7) {
          ctx.fillStyle = `rgba(2,3,10,${1 - Math.max(0, remaining) / .7})`;
          ctx.fillRect(0, 0, width, height);
        }
      }
    }
    this.raf = requestAnimationFrame(this.draw);
  }
}
