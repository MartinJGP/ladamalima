import { GAME, PLAYER_VISUAL_SCALE, PLAYER_REFERENCE_HEIGHT } from "../config.js";
import { ASSETS, drawAtlasFrame } from "../managers/AssetManager.js";

const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const CW=200,CH=200,cell=(col,row)=>({x:col*CW,y:row*CH,w:CW,h:CH});
const LARGE=256,largeCell=(col,row)=>({x:col*LARGE,y:row*LARGE,w:LARGE,h:LARGE});
const VICTORY_W=256;
const DEFEAT_FRAMES=[largeCell(0,0),largeCell(1,0)];
export const ATLAS_TO_WORLD=PLAYER_REFERENCE_HEIGHT*1.18*PLAYER_VISUAL_SCALE/CW;
const NORMAL_DRAW_SIZE=CW*ATLAS_TO_WORLD;
const LARGE_DRAW_SIZE=LARGE*ATLAS_TO_WORLD;
const STATES={
  idle:[cell(0,0),cell(1,0)],walk:[6,7,8,9].map(c=>cell(c,0)),run:[6,7,8,9].map(c=>cell(c,0)),
  jump:[cell(0,1),cell(1,1),cell(2,1)],fall:[cell(3,1)],land:[cell(4,1),cell(5,1)],
  hurt:[cell(8,1),cell(9,1)],
  defeat:[cell(6,3),cell(7,3)],
  victory:Array.from({length:8},(_,i)=>({x:i*VICTORY_W,y:0,w:VICTORY_W,h:256}))
};
const ATTACK_FRAMES={
  skirt:[largeCell(0,0),largeCell(1,0),largeCell(2,0)],
  fan:[largeCell(0,1),largeCell(1,1),largeCell(2,1)]
};
const GUITAR_FRAMES=Array.from({length:10},(_,i)=>largeCell(i%5,Math.floor(i/5)));
const CROUCH_FRAMES=Array.from({length:8},(_,i)=>largeCell(i%4,Math.floor(i/4)));
const CROUCH_IDLE_FRAMES=Array.from({length:4},(_,i)=>largeCell(i,0));
const SPEED={idle:3,walk:9,run:14,jump:7,fall:1,land:12,hurt:8,guitar:6.8,defeat:3,victory:3.2};

