import { GAME, PALETTE, DEBUG_COLLISIONS, PROJECTILE_REFERENCE_SIZE } from "../config.js";
import { getLevel } from "../data/levels.js";
import { Player } from "../entities/Player.js";
import { Enemy } from "../entities/Enemy.js";
import { Boss } from "../entities/Boss.js";
import { ASSETS, drawAtlasFrame } from "../managers/AssetManager.js";

const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

export class Game {
  constructor(canvas,input,audio,save,events={}){
    this.canvas=canvas;this.ctx=canvas.getContext("2d");this.ctx.imageSmoothingEnabled=false;this.input=input;this.audio=audio;this.save=save;this.events=events;
    this.raf=0;this.last=0;
  }
  start(id){cancelAnimationFrame(this.raf);this.level=getLevel(id);this.boss=this.level.boss?new Boss({x:this.level.goal.x-720}):null;this.enemies=[...this.level.enemies.map(e=>new Enemy(e)),...(this.boss?[this.boss]:[])];this.player=new Player(this.input,this.audio,{costume:this.level.costume,abilities:this.level.abilities});this.camera=0;this.elapsed=0;this.score=0;this.paused=false;this.finished=false;this.defeating=false;this.defeatT=0;this.ended=false;this.victoryT=0;this.particles=[];this.projectiles=[];this.audio.music("game");this.last=performance.now();this.loop(this.last);}
  stop(){this.ended=true;cancelAnimationFrame(this.raf);this.audio.stop();}
  loop=(now)=>{let dt=Math.min((now-this.last)/1000||0,1/30);this.last=now;this.update(dt);this.draw();this.input.clear();if(!this.ended)this.raf=requestAnimationFrame(this.loop);}
  update(dt){
    if(this.input.tap("pause")){this.paused=!this.paused;this.events.pause?.(this.paused);} if(this.input.tap("restart"))return this.start(this.level.id); if(this.paused)return;
    if(this.finished){this.victoryT+=dt;this.player.setAnimation("victory",this.victoryT);this.spawnPetals();this.updateParticles(dt);if(this.victoryT>3.6)this.finish();return;}
    if(this.defeating){this.defeatT+=dt;this.player.updateDefeatPhysics(dt,this.level);this.player.setAnimation("defeat",this.defeatT);if(this.defeatT>1.05&&this.player.onGround)this.gameOver();return;}
    const onHurt=hp=>{this.events.hurt?.(hp);if(hp<=0&&!this.defeating){this.defeating=true;this.player.locked=true;this.player.animT=0;this.audio.stop();this.audio.sfx("defeat");}};
    this.elapsed+=dt;this.player.update(dt,this.level,this.enemies,onHurt);this.enemies.forEach(e=>e.update(dt,this.player,this.level,source=>this.spawnRock(source)));this.updateProjectiles(dt,onHurt);this.updateParticles(dt);
    this.score=Math.max(0,Math.floor(this.player.x/8)+this.enemies.filter(e=>e.dead).length*250+(this.boss?.defeated?2500:0));
    const target=Math.max(0,Math.min(this.level.worldWidth-GAME.width,this.player.x-GAME.width*.34));this.camera+=(target-this.camera)*Math.min(1,dt*6);
    if(overlap(this.player.rect(),{x:this.level.goal.x-20,y:this.level.goal.y-15,w:118,h:125})&&(!this.boss||this.boss.defeated)){this.beginVictory();}
    this.events.hud?.({score:this.score,stamina:this.player.stamina,hp:this.player.hp,level:this.level.id,cooldowns:this.player.cooldowns,abilities:this.level.abilities,boss:this.boss&&!this.boss.defeated?{hp:this.boss.hp,maxHp:this.boss.maxHp}:null,time:this.elapsed});
  }
  finish(){if(this.ended)return;this.ended=true;cancelAnimationFrame(this.raf);this.audio.stop();const bonus=Math.max(0,Math.floor((this.level.timeBonus-this.elapsed)*10));const final=this.score+bonus+this.player.hp*300;this.save.complete(this.level.id,final,this.elapsed);this.events.complete?.({score:final,bonus,next:this.level.id<12?this.level.id+1:null,reward:this.level.reward,world:this.level.world,chapter:this.level.chapter});}
  gameOver(){if(this.ended)return;this.ended=true;cancelAnimationFrame(this.raf);this.audio.stop();this.events.gameOver?.();}
  beginVictory(){
    this.finished=true;this.player.locked=true;this.player.reward=this.level.reward;this.player.vx=0;this.player.vy=0;this.player.setCrouched(false);
    const feet=this.player.y+this.player.h,support=this.level.platforms.filter(p=>this.player.x+this.player.w/2>=p.x&&this.player.x+this.player.w/2<=p.x+p.w&&p.y>=feet-24).sort((a,b)=>a.y-b.y)[0];
    if(support){this.player.y=support.y-this.player.baseH;this.player.h=this.player.baseH;this.player.onGround=true;}
    this.player.animT=0;this.audio.sfx("goal");this.audio.music("victory");this.events.victoryStart?.();
  }
  spawnRock(source){const direction=source.facing||-1;this.projectiles.push({x:source.x+(direction>0?source.w:0)-9,y:418,w:18,h:18,vx:direction*285,t:3,frame:5});this.audio.sfx("fan");}
  updateProjectiles(dt,onHurt){
    for(const p of this.projectiles){p.x+=p.vx*dt;p.t-=dt;p.frame=5+(Math.floor((3-p.t)*10)%2);if(overlap(p,this.player.rect())){p.t=0;this.player.takeDamage(onHurt);this.spawnImpact(p.x,p.y);}}
    this.projectiles=this.projectiles.filter(p=>p.t>0&&p.x>-80&&p.x<this.level.worldWidth+80);
  }
  spawnImpact(x,y){for(let i=0;i<5;i++)this.particles.push({x,y,vx:(Math.random()-.5)*90,vy:-30-Math.random()*55,t:.45,c:i%2?"#917765":"#d0b08a"});}
  spawnPetals(){if(Math.random()<.25)this.particles.push({x:this.player.x+20,y:this.player.y+10,vx:(Math.random()-.5)*100,vy:-70-Math.random()*80,t:1.4,c:Math.random()>.5?PALETTE.gold:PALETTE.red2});}
  updateParticles(dt){this.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;p.t-=dt;});this.particles=this.particles.filter(p=>p.t>0);}
  draw(){const c=this.ctx;c.clearRect(0,0,GAME.width,GAME.height);this.drawWorld(c);this.drawGoal(c);this.enemies.forEach(e=>e.draw(c,this.camera));if(this.finished&&this.level.reward==="regalia")this.drawWornRegalia(c);if(this.player.crouched){this.player.draw(c,this.camera);this.drawProjectiles(c);}else{this.drawProjectiles(c);this.player.draw(c,this.camera);}this.particles.forEach(p=>{c.globalAlpha=Math.max(0,p.t);c.fillStyle=p.c;c.fillRect(Math.round(p.x-this.camera),Math.round(p.y),6,6);});c.globalAlpha=1;if(this.boss&&!this.boss.defeated)this.drawBossBar(c);if(this.finished)this.drawVictoryBanner(c);if(DEBUG_COLLISIONS)this.drawDebug(c);if(this.paused)this.overlay(c,"PAUSA","P / ESC para continuar");}
  drawWorld(c){
    const [sky]=this.level.colors;c.fillStyle=sky;c.fillRect(0,0,GAME.width,GAME.height);
    const bg=ASSETS[this.level.background]||ASSETS.lima;if(bg){const shift=-(this.camera*.1%GAME.width);c.globalAlpha=.92;c.drawImage(bg,shift,-8,GAME.width,405);c.drawImage(bg,shift+GAME.width,-8,GAME.width,405);c.globalAlpha=1;}
    for(const h of this.level.hazards){const count=Math.max(1,Math.ceil(h.w/42));for(let i=0;i<count;i++){const size=Math.min(58,h.w/count+18),frame=(i%3);drawAtlasFrame(c,ASSETS.urbanEnemies,{x:frame*217,y:482,w:217,h:241},{x:Math.round(h.x-this.camera+i*h.w/count-8),y:486-size,w:size,h:size});}}
    for(const p of this.level.platforms){const x=p.x-this.camera;if(x>GAME.width||x+p.w<0)continue;c.fillStyle=p.kind==="floor"?"#382b31":"#4b343a";c.fillRect(x,p.y,p.w,p.h);c.fillStyle=PALETTE.gold;c.fillRect(x,p.y,p.w,6);c.fillStyle="#7b626a";for(let b=8;b<p.w;b+=32){c.fillRect(x+b,p.y+15,22,7);c.fillStyle="#2b242b";c.fillRect(x+b+5,p.y+29,22,6);c.fillStyle="#7b626a";}}
  }
  drawProjectiles(c){for(const p of this.projectiles)drawAtlasFrame(c,ASSETS.urbanEnemies,{x:p.frame*217,y:482,w:217,h:241},{x:Math.round(p.x-this.camera-PROJECTILE_REFERENCE_SIZE*.25),y:Math.round(p.y-PROJECTILE_REFERENCE_SIZE*.25),w:PROJECTILE_REFERENCE_SIZE*1.5,h:PROJECTILE_REFERENCE_SIZE*1.5},p.vx<0);}
  drawGoal(c){
    const t=performance.now()/1000,index=Math.floor(t*4)%6,goal=this.level.goal.x;
    const members=[
      {offset:-178,row:0,size:103,rate:3.4,phase:0},
      {offset:-108,row:1,size:88,rate:2.8,phase:1},
      {offset:105,row:2,size:95,rate:3.1,phase:2},
      {offset:176,row:3,size:94,rate:4.2,phase:3}
    ];
    for(const member of members){
      const frameIndex=(Math.floor(t*member.rate)+member.phase)%4;
      const frame={x:frameIndex*256,y:member.row*256,w:256,h:256};
      const x=Math.round(goal+member.offset-this.camera-member.size/2),y=Math.round(486-member.size);
      drawAtlasFrame(c,ASSETS.goalTuna,frame,{x,y,w:member.size,h:member.size});
    }
    if(this.finished&&this.level.reward!=="flowers")return;
    const x=goal-this.camera-25,y=this.level.goal.y-28+Math.sin(t*3)*4;
    if(this.level.reward==="fan")this.drawFanReward(c,x+62,y+74,t);
    else if(this.level.reward==="guitar")drawAtlasFrame(c,ASSETS.guitarItem,{x:0,y:0,w:887,h:887},{x:x+12,y:y+12,w:105,h:105});
    else if(this.level.reward==="regalia"){
      const image=ASSETS.regalia,frameWidth=image?.naturalWidth/4||543,frame=Math.floor(t*4)%4;
      drawAtlasFrame(c,image,{x:frame*frameWidth,y:0,w:frameWidth,h:image?.naturalHeight||724},{x:x-4,y:y-10,w:142,h:142});
    }else drawAtlasFrame(c,ASSETS.bouquet,{x:index*362,y:118,w:362,h:470},{x,y,w:126,h:146});
  }
  drawFanReward(c,x,y,t){c.save();c.translate(x,y);c.rotate(Math.sin(t*3)*.08);c.fillStyle="#d82945";c.strokeStyle="#ffd36a";c.lineWidth=3;c.beginPath();c.moveTo(0,28);c.arc(0,28,42,Math.PI*1.08,Math.PI*1.92);c.closePath();c.fill();c.stroke();for(let i=-3;i<=3;i++){const angle=-Math.PI/2+i*.18;c.beginPath();c.moveTo(0,28);c.lineTo(Math.cos(angle)*38,28+Math.sin(angle)*38);c.stroke();}c.restore();}
  drawWornRegalia(c){const image=ASSETS.regalia;if(!image)return;const frameWidth=image.naturalWidth/4,frame=Math.floor(this.victoryT*4)%4,size=92;drawAtlasFrame(c,image,{x:frame*frameWidth,y:0,w:frameWidth,h:image.naturalHeight},{x:Math.round(this.player.x-this.camera+this.player.w/2-size/2),y:Math.round(this.player.y+this.player.h-size+5),w:size,h:size});}
  drawBossBar(c){const width=360,x=(GAME.width-width)/2,y=18;c.fillStyle="#160d18dd";c.fillRect(x-5,y-5,width+10,32);c.fillStyle="#fff2cf";c.font='12px "Press Start 2P", monospace';c.textAlign="center";c.fillText("TUNO MAYOR",GAME.width/2,y+8);c.fillStyle="#3d2531";c.fillRect(x,y+15,width,10);c.fillStyle="#c72c48";c.fillRect(x,y+15,width*(this.boss.hp/this.boss.maxHp),10);c.strokeStyle="#eac75b";c.strokeRect(x,y+15,width,10);}
  drawVictoryBanner(c){
    const intro=Math.min(1,this.victoryT/.32),ease=1-Math.pow(1-intro,3),scale=.82+.18*ease;
    const x=Math.round(this.level.goal.x-this.camera),y=Math.round(this.level.goal.y-72);
    c.save();c.globalAlpha=ease;c.translate(x,y);c.scale(scale,scale);c.textAlign="center";c.textBaseline="middle";
    c.font='bold 27px "Press Start 2P", monospace';c.lineJoin="round";c.lineWidth=8;c.strokeStyle="#27171d";c.strokeText("Aupa Tuna",0,0);
    c.lineWidth=3;c.strokeStyle="#a8273d";c.strokeText("Aupa Tuna",0,0);c.fillStyle=PALETTE.cream;c.fillText("Aupa Tuna",0,0);c.restore();
  }
  drawDebug(c){c.save();c.strokeStyle="#00ff90";c.lineWidth=2;for(const r of [this.player.rect(),...this.enemies.filter(e=>!e.dead).map(e=>e.rect()),...this.projectiles])c.strokeRect(r.x-this.camera,r.y,r.w,r.h);c.strokeStyle="#ff935e";for(const h of this.level.hazards)c.strokeRect(h.x-this.camera,436,h.w,50);if(this.player.attack&&this.player.attackIsActive()){const a=this.player.attackRect();c.strokeStyle="#ff3f80";c.strokeRect(a.x-this.camera,a.y,a.w,a.h);}c.restore();}
  overlay(c,title,sub){c.fillStyle="#08101bd9";c.fillRect(0,0,GAME.width,GAME.height);c.textAlign="center";c.fillStyle=PALETTE.gold;c.font="bold 38px monospace";c.fillText(title,GAME.width/2,245);c.fillStyle="#fff";c.font="18px monospace";c.fillText(sub,GAME.width/2,282);}
}
