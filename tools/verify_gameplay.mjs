import assert from "node:assert/strict";
import { Player } from "../game/src/entities/Player.js";
import { Enemy } from "../game/src/entities/Enemy.js";
import { epilogueSceneAt } from "../game/src/scenes/Epilogue.js";

const floorLevel={worldWidth:1200,platforms:[{x:0,y:486,w:1200,h:54}],hazards:[]};
const audio={sfx(){}};
const held=new Set();
const tapped=new Set();
const input={
  is(action){return held.has(action);},
  tap(action){const active=tapped.has(action);tapped.delete(action);return active;}
};

const player=new Player(input,audio);
const startBottom=player.y+player.h;
held.add("crouch");
for(let i=0;i<12;i++)player.update(1/60,floorLevel,[],()=>{});
assert.equal(player.crouchProgress,1);
assert.equal(player.h,player.crouchH);
assert.equal(player.y+player.h,startBottom);
held.delete("crouch");
for(let i=0;i<12;i++)player.update(1/60,floorLevel,[],()=>{});
assert.equal(player.crouchProgress,0);
assert.equal(player.h,player.baseH);
assert.equal(player.y+player.h,startBottom);

player.y=180;player.vy=-120;player.onGround=false;
for(let i=0;i<180&&!player.onGround;i++)player.updateDefeatPhysics(1/60,floorLevel);
assert.equal(player.y,404);
assert.equal(player.onGround,true);

player.reset();
tapped.add("jump");player.update(1/60,floorLevel,[],()=>{});
assert.equal(player.onGround,false);
assert.ok(player.vy<0);
tapped.add("jump");player.update(1/60,floorLevel,[],()=>{});
assert.equal(player.airJumpUsed,true);
assert.ok(player.cooldowns.doubleJump>1.9);
const doubleJumpVelocity=player.vy;
tapped.add("jump");player.update(1/60,floorLevel,[],()=>{});
assert.ok(player.vy>doubleJumpVelocity,"A third press must not trigger another jump");
for(let i=0;i<180&&!player.onGround;i++)player.update(1/60,floorLevel,[],()=>{});
assert.equal(player.onGround,true);
assert.equal(player.airJumpUsed,false);
assert.ok(player.cooldowns.doubleJump>0);
for(let i=0;i<120;i++)player.update(1/60,floorLevel,[],()=>{});
assert.equal(player.cooldowns.doubleJump,0);

const hurdle={...floorLevel,hazards:[{x:300,w:110}]};
player.reset();player.x=210;player.vx=310;
held.add("run");held.add("right");tapped.add("jump");
let hits=0;
for(let i=0;i<95;i++)player.update(1/60,hurdle,[],()=>{hits++;});
held.delete("run");held.delete("right");
assert.equal(hits,0,"A running jump must clear a triple-column obstacle");

const target={x:300,y:290,w:42,h:82};
const stable=new Enemy({x:300,type:"guard"});
const stableX=stable.x;
for(let i=0;i<90;i++)stable.update(1/60,target,floorLevel,()=>{});
assert.equal(stable.x,stableX);

const falling=new Enemy({x:500,type:"guard"});
falling.y=110;falling.onGround=false;falling.dying=true;falling.deathT=0;
for(let i=0;i<180&&!falling.dead;i++)falling.update(1/60,target,floorLevel,()=>{});
assert.equal(falling.y,406);
assert.equal(falling.onGround,true);
assert.equal(falling.dead,true);

assert.deepEqual([0,1.5,8.5,16.5,23.5,100000].map(t=>epilogueSceneAt(t).name),["black","shots","running","poses","pyramid","pyramid"]);

console.log("OK: crouch, double-jump cooldown, triple-column hurdle, airborne deaths, platform dead-zone and epilogue sequence.");
