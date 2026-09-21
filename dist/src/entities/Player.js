import { GAME } from "../config.js";
import { ASSETS, drawAtlasFrame } from "../managers/AssetManager.js";

const overlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
const rects = (y,height,ranges) => ranges.map(([a,b])=>({x:Math.max(0,a-7),y,w:b-a+15,h:height}));

const HERO = {
  idle: rects(0,128,[[73,156],[206,289],[340,426],[476,561],[617,701],[753,838],[889,975]]),
  walk: rects(128,150,[[73,173],[207,309],[340,441],[485,601],[628,739],[765,879]]),
  run: rects(128,150,[[908,1021],[1048,1163],[1200,1312],[1354,1484]]),
  jump: rects(128,150,[[1200,1312],[1354,1484]]), fall: rects(128,150,[[1048,1163],[908,1021]]),
  crouch: rects(278,112,[[58,187],[233,355]]),
  skirt: rects(390,150,[[44,214],[232,356],[377,538],[575,761],[787,958],[980,1149],[1168,1321],[1354,1507]]),
  fan: rects(535,155,[[49,203],[233,433],[461,683],[694,921],[982,1225],[1271,1444]]),
  hurt: rects(690,135,[[49,146],[154,295]]), defeat: rects(690,135,[[154,295],[374,512],[598,738],[803,1013]]),
  victory: rects(815,209,[[45,185],[224,364],[400,520],[545,678],[700,825],[861,986],[1010,1157],[1190,1307],[1344,1495]])
};
const SPEED = { idle:5, walk:9, run:13, jump:4, fall:4, crouch:3, skirt:18, fan:20, hurt:8, defeat:5, victory:8 };

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
    if(this.input.tap("jump")&&this.onGround&&!crouch){this.vy=-650;this.onGround=false;this.audio.sfx("jump");this.animT=0;}
    if(this.input.tap("skirt")&&!this.cooldowns.skirt){this.attack={type:"skirt",t:.44,duration:.44};this.cooldowns.skirt=.7;this.audio.sfx("skirt");this.animT=0;}
    if(this.input.tap("fan")&&!this.cooldowns.fan){this.attack={type:"fan",t:.36,duration:.36};this.cooldowns.fan=.55;this.audio.sfx("fan");this.animT=0;}
    if(this.attack){this.attack.t-=dt;if(this.attack.t<=0)this.attack=null;}
    this.vy += GAME.gravity*dt; const oldY=this.y; this.x+=this.vx*dt; this.x=Math.max(0,Math.min(level.worldWidth-this.w,this.x)); this.y+=this.vy*dt; this.onGround=false;
    for(const p of level.platforms){ if(this.x+this.w>p.x&&this.x<p.x+p.w&&oldY+this.h<=p.y+12&&this.y+this.h>=p.y&&this.vy>=0){this.y=p.y-this.h;this.vy=0;this.onGround=true;} }
    for(const h of level.hazards){if(overlap(this.rect(),{x:h.x,y:472,w:h.w,h:68}))this.takeDamage(onHurt);}
    for(const e of enemies){
      if(e.dead)continue;
      if(this.attack&&this.attackIsActive()&&overlap(this.attackRect(),e.rect())){if(e.hit(this.attack.type==="skirt"?2:1,this.facing))this.audio.sfx("hit");}
      else if(e.canDamage?.()&&overlap(this.rect(),e.attackRect?.()||e.rect()))this.takeDamage(onHurt);
    }
    if(this.y>GAME.height+100)this.takeDamage(onHurt,true);
    const next=this.attack?this.attack.type:this.inv>.82?"hurt":crouch?"crouch":!this.onGround?(this.vy<0?"jump":"fall"):Math.abs(this.vx)>230?"run":Math.abs(this.vx)>12?"walk":"idle";
    if(next!==this.anim){this.anim=next;this.animT=0;}
  }
  attackIsActive(){if(!this.attack)return false;const progress=1-this.attack.t/this.attack.duration;return progress>.28&&progress<.78;}
  takeDamage(cb,fall=false){if(this.inv||this.locked)return;this.hp--;this.inv=1.2;this.anim="hurt";this.animT=0;this.vy=-360;this.vx=-this.facing*180;this.audio.sfx("hurt");if(fall){this.x=Math.max(80,this.x-160);this.y=330;}cb(this.hp);}
  attackRect(){const reach=this.attack?.type==="fan"?96:76;return{x:this.facing>0?this.x+this.w:this.x-reach,y:this.y+13,w:reach,h:60};}
  rect(){return{x:this.x,y:this.y,w:this.w,h:this.h};}
  setAnimation(name,time=0){if(this.anim!==name)this.animT=time;this.anim=name;}
  draw(ctx,camera){
    const frames=HERO[this.anim]||HERO.idle; const speed=SPEED[this.anim]||6;
    let index=Math.floor(this.animT*speed); index=(this.anim==="defeat"||this.anim==="victory")?Math.min(frames.length-1,index):index%frames.length;
    const crouched=this.anim==="crouch", dw=crouched?104:118, dh=crouched?86:118;
    const dx=Math.round(this.x-camera+this.w/2-dw/2),dy=Math.round(this.y+this.h-dh);
    const alpha=this.inv>0&&Math.floor(this.inv*12)%2?.45:1;
    drawAtlasFrame(ctx,ASSETS.heroine,frames[index],{x:dx,y:dy,w:dw,h:dh},this.facing<0,alpha);
  }
}
