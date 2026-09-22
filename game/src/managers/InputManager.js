import { CONTROLS } from "../config.js";

export class InputManager {
  constructor() {
    this.down = new Set(); this.pressed = new Set(); this.keyboardDown = new Set(); this.touchRefs = new Map(); this.lastDirection = "ArrowRight";
    addEventListener("keydown", e => { if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault(); if (!this.down.has(e.code)) this.pressed.add(e.code); this.keyboardDown.add(e.code); this.down.add(e.code); if(e.code==="ArrowLeft"||e.code==="KeyA")this.lastDirection="ArrowLeft";if(e.code==="ArrowRight"||e.code==="KeyD")this.lastDirection="ArrowRight"; });
    addEventListener("keyup", e => { this.keyboardDown.delete(e.code); if(!(this.touchRefs.get(e.code)>0))this.down.delete(e.code); });
  }
  is(action) { return CONTROLS[action].some(k => this.down.has(k)); }
  tap(action) { return CONTROLS[action].some(k => this.pressed.has(k)); }
  clear() { this.pressed.clear(); }
  holdTouch(code) { const count=this.touchRefs.get(code)||0;if(!this.down.has(code))this.pressed.add(code);this.touchRefs.set(code,count+1);this.down.add(code); }
  releaseTouch(code) { const count=Math.max(0,(this.touchRefs.get(code)||0)-1);if(count)this.touchRefs.set(code,count);else{this.touchRefs.delete(code);if(!this.keyboardDown.has(code))this.down.delete(code);} }
  bindTouch(root) {
    root.querySelectorAll("[data-key]").forEach(btn => {
      const code = btn.dataset.key;
      let heldCodes=[];
      const start = e => { e.preventDefault();if(code==="ArrowLeft")this.lastDirection="ArrowLeft";if(code==="ArrowRight")this.lastDirection="ArrowRight";heldCodes=btn.dataset.autoForward==="true"?[code,this.lastDirection]:[code];heldCodes.forEach(held=>this.holdTouch(held));btn.classList.add("is-down");btn.setPointerCapture?.(e.pointerId); };
      const end = e => { e.preventDefault();heldCodes.forEach(held=>this.releaseTouch(held));heldCodes=[];btn.classList.remove("is-down");if(btn.hasPointerCapture?.(e.pointerId))btn.releasePointerCapture(e.pointerId); };
      btn.addEventListener("pointerdown", start); btn.addEventListener("pointerup", end); btn.addEventListener("pointercancel", end); btn.addEventListener("pointerleave", end);
    });
  }
}
