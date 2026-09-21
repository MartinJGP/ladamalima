import { NORMAL_ENEMY_REFERENCE_HEIGHT, SMALL_ENEMY_REFERENCE_HEIGHT } from "../config.js";
import { ASSETS, drawAtlasFrame } from "../managers/AssetManager.js";

const CELL_W=217,CELL_H=241;
const classicRows={pursuer:1,pigeon:2};
const classicSequence={idle:[0,1],walk:[2,3,4],alert:[5],attack:[5,6],hurt:[7],defeat:[8,9]};
const patrolSequence={idle:[0,1],walk:[2,3,4],alert:[5],attack:[7],hurt:[8],defeat:[9]};
const throwerSequence={idle:[0,1],walk:[2,3],prepare:[4,5],throw:[6],recovery:[7],hurt:[8],defeat:[9]};
const rate={idle:3,walk:8,alert:3,prepare:7,throw:4,recovery:4,attack:7,hurt:1,defeat:4};

export class Enemy {
  constructor(data) {
    const pigeon=data.type==="pigeon",hp={guard:4,pursuer:3,pigeon:2,thrower:3}[data.type]||3;
    Object.assign(this,{x:data.x,y:pigeon?446:406,w:pigeon?46:42,h:pigeon?40:80,vx:pigeon?58:data.type==="thrower"?38:72,vy:0,onGround:true,hp,type:data.type,hurt:0,dead:false,dying:false,deathT:0,facing:-1,origin:data.x,state:"idle",animT:0,attackT:0,attackCooldown:Math.random()*.7,alertT:0,alerted:false,thrown:false});
  }
  update(dt,player,level,onThrow){
    if(this.dead)return;this.animT+=dt;this.attackCooldown=Math.max(0,this.attackCooldown-dt);
    this.updatePhysics(dt,level);
    if(this.dying){this.setState("defeat");this.deathT+=dt;if(this.deathT>.72&&this.onGround)this.dead=true;return;}
    this.hurt=Math.max(0,this.hurt-dt);if(this.hurt){this.setState("hurt");return;}
    const dx=player.x+player.w/2-(this.x+this.w/2),distance=Math.abs(dx);
    const playerAbove=player.y+player.h<this.y+8;
    if(playerAbove&&distance<72){this.attackT=0;this.setState("idle");this.turnToward(dx,26);return;}
    if(this.type==="thrower"){this.updateThrower(dt,dx,distance,onThrow);return;}
    const near=distance<(this.type==="pursuer"?380:230);
    if(near&&!this.alerted){this.alerted=true;this.alertT=.34;this.turnToward(dx);}
    if(!near&&distance>300)this.alerted=false;
    if(this.alertT>0){this.alertT-=dt;this.setState("alert");return;}
    if(distance<86){
      if(!this.attackCooldown){this.attackT=.42;this.attackCooldown=1.05;this.animT=0;}
      if(this.attackT>0){this.attackT-=dt;this.setState("attack");return;}
    }
    if(near)this.turnToward(dx);else if(Math.abs(this.x-this.origin)>150)this.turnToward(this.origin-this.x);
    this.setState("walk");
    this.x+=this.vx*this.facing*dt;
  }
  updatePhysics(dt,level){
    const oldY=this.y;this.vy+=1850*dt;this.y+=this.vy*dt;this.onGround=false;
    for(const p of level.platforms){
      if(this.x+this.w>p.x&&this.x<p.x+p.w&&oldY+this.h<=p.y+12&&this.y+this.h>=p.y&&this.vy>=0){
        this.y=p.y-this.h;this.vy=0;this.onGround=true;break;
      }
    }
  }
  turnToward(dx,deadZone=14){if(Math.abs(dx)>deadZone)this.facing=Math.sign(dx);}
  updateThrower(dt,dx,distance,onThrow){
    this.turnToward(dx,24);
    if(this.attackT>0){
      this.attackT-=dt;
      if(this.attackT>.76)this.setState("prepare");
      else if(this.attackT>.42){this.setState("throw");if(!this.thrown){this.thrown=true;onThrow?.(this);}}
      else this.setState("recovery");
      return;
    }
    if(distance<520&&distance>110&&!this.attackCooldown){this.attackT=1.35;this.attackCooldown=2.65;this.thrown=false;this.setState("prepare");return;}
    if(distance>560){if(Math.abs(this.x-this.origin)>95)this.turnToward(this.origin-this.x);this.setState("walk");this.x+=this.vx*this.facing*dt;}else this.setState("idle");
  }
  setState(state){if(this.state!==state){this.state=state;this.animT=0;}}
  hit(dmg,dir){if(this.hurt||this.dead||this.dying)return false;this.hp-=dmg;this.x+=dir*28;this.animT=0;if(this.hp<=0){this.dying=true;this.state="defeat";this.deathT=0;}else{this.hurt=.28;this.state="hurt";}return true;}
  canDamage(){return this.type!=="thrower"&&!this.dead&&!this.dying&&this.state==="attack"&&this.attackT<.30&&this.attackT>.11;}
  attackRect(){const reach=this.type==="pigeon"?52:70;return{x:this.facing>0?this.x:this.x-reach+this.w,y:this.y+8,w:reach,h:this.h-12};}
  frame(){
    if(this.type==="thrower"){
      const seq=throwerSequence[this.state]||[0,1];let i=Math.floor(this.animT*(rate[this.state]||4));
      if(this.state==="defeat")i=Math.min(seq.length-1,Math.floor(this.deathT*rate.defeat));else i%=seq.length;
      const index=seq[i];return{image:ASSETS.thrower,frame:{x:(index%5)*256,y:Math.floor(index/5)*256,w:256,h:256}};
    }
    const isUrban=this.type==="guard"||this.type==="thrower",seq=(this.type==="thrower"?throwerSequence:this.type==="guard"?patrolSequence:classicSequence)[this.state]||[0,1];
    let i=Math.floor(this.animT*(rate[this.state]||4));if(this.state==="defeat")i=Math.min(seq.length-1,Math.floor(this.deathT*rate.defeat));else i%=seq.length;
    return{image:isUrban?ASSETS.urbanEnemies:ASSETS.enemies,frame:{x:seq[i]*CELL_W,y:(this.type==="thrower"?1:this.type==="guard"?0:classicRows[this.type])*CELL_H,w:CELL_W,h:CELL_H}};
  }
  draw(ctx,camera){
    if(this.dead)return;const pigeon=this.type==="pigeon",size=pigeon?SMALL_ENEMY_REFERENCE_HEIGHT*1.72:this.type==="thrower"?118:NORMAL_ENEMY_REFERENCE_HEIGHT*1.28;
    const dx=Math.round(this.x-camera+this.w/2-size/2),dy=Math.round(this.y+this.h-size),atlas=this.frame();
    drawAtlasFrame(ctx,atlas.image,atlas.frame,{x:dx,y:dy,w:size,h:size},this.facing<0,this.hurt?.65:1);
  }
  rect(){return{x:this.x,y:this.y,w:this.w,h:this.h};}
}
