export class Enemy {
  constructor(data) { Object.assign(this, { x: data.x, y: 440, w: 42, h: 46, vx: data.type === "pigeon" ? 58 : 72, hp: data.type === "pursuer" ? 3 : 2, type: data.type, hurt: 0, dead: false, facing: -1, origin: data.x }); }
  update(dt, player) {
    if (this.dead) return; this.hurt = Math.max(0, this.hurt - dt);
    const near = Math.abs(player.x - this.x) < (this.type === "pursuer" ? 360 : 190);
    if (near) this.facing = Math.sign(player.x - this.x) || this.facing;
    else if (Math.abs(this.x - this.origin) > 150) this.facing = Math.sign(this.origin - this.x);
    this.x += this.vx * this.facing * dt;
  }
  hit(dmg, dir) { if (this.hurt || this.dead) return false; this.hp -= dmg; this.hurt = .24; this.x += dir * 28; if (this.hp <= 0) this.dead = true; return true; }
  draw(ctx, camera) {
    if (this.dead) return; const x = Math.round(this.x - camera), y = Math.round(this.y);
    ctx.save(); if (this.hurt) ctx.globalAlpha = .45;
    if (this.type === "pigeon") { ctx.fillStyle="#697086"; ctx.fillRect(x+8,y+9,28,25); ctx.fillStyle="#e5c15c"; ctx.fillRect(x+34,y+17,8,5); ctx.fillStyle="#22283a"; ctx.fillRect(x+14,y+3,14,12); }
    else { ctx.fillStyle=this.type === "pursuer"?"#6d3158":"#304b65"; ctx.fillRect(x+5,y+14,32,31); ctx.fillStyle="#d49a6a"; ctx.fillRect(x+11,y+4,20,16); ctx.fillStyle="#20263a"; ctx.fillRect(x+8,y,26,7); ctx.fillStyle="#e9c85e"; ctx.fillRect(x+(this.facing>0?34:0),y+23,9,6); }
    ctx.restore();
  }
  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}
