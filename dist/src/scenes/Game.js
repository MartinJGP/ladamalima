import { GAME, PALETTE } from "../config.js";
import { getLevel } from "../data/levels.js";
import { Player } from "../entities/Player.js";
import { Enemy } from "../entities/Enemy.js";

const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

export class Game {
  constructor(canvas,input,audio,save,events={}){
    this.canvas=canvas;this.ctx=canvas.getContext("2d");this.ctx.imageSmoothingEnabled=false;this.input=input;this.audio=audio;this.save=save;this.events=events;
    this.bg=new Image();this.bg.src="./assets/backgrounds/plaza-mayor.png";this.raf=0;this.last=0;
  }
  start(id){cancelAnimationFrame(this.raf);this.level=getLevel(id);this.enemies=this.level.enemies.map(e=>new Enemy(e));this.player=new Player(this.input,this.audio);this.camera=0;this.elapsed=0;this.score=0;this.paused=false;this.finished=false;this.ended=false;this.victoryT=0;this.particles=[];this.audio.music("game");this.last=performance.now();this.loop(this.last);}
  stop(){this.ended=true;cancelAnimationFrame(this.raf);this.audio.stop();}
  loop=(now)=>{let dt=Math.min((now-this.last)/1000||0,1/30);this.last=now;this.update(dt);this.draw();this.input.clear();if(!this.ended)this.raf=requestAnimationFrame(this.loop);}
  update(dt){
    if(this.input.tap("pause")){this.paused=!this.paused;this.events.pause?.(this.paused);} if(this.input.tap("restart"))return this.start(this.level.id); if(this.paused)return;
    if(this.finished){this.victoryT+=dt;this.spawnPetals();this.updateParticles(dt);if(this.victoryT>3.6)this.finish();return;}
    this.elapsed+=dt;this.player.update(dt,this.level,this.enemies,hp=>{this.events.hurt?.(hp);if(hp<=0)this.gameOver();});this.enemies.forEach(e=>e.update(dt,this.player));
    this.score=Math.max(0,Math.floor(this.player.x/8)+this.enemies.filter(e=>e.dead).length*250);
    const target=Math.max(0,Math.min(this.level.worldWidth-GAME.width,this.player.x-GAME.width*.34));this.camera+=(target-this.camera)*Math.min(1,dt*6);
    if(overlap(this.player.rect(),{x:this.level.goal.x,y:this.level.goal.y,w:74,h:108})){this.finished=true;this.player.locked=true;this.player.vx=0;this.audio.stop();this.audio.sfx("goal");this.audio.music("victory");this.events.victoryStart?.();}
    this.events.hud?.({score:this.score,stamina:this.player.stamina,hp:this.player.hp,level:this.level.id,cooldowns:this.player.cooldowns,time:this.elapsed});
  }
  finish(){if(this.ended)return;this.ended=true;cancelAnimationFrame(this.raf);this.audio.stop();const bonus=Math.max(0,Math.floor((this.level.timeBonus-this.elapsed)*10));const final=this.score+bonus+this.player.hp*300;this.save.data.playTime+=this.elapsed;this.save.complete(this.level.id,final,this.elapsed);this.events.complete?.({score:final,bonus,next:this.level.id<3?this.level.id+1:null});}
  gameOver(){if(this.ended)return;this.ended=true;cancelAnimationFrame(this.raf);this.audio.stop();this.events.gameOver?.();}
  spawnPetals(){if(Math.random()<.25)this.particles.push({x:this.player.x+20,y:this.player.y+10,vx:(Math.random()-.5)*100,vy:-70-Math.random()*80,t:1.4,c:Math.random()>.5?PALETTE.gold:PALETTE.red2});}
  updateParticles(dt){this.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;p.t-=dt;});this.particles=this.particles.filter(p=>p.t>0);}
  draw(){const c=this.ctx;c.clearRect(0,0,GAME.width,GAME.height);this.drawWorld(c);this.enemies.forEach(e=>e.draw(c,this.camera));if(this.finished)this.drawVictoryPlayer(c);else this.player.draw(c,this.camera);this.drawGoal(c);this.particles.forEach(p=>{c.globalAlpha=Math.max(0,p.t);c.fillStyle=p.c;c.fillRect(Math.round(p.x-this.camera),Math.round(p.y),6,6);});c.globalAlpha=1;if(this.paused)this.overlay(c,"PAUSA","P / ESC para continuar");}
  drawWorld(c){
    const [sky,ochre,green]=this.level.colors;c.fillStyle=sky;c.fillRect(0,0,GAME.width,GAME.height);
    if(this.bg.complete){const shift=-(this.camera*.08%(GAME.width));c.globalAlpha=.42;c.drawImage(this.bg,shift,0,GAME.width,370);c.drawImage(this.bg,shift+GAME.width,0,GAME.width,370);c.globalAlpha=1;}
    c.fillStyle="#9aa7b6aa";for(let i=0;i<15;i++){const x=(i*170-this.camera*.18)%2700;c.fillRect(x,255+(i%3)*18,130,120);}
    c.fillStyle=ochre;for(let i=0;i<18;i++){const x=(i*220-this.camera*.42)%4100;c.fillRect(x,320-(i%4)*20,170,170);c.fillStyle="#252f3c";for(let w=0;w<4;w++)c.fillRect(x+18+w*35,350,14,24);c.fillStyle=ochre;}
    c.fillStyle=green;for(let i=0;i<24;i++){const x=(i*190-this.camera*.7)%4700;c.fillRect(x+38,330,10,156);c.beginPath();c.arc(x+43,325,38,0,Math.PI*2);c.fill();}
    for(const h of this.level.hazards){const x=h.x-this.camera;c.fillStyle="#162238";c.fillRect(x,472,h.w,68);c.fillStyle="#d94c54";for(let s=0;s<h.w;s+=22){c.beginPath();c.moveTo(x+s,486);c.lineTo(x+s+11,462);c.lineTo(x+s+22,486);c.fill();}}
    for(const p of this.level.platforms){const x=p.x-this.camera;if(x>GAME.width||x+p.w<0)continue;c.fillStyle=p.kind==="floor"?"#382b31":"#554046";c.fillRect(x,p.y,p.w,p.h);c.fillStyle=PALETTE.gold;c.fillRect(x,p.y,p.w,6);c.fillStyle="#6e5960";for(let b=12;b<p.w;b+=38)c.fillRect(x+b,p.y+16,20,8);}
  }
  drawGoal(c){const x=this.level.goal.x-this.camera,y=this.level.goal.y,t=performance.now()/500;c.save();c.translate(x+35,y+38);for(let i=0;i<10;i++){c.rotate(Math.PI*2/10);c.fillStyle=i%2?"#ffd83e":"#f0b92a";c.fillRect(12,-7,24,14);}c.fillStyle="#75492b";c.beginPath();c.arc(0,0,15,0,Math.PI*2);c.fill();c.globalAlpha=.45+.25*Math.sin(t);c.strokeStyle="#fff3a6";c.lineWidth=5;c.beginPath();c.arc(0,0,52+Math.sin(t)*6,0,Math.PI*2);c.stroke();c.restore();}
  drawVictoryPlayer(c){this.player.draw(c,this.camera);const x=Math.round(this.player.x-this.camera),y=this.player.y,phase=Math.min(1,this.victoryT/2.6),lift=Math.max(0,1-phase*1.8);c.save();c.translate(x+30,y+18);c.rotate(Math.sin(phase*Math.PI*4)*.35);c.fillStyle=PALETTE.red2;c.beginPath();c.moveTo(0,0);c.lineTo(36,-30-35*lift);c.lineTo(28,10-20*lift);c.closePath();c.fill();c.restore();}
  overlay(c,title,sub){c.fillStyle="#08101bd9";c.fillRect(0,0,GAME.width,GAME.height);c.textAlign="center";c.fillStyle=PALETTE.gold;c.font="bold 38px monospace";c.fillText(title,GAME.width/2,245);c.fillStyle="#fff";c.font="18px monospace";c.fillText(sub,GAME.width/2,282);}
}
