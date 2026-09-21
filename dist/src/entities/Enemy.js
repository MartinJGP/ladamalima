import { ASSETS, drawAtlasFrame } from "../managers/AssetManager.js";

const CELL_W=217.2,CELL_H=724/3;
const row={guard:0,pursuer:1,pigeon:2};
const sequence={idle:[0,1],walk:[2,3,4],attack:[5,6],hurt:[7],defeat:[8,9]};
const rate={idle:3,walk:8,attack:7,hurt:1,defeat:4};

export class Enemy {
  constructor(data) {
    const pigeon=data.type==="pigeon";
    Object.assign(this,{x:data.x,y:pigeon?438:406,w:pigeon?46:42,h:pigeon?40:80,vx:pigeon?58:72,hp:data.type==="pursuer"?3:2,type:data.type,hurt:0,dead:false,dying:false,deathT:0,facing:-1,origin:data.x,state:"idle",animT:0,attackT:0,attackCooldown:0});
  }
  update(dt,player){
    if(this.dead)return;this.animT+=dt;this.attackCooldown=Math.max(0,this.attackCooldown-dt);
    if(this.dying){this.state="defeat";this.deathT+=dt;if(this.deathT>.72)this.dead=true;return;}
    this.hurt=Math.max(0,this.hurt-dt);if(this.hurt){this.state="hurt";return;}
    const distance=Math.abs(player.x-this.x),near=distance<(this.type==="pursuer"?380:210);
    if(distance<86){if(!this.attackCooldown){this.attackT=.42;this.attackCooldown=1.05;this.animT=0;}if(this.attackT>0){this.attackT-=dt;this.state="attack";return;}}
    if(near)this.facing=Math.sign(player.x-this.x)||this.facing;else if(Math.abs(this.x-this.origin)>150)this.facing=Math.sign(this.origin-this.x);
    this.state="walk";this.x+=this.vx*this.facing*dt;
  }
  hit(dmg,dir){if(this.hurt||this.dead||this.dying)return false;this.hp-=dmg;this.x+=dir*28;this.animT=0;if(this.hp<=0){this.dying=true;this.state="defeat";this.deathT=0;}else{this.hurt=.28;this.state="hurt";}return true;}
  canDamage(){return !this.dead&&!this.dying&&this.state==="attack"&&this.attackT<.30&&this.attackT>.11;}
  attackRect(){const reach=this.type==="pigeon"?52:70;return{x:this.facing>0?this.x:this.x-reach+this.w,y:this.y+8,w:reach,h:this.h-12};}
  frame(){const seq=sequence[this.state]||sequence.idle;let i=Math.floor(this.animT*rate[this.state]);if(this.state==="defeat")i=Math.min(seq.length-1,Math.floor(this.deathT*rate.defeat));else i%=seq.length;return{x:seq[i]*CELL_W,y:row[this.type]*CELL_H,w:CELL_W,h:CELL_H};}
  draw(ctx,camera){
    if(this.dead)return;const pigeon=this.type==="pigeon",dw=pigeon?82:104,dh=pigeon?76:116;
    const dx=Math.round(this.x-camera+this.w/2-dw/2),dy=Math.round(this.y+this.h-dh);
    drawAtlasFrame(ctx,ASSETS.enemies,this.frame(),{x:dx,y:dy,w:dw,h:dh},this.facing<0,this.hurt?.65:1);
  }
  rect(){return{x:this.x,y:this.y,w:this.w,h:this.h};}
}
