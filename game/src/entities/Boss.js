import { GAME } from "../config.js";
import { ASSETS, drawAtlasFrame } from "../managers/AssetManager.js";

const ATTACKS = ["guitar", "kick", "pandero"];

export class Boss {
  constructor(data) {
    Object.assign(this, {
      x: data.x, y: 374, w: 58, h: 112, vx: 0, vy: 0, onGround: true, facing: -1,
      maxHp: 18, hp: 18, state: "idle", animT: 0, hurt: 0, dying: false, defeated: false,
      deathT: 0, attackT: 0, attackDuration: 0, attackType: "guitar", attackCooldown: 1.1, attackIndex: 0,
      stunT: 0, dead: false
    });
  }
  update(dt, player, level) {
    this.animT += dt;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.updatePhysics(dt, level);
    if (this.dying) {
      this.state = "defeat"; this.deathT += dt; this.vx *= Math.pow(.015, dt);
      if (this.onGround && this.deathT > .9) this.defeated = true;
      return;
    }
    this.hurt = Math.max(0, this.hurt - dt);
    if (this.hurt) { this.state = "hurt"; return; }
    if (this.stunT > 0) {
      this.stunT = Math.max(0, this.stunT - dt);
      this.vx *= Math.pow(.015, dt);
      this.state = "stun";
      if (!this.stunT) this.attackCooldown = Math.max(this.attackCooldown, 1.1);
      return;
    }
    const delta = player.x + player.w / 2 - (this.x + this.w / 2);
    const distance = Math.abs(delta);
    if (Math.abs(delta) > 18) this.facing = Math.sign(delta);
    if (this.attackT > 0) {
      this.attackT -= dt; this.vx *= .72; this.state = this.attackType;
      return;
    }
    if (distance < 155 && !this.attackCooldown) {
      this.attackType = ATTACKS[this.attackIndex++ % ATTACKS.length];
      this.attackDuration = this.attackType === "guitar" ? 2.35 : 1.45;
      this.attackT = this.attackDuration;
      this.attackCooldown = this.attackType === "guitar" ? 5.2 : 2.5;
      this.animT = 0; this.state = this.attackType;
      return;
    }
    if (distance > 94) {
      this.state = "walk"; this.vx += this.facing * 580 * dt; this.vx = Math.max(-112, Math.min(112, this.vx)); this.x += this.vx * dt;
    } else { this.state = "idle"; this.vx *= Math.pow(.02, dt); }
    this.x = Math.max(level.worldWidth - 1180, Math.min(level.goal.x - 250, this.x));
  }
  updatePhysics(dt, level) {
    const oldY = this.y; this.vy += GAME.gravity * dt; this.y += this.vy * dt; this.onGround = false;
    for (const platform of level.platforms) {
      if (this.x + this.w > platform.x && this.x < platform.x + platform.w && oldY + this.h <= platform.y + 12 && this.y + this.h >= platform.y && this.vy >= 0) {
        this.y = platform.y - this.h; this.vy = 0; this.onGround = true; break;
      }
    }
  }
  hit(damage, direction, attackType = "") {
    if (this.hurt || this.dying) return false;
    this.hp -= attackType === "guitar" ? this.maxHp / 4 : damage;
    this.x += direction * 18; this.hurt = .25; this.animT = 0;
    if (attackType === "guitar") {
      this.attackT = 0; this.stunT = 2.3; this.vx = 0;
      this.attackCooldown = Math.max(this.attackCooldown, 2.2);
    }
    if (this.hp <= 0) { this.hp = 0; this.dying = true; this.state = "defeat"; this.deathT = 0; this.vy = -220; this.vx = direction * 95; }
    return true;
  }
  attackProgress() { return this.attackDuration ? 1 - this.attackT / this.attackDuration : 0; }
  canDamage() {
    if (this.dying || this.hurt || this.stunT || this.attackT <= 0) return false;
    const progress = this.attackProgress();
    if (this.attackType === "guitar") return progress > .55 && progress < .72;
    if (this.attackType === "kick") return progress > .42 && progress < .65;
    return progress > .46 && progress < .7;
  }
  attackRect() {
    const reach = this.attackType === "guitar" ? 150 : this.attackType === "kick" ? 112 : 98;
    return { x: this.facing > 0 ? this.x + this.w - 8 : this.x - reach + 8, y: this.y + 18, w: reach, h: 80 };
  }
  frameIndex() {
    if (this.state === "defeat") return 9;
    if (this.state === "stun") return Math.floor(this.animT * 4) % 2 ? 8 : 0;
    if (this.state === "hurt") return 8;
    if (this.state === "guitar") return this.attackProgress() < .48 ? 4 : 5;
    if (this.state === "kick") return this.attackProgress() < .4 ? 4 : 6;
    if (this.state === "pandero") return this.attackProgress() < .4 ? 4 : 7;
    if (this.state === "walk") return 2 + Math.floor(this.animT * 6) % 2;
    return Math.floor(this.animT * 2.5) % 2;
  }
  draw(ctx, camera) {
    const image = ASSETS.boss;
    if (!image) return;
    const index = this.frameIndex(), cellWidth = image.naturalWidth / 5, cellHeight = image.naturalHeight / 2;
    const size = 160, bottom = this.y + this.h;
    const destination = { x: Math.round(this.x - camera + this.w / 2 - size / 2), y: Math.round(bottom - size), w: size, h: size };
    drawAtlasFrame(ctx, image, { x: index % 5 * cellWidth, y: Math.floor(index / 5) * cellHeight, w: cellWidth, h: cellHeight }, destination, this.facing < 0, this.hurt ? .65 : 1);
    if (this.state === "stun") {
      ctx.save();ctx.fillStyle="#ffd95d";
      for(let i=0;i<3;i++){
        const phase=this.animT*5+i*Math.PI*2/3;
        const x=Math.round(this.x+this.w/2-camera+Math.cos(phase)*31);
        const y=Math.round(this.y-8+Math.sin(phase)*9);
        ctx.fillRect(x-2,y-7,4,14);ctx.fillRect(x-7,y-2,14,4);
      }
      ctx.restore();
    }
  }
  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}