export class Player{
  constructor(input,audio,options={}){this.input=input;this.audio=audio;this.costume=options.costume||"tuna";this.abilities={skirt:true,fan:true,guitar:true,...options.abilities};this.reward=null;this.reset();}
  reset(){Object.assign(this,{x:110,y:404,w:42,h:82,baseH:82,crouchH:48,crouched:false,crouchProgress:0,crouchTarget:0,vx:0,vy:0,onGround:true,airJumpUsed:false,facing:1,stamina:100,hp:3,inv:0,attack:null,cooldowns:{skirt:0,fan:0,guitar:0,doubleJump:0},guitarCooldown:8,anim:"idle",animT:0,landingT:0,locked:false});}
  update(dt,level,enemies,onHurt){
    this.inv=Math.max(0,this.inv-dt);for(const k of Object.keys(this.cooldowns))this.cooldowns[k]=Math.max(0,this.cooldowns[k]-dt);this.animT+=dt;this.landingT=Math.max(0,this.landingT-dt);
    if(this.locked){this.vx*=.82;return;}
    const left=this.input.is("left"),right=this.input.is("right");const wantsCrouch=this.input.is("crouch")&&this.onGround&&!this.attack;this.updateCrouch(dt,wantsCrouch);
    const running=this.input.is("run")&&this.stamina>1&&!this.crouched&&!this.attack;const dir=(right?1:0)-(left?1:0);const max=running?310:190;
    if(dir&&!this.crouched&&this.attack?.type!=="guitar"){this.vx+=dir*(running?1450:1120)*dt;this.vx=Math.max(-max,Math.min(max,this.vx));this.facing=dir;}else this.vx*=Math.pow(.0008,dt);
    if(running&&dir)this.stamina=Math.max(0,this.stamina-26*dt);else this.stamina=Math.min(100,this.stamina+18*dt);
    if(this.input.tap("jump")&&!this.crouched&&!this.attack){
      if(this.onGround){this.vy=-650;this.onGround=false;this.airJumpUsed=false;this.audio.sfx("jump");this.setAnim("jump");}
      else if(!this.airJumpUsed&&!this.cooldowns.doubleJump){this.vy=-600;this.airJumpUsed=true;this.cooldowns.doubleJump=2;this.audio.sfx("jump");this.setAnimation("jump");}
    }
    if(this.abilities.skirt&&this.input.tap("skirt")&&!this.cooldowns.skirt&&!this.crouched){this.beginAttack("skirt",.31,.48,"skirt");}
    if(this.abilities.fan&&this.input.tap("fan")&&!this.cooldowns.fan&&!this.crouched){this.beginAttack("fan",.43,.62,"fan");}
    if(this.abilities.guitar&&this.input.tap("guitar")&&!this.cooldowns.guitar&&!this.crouched&&this.onGround){this.beginAttack("guitar",1.46,this.guitarCooldown,"skirt");}
    if(this.attack){this.attack.t-=dt;if(this.attack.t<=0){this.attack=null;this.setAnim("idle");}}
    const oldY=this.y,wasGrounded=this.onGround,fallSpeed=this.vy;this.vy+=GAME.gravity*dt;this.x+=this.vx*dt;this.x=Math.max(0,Math.min(level.worldWidth-this.w,this.x));this.y+=this.vy*dt;this.onGround=false;
    for(const p of level.platforms){if(this.x+this.w>p.x&&this.x<p.x+p.w&&oldY+this.h<=p.y+12&&this.y+this.h>=p.y&&this.vy>=0){this.y=p.y-this.h;this.vy=0;this.onGround=true;}}
    if(this.onGround)this.airJumpUsed=false;
    if(!wasGrounded&&this.onGround&&fallSpeed>180){this.landingT=.16;this.setAnim("land");}
    for(const h of level.hazards)if(overlap(this.rect(),{x:h.x+6,y:451,w:h.w-12,h:35}))this.takeDamage(onHurt);
    for(const e of enemies){if(e.dead)continue;if(this.attack&&this.attackIsActive()&&overlap(this.attackRect(),e.rect())){if(e.hit(this.attackDamage(),this.facing,this.attack.type))this.audio.sfx("hit");}else if(e.canDamage?.()&&overlap(this.rect(),e.attackRect?.()||e.rect()))this.takeDamage(onHurt);}
    if(this.y>GAME.height+100)this.takeDamage(onHurt,true);
    const next=this.attack?this.attack.type:this.inv>.82?"hurt":this.landingT>0?"land":this.crouched?"crouch":!this.onGround?(this.vy<0?"jump":"fall"):Math.abs(this.vx)>230?"run":Math.abs(this.vx)>12?"walk":"idle";this.setAnim(next);
  }
  beginAttack(type,duration,cooldown,sound){this.attack={type,t:duration,duration};this.cooldowns[type]=cooldown;this.audio.sfx(sound);this.setAnim(type);}
  updateCrouch(dt,wantsCrouch){
    this.crouchTarget=wantsCrouch?1:0;
    const before=this.crouchProgress,speed=5.2;
    this.crouchProgress=Math.max(0,Math.min(1,before+Math.sign(this.crouchTarget-before)*speed*dt));
    if(Math.abs(this.crouchTarget-this.crouchProgress)<.02)this.crouchProgress=this.crouchTarget;
    const bottom=this.y+this.h;
    this.crouched=this.crouchProgress>.02;
    this.h=Math.round(this.baseH-(this.baseH-this.crouchH)*Math.min(1,this.crouchProgress*1.15));
    this.y=bottom-this.h;
  }
  setCrouched(value){
    const bottom=this.y+this.h;
    this.crouchProgress=value?1:0;this.crouchTarget=this.crouchProgress;this.crouched=value;
    this.h=value?this.crouchH:this.baseH;this.y=bottom-this.h;
  }
  updateDefeatPhysics(dt,level){
    const oldY=this.y;
    this.vx*=Math.pow(.02,dt);this.vy+=GAME.gravity*dt;
    this.x=Math.max(0,Math.min(level.worldWidth-this.w,this.x+this.vx*dt));
    this.y+=this.vy*dt;this.onGround=false;
    for(const p of level.platforms){
      if(this.x+this.w>p.x&&this.x<p.x+p.w&&oldY+this.h<=p.y+12&&this.y+this.h>=p.y&&this.vy>=0){
        this.y=p.y-this.h;this.vy=0;this.onGround=true;break;
      }
    }
  }
  attackProgress(){return this.attack?1-this.attack.t/this.attack.duration:0;}
  attackIsActive(){const p=this.attackProgress();if(this.attack?.type==="guitar")return p>=.60&&p<=.71;if(this.attack?.type==="fan")return p>=.38&&p<=.78;return p>=.30&&p<=.73;}
  attackDamage(){return this.attack?.type==="guitar"?5:this.attack?.type==="fan"?1.35:2;}
  takeDamage(cb,fall=false){if(this.inv||this.locked)return;this.hp--;this.inv=1.2;this.setAnim("hurt");this.vy=-360;this.vx=-this.facing*180;this.audio.sfx("hurt");if(fall){this.x=Math.max(80,this.x-160);this.y=330;}cb(this.hp);}
  attackRect(){const type=this.attack?.type;if(type==="guitar")return{x:this.x-45,y:this.y+36,w:132,h:46};const reach=type==="fan"?104:66;return{x:this.facing>0?this.x+this.w:this.x-reach,y:this.y+17,w:reach,h:58};}
  rect(){return{x:this.x,y:this.y,w:this.w,h:this.h};}
  setAnim(name,reset=true){if(this.anim!==name){this.anim=name;if(reset)this.animT=0;}}
  setAnimation(name,time=0){this.anim=name;this.animT=time;}
  draw(ctx,camera){
    const costumeAssets=this.costume==="aspirant"
      ?{heroine:ASSETS.heroineAspirant,attacks:ASSETS.attacksAspirant,crouch:ASSETS.crouchAspirant,crouchIdle:ASSETS.crouchIdleAspirant,victory:ASSETS.victoryAspirant,defeat:ASSETS.defeatAspirant}
      :this.costume==="novice"
        ?{heroine:ASSETS.heroineNovice,attacks:ASSETS.attacksNovice,crouch:ASSETS.crouchNovice,crouchIdle:ASSETS.crouchIdleNovice,victory:ASSETS.victoryNovice,defeat:ASSETS.defeatNovice}
        :{heroine:ASSETS.heroine,attacks:ASSETS.attacks,crouch:ASSETS.crouch,crouchIdle:ASSETS.crouchIdle,victory:ASSETS.victory,defeat:ASSETS.defeat};
    let frames=STATES[this.anim]||STATES.idle,image=this.anim==="victory"?costumeAssets.victory:costumeAssets.heroine,size=this.anim==="victory"?LARGE_DRAW_SIZE:NORMAL_DRAW_SIZE;
    let index=Math.floor(this.animT*(SPEED[this.anim]||6));
    if(this.anim==="skirt"||this.anim==="fan"){frames=ATTACK_FRAMES[this.anim];image=costumeAssets.attacks;size=LARGE_DRAW_SIZE;index=Math.min(frames.length-1,Math.floor(this.attackProgress()*frames.length));}
    else if(this.anim==="guitar"){
      frames=GUITAR_FRAMES;image=ASSETS.guitarSpecial;size=LARGE_DRAW_SIZE;index=Math.min(frames.length-1,Math.floor(this.attackProgress()*frames.length));
    }
    else if(this.anim==="defeat"){
      frames=DEFEAT_FRAMES;image=costumeAssets.defeat;size=LARGE_DRAW_SIZE;index=Math.min(frames.length-1,index);
    }
    else if(this.anim==="crouch"&&this.crouchProgress>=1&&this.crouchTarget===1){
      frames=CROUCH_IDLE_FRAMES;image=costumeAssets.crouchIdle;size=LARGE_DRAW_SIZE;index=Math.floor(this.animT*4.2)%frames.length;
    }
    else if(this.anim==="crouch"){frames=CROUCH_FRAMES;image=costumeAssets.crouch;size=LARGE_DRAW_SIZE;index=Math.min(7,Math.round(this.crouchProgress*7));}
    else index=(this.anim==="defeat"||this.anim==="victory")?Math.min(frames.length-1,index):index%frames.length;
    const bottom=this.y+this.h,dx=Math.round(this.x-camera+this.w/2-size/2),dy=Math.round(bottom-size);
    const blink=this.inv>0&&Math.floor(this.inv*12)%2,alpha=blink ? .45 : 1,flip=this.facing<0;
    drawAtlasFrame(ctx,image,frames[index],{x:dx,y:dy,w:size,h:size},flip,alpha);
  }
}
