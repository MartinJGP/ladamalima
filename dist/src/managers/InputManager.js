import { CONTROLS } from "../config.js";

export class InputManager {
  constructor() {
    this.down = new Set(); this.pressed = new Set();
    addEventListener("keydown", e => { if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault(); if (!this.down.has(e.code)) this.pressed.add(e.code); this.down.add(e.code); });
    addEventListener("keyup", e => this.down.delete(e.code));
  }
  is(action) { return CONTROLS[action].some(k => this.down.has(k)); }
  tap(action) { return CONTROLS[action].some(k => this.pressed.has(k)); }
  clear() { this.pressed.clear(); }
  bindTouch(root) {
    root.querySelectorAll("[data-key]").forEach(btn => {
      const code = btn.dataset.key;
      const start = e => { e.preventDefault(); if (!this.down.has(code)) this.pressed.add(code); this.down.add(code); btn.classList.add("is-down"); };
      const end = e => { e.preventDefault(); this.down.delete(code); btn.classList.remove("is-down"); };
      btn.addEventListener("pointerdown", start); btn.addEventListener("pointerup", end); btn.addEventListener("pointercancel", end); btn.addEventListener("pointerleave", end);
    });
  }
}
