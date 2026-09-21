import { GAME, PALETTE, DEBUG_COLLISIONS } from "../config.js";
import { getLevel } from "../data/levels.js";
import { Player } from "../entities/Player.js";
import { Enemy } from "../entities/Enemy.js";
import { ASSETS, drawAtlasFrame } from "../managers/AssetManager.js";

const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

export class Game {
  constructor(canvas,input,audio,save,events={}){
    this.canvas=canvas;this.ctx=canvas.getContext("2d");this.ctx.imageSmoothingEnabled=false;this.input=input;this.audio=audio;this.save=save;this.events=events;
    this.raf=0;this.last=0;
  }
  start(id){cancelAnimationFrame(this.raf);this.level=getLevel(id);this.enemies=this.level.enemies.map(e=>new Enemy(e));this.player=new Player(this.input,this.audio);this.camera=0;this.elapsed=0;this.score=0;this.paused=false;this.finished=false;this.defeating=false;this.defeatT=0;this.ended=false;this.victoryT=0;this.particles=[];this.audio.music("game");this.last=performance.now();this.loop(this.last);}
  stop(){this.ended=true;cancelAnimationFrame(this.raf);this.audio.stop();}
  loop=(now)=>{let dt=Math.min((now-this.last)/1000||0,1/30);this.last=now;this.update(dt);this.draw();this.input.clear();if(!this.ended)this.raf=requestAnimationFrame(this.loop);}
  update(dt){
    if(this.input.tap("pause")){this.paused=!this.paused;this.events.pause?.(this.paused);} if(this.input.tap("restart"))return this.start(this.level.id); if(this.paused)return;
    if(this.finished){this.victoryT+=dt;this.player.setAnimation("victory",this.victoryT);this.spawnPetals();this.updateParticles(dt);if(this.victoryT>3.6)this.finish();return;}
    if(this.defeating){this.defeatT+=dt;this.player.setAnimation("defeat",this.defeatT);if(this.defeatT>1.05)this.gameOver();return;}
    this.elapsed+=dt;this.player.update(dt,this.level,this.enemies,hp=>{this.events.hurt?.(hp);if(hp<=0){this.defeating=true;this.player.locked=true;this.player.animT=0;this.audio.stop();}});this.enemies.forEach(e=>e.update(dt,this.player));
    this.score=Math.max(0,Math.floor(this.player.x/8)+this.enemies.filter(e=>e.dead).length*250);
    const target=Math.max(0,Math.min(this.level.worldWidth-GAME.width,this.player.x-GAME.width*.34));this.camera+=(target-this.camera)*Math.min(1,dt*6);
    if(overlap(this.player.rect(),{x:this.level.goal.x-20,y:this.level.goal.y-15,w:118,h:125})){this.finished=true;this.player.locked=true;this.player.vx=0;this.player.animT=0;this.audio.stop();this.audio.sfx("goal");this.audio.music("victory");this.events.victoryStart?.();}
    this.events.hud?.({score:this.score,stamina:this.player.stamina,hp:this.player.hp,level:this.level.id,cooldowns:this.player.cooldowns,time:this.elapsed});
  }
  finish(){if(this.ended)return;this.ended=true;cancelAnimationFrame(this.raf);this.audio.stop();const bonus=Math.max(0,Math.floor((this.level.timeBonus-this.elapsed)*10));const final=this.score+bonus+this.player.hp*300;this.save.data.playTime+=this.elapsed;this.save.complete(this.level.id,final,this.elapsed);this.events.complete?.({score:final,bonus,next:this.level.id<3?this.level.id+1:null});}
  gameOver(){if(this.ended)return;this.ended=true;cancelAnimationFrame(this.raf);this.audio.stop();this.events.gameOver?.();}
  spawnPetals(){if(Math.random()<.25)this.particles.push({x:this.player.x+20,y:this.player.y+10,vx:(Math.random()-.5)*100,vy:-70-Math.random()*80,t:1.4,c:Math.random()>.5?PALETTE.gold:PALETTE.red2});}
  updateParticles(dt){this.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;p.t-=dt;});this.particles=this.particles.filter(p=>p.t>0);}
  draw(){const c=this.ctx;c.clearRect(0,0,GAME.width,GAME.height);this.drawWorld(c);this.enemies.forEach(e=>e.draw(c,this.camera));this.player.draw(c,this.camera);this.drawGoal(c);this.particles.forEach(p=>{c.globalAlpha=Math.max(0,p.t);c.fillStyle=p.c;c.fillRect(Math.round(p.x-this.camera),Math.round(p.y),6,6);});c.globalAlpha=1;if(DEBUG_COLLISIONS)this.drawDebug(c);if(this.paused)this.overlay(c,"PAUSA","P / ESC para continuar");}
  drawWorld(c){
    const [sky]=this.level.colors;c.fillStyle=sky;c.fillRect(0,0,GAME.width,GAME.height);
    const bg=ASSETS.background;if(bg){const shift=-(this.camera*.1%GAME.width);c.globalAlpha=.92;c.drawImage(bg,shift,-8,GAME.width,405);c.drawImage(bg,shift+GAME.width,-8,GAME.width,405);c.globalAlpha=1;}
    for(const h of this.level.hazards){const x=h.x-this.camera;c.fillStyle="#162238";c.fillRect(x,472,h.w,68);c.fillStyle="#d94c54";for(let s=0;s<h.w;s+=22){c.beginPath();c.moveTo(x+s,486);c.lineTo(x+s+11,462);c.lineTo(x+s+22,486);c.fill();}}
    for(const p of this.level.platforms){const x=p.x-this.camera;if(x>GAME.width||x+p.w<0)continue;c.fillStyle=p.kind==="floor"?"#382b31":"#4b343a";c.fillRect(x,p.y,p.w,p.h);c.fillStyle=PALETTE.gold;c.fillRect(x,p.y,p.w,6);c.fillStyle="#7b626a";for(let b=8;b<p.w;b+=32){c.fillRect(x+b,p.y+15,22,7);c.fillStyle="#2b242b";c.fillRect(x+b+5,p.y+29,22,6);c.fillStyle="#7b626a";}}
  }
  drawGoal(c){const t=performance.now()/1000,index=Math.floor(t*4)%6,x=this.level.goal.x-this.camera-25,y=this.level.goal.y-28+Math.sin(t*3)*4;drawAtlasFrame(c,ASSETS.bouquet,{x:index*362,y:118,w:362,h:470},{x,y,w:126,h:146});}
  drawDebug(c){c.save();c.strokeStyle="#00ff90";c.lineWidth=2;for(const r of [this.player.rect(),...this.enemies.filter(e=>!e.dead).map(e=>e.rect())])c.strokeRect(r.x-this.camera,r.y,r.w,r.h);if(this.player.attack&&this.player.attackIsActive()){const a=this.player.attackRect();c.strokeStyle="#ff3f80";c.strokeRect(a.x-this.camera,a.y,a.w,a.h);}c.restore();}
  overlay(c,title,sub){c.fillStyle="#08101bd9";c.fillRect(0,0,GAME.width,GAME.height);c.textAlign="center";c.fillStyle=PALETTE.gold;c.font="bold 38px monospace";c.fillText(title,GAME.width/2,245);c.fillStyle="#fff";c.font="18px monospace";c.fillText(sub,GAME.width/2,282);}
}
