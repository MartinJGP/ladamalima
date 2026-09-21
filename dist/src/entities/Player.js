import { GAME, PALETTE } from "../config.js";

const overlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;

export class Player {
  constructor(input, audio) { this.input=input; this.audio=audio; this.reset(); }
  reset() { Object.assign(this,{x:110,y:380,w:42,h:82,vx:0,vy:0,onGround:false,facing:1,stamina:100,hp:3,inv:0,attack:null,cooldowns:{skirt:0,fan:0},anim:"idle",animT:0,locked:false}); }
  update(dt, level, enemies, onHurt) {
    this.inv=Math.max(0,this.inv-dt); this.cooldowns.skirt=Math.max(0,this.cooldowns.skirt-dt); this.cooldowns.fan=Math.max(0,this.cooldowns.fan-dt); this.animT+=dt;
    if (this.locked) { this.vx*=.85; return; }
    const left=this.input.is("left"), right=this.input.is("right"), crouch=this.input.is("crouch")&&this.onGround;
    const running=this.input.is("run")&&this.stamina>1&&!crouch; const dir=(right?1:0)-(left?1:0); const max=running?310:190;
    if(dir){this.vx += dir*(running?1450:1120)*dt; this.vx=Math.max(-max,Math.min(max,this.vx)); this.facing=dir;} else this.vx*=Math.pow(.0008,dt);
    if(running&&dir) this.stamina=Math.max(0,this.stamina-26*dt); else this.stamina=Math.min(100,this.stamina+18*dt);
    if(this.input.tap("jump")&&this.onGround&&!crouch){this.vy=-650;this.onGround=false;this.audio.sfx("jump");}
    if(this.input.tap("skirt")&&!this.cooldowns.skirt){this.attack={type:"skirt",t:.34};this.cooldowns.skirt=.6;this.audio.sfx("skirt");}
    if(this.input.tap("fan")&&!this.cooldowns.fan){this.attack={type:"fan",t:.25};this.cooldowns.fan=.46;this.audio.sfx("fan");}
    if(this.attack){this.attack.t-=dt;if(this.attack.t<=0)this.attack=null;}
    this.vy += GAME.gravity*dt; const oldY=this.y; this.x+=this.vx*dt; this.x=Math.max(0,Math.min(level.worldWidth-this.w,this.x)); this.y+=this.vy*dt; this.onGround=false;
    for(const p of level.platforms){ if(this.x+this.w>p.x&&this.x<p.x+p.w&&oldY+this.h<=p.y+12&&this.y+this.h>=p.y&&this.vy>=0){this.y=p.y-this.h;this.vy=0;this.onGround=true;} }
    for(const h of level.hazards){if(overlap(this.rect(),{x:h.x,y:472,w:h.w,h:68}))this.takeDamage(onHurt);}
    for(const e of enemies){if(e.dead)continue;if(this.attack&&overlap(this.attackRect(),e.rect())){if(e.hit(this.attack.type==="skirt"?2:1,this.facing))this.audio.sfx("hit");}else if(overlap(this.rect(),e.rect()))this.takeDamage(onHurt);}
    if(this.y>GAME.height+100)this.takeDamage(onHurt,true);
    this.anim=this.attack?this.attack.type:crouch?"crouch":!this.onGround?(this.vy<0?"jump":"fall"):Math.abs(this.vx)>230?"run":Math.abs(this.vx)>12?"walk":"idle";
  }
  takeDamage(cb,fall=false){if(this.inv)return;this.hp--;this.inv=1.2;this.vy=-360;this.vx=-this.facing*180;this.audio.sfx("hurt");if(fall){this.x=Math.max(80,this.x-160);this.y=330;}cb(this.hp);}
  attackRect(){const reach=this.attack?.type==="fan"?92:72;return{x:this.facing>0?this.x+this.w:this.x-reach,y:this.y+14,w:reach,h:58};}
  rect(){return{x:this.x,y:this.y,w:this.w,h:this.h};}
  draw(ctx,camera){
    const x=Math.round(this.x-camera),y=Math.round(this.y), bob=this.anim==="idle"?Math.sin(this.animT*5)*2:0; ctx.save(); if(this.inv&&Math.floor(this.inv*12)%2)ctx.globalAlpha=.35;
    ctx.translate(x+this.w/2,y+bob);ctx.scale(this.facing,1);ctx.translate(-this.w/2,0);
    ctx.fillStyle="#301d27";ctx.fillRect(13,3,18,22);ctx.fillRect(7,8,9,38);ctx.fillRect(3,29,7,8);ctx.fillStyle=PALETTE.red2;ctx.fillRect(5,0,10,10);
    ctx.fillStyle=PALETTE.skin;ctx.fillRect(15,6,17,18);ctx.fillStyle=PALETTE.white;ctx.fillRect(10,26,23,23);ctx.fillStyle=PALETTE.red;ctx.fillRect(12,27,19,10);
    const crouch=this.anim==="crouch"?13:0;ctx.fillStyle="#17141d";ctx.beginPath();ctx.moveTo(9,43);ctx.lineTo(34,43);ctx.lineTo(42,80-crouch);ctx.lineTo(0,80-crouch);ctx.closePath();ctx.fill();ctx.fillStyle=PALETTE.red2;ctx.fillRect(2,73-crouch,38,7);
    if(this.anim==="run"||this.anim==="walk"){const s=Math.sin(this.animT*(this.anim==="run"?18:11))*5;ctx.fillStyle="#241923";ctx.fillRect(9+s,78-crouch,8,4);ctx.fillRect(27-s,78-crouch,8,4);}
    if(this.attack){ctx.strokeStyle=this.attack.type==="fan"?"#ff4d62":PALETTE.gold;ctx.lineWidth=7;ctx.beginPath();ctx.arc(34,42,this.attack.type==="fan"?47:37,-1.1,1.1);ctx.stroke();ctx.fillStyle=PALETTE.red2;ctx.beginPath();ctx.moveTo(30,31);ctx.lineTo(55,20);ctx.lineTo(49,48);ctx.closePath();ctx.fill();}
    ctx.restore();
  }
}
