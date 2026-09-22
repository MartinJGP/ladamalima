import assert from "node:assert/strict";
import { PLAYER_VISUAL_SCALE, PLAYER_REFERENCE_HEIGHT, NORMAL_ENEMY_REFERENCE_HEIGHT, SMALL_ENEMY_REFERENCE_HEIGHT, PROJECTILE_REFERENCE_SIZE } from "../game/src/config.js";
import { LEVELS, getLevel } from "../game/src/data/levels.js";
import { Player } from "../game/src/entities/Player.js";
import { Enemy } from "../game/src/entities/Enemy.js";
import { Game } from "../game/src/scenes/Game.js";
import { SaveManager } from "../game/src/managers/SaveManager.js";
import { InputManager } from "../game/src/managers/InputManager.js";

const input={is:()=>false,tap:()=>false};
const audio={sfx:()=>{},music:()=>{},stop:()=>{}};

assert.equal(PLAYER_VISUAL_SCALE,1);
assert.ok(PLAYER_REFERENCE_HEIGHT>NORMAL_ENEMY_REFERENCE_HEIGHT);
assert.ok(NORMAL_ENEMY_REFERENCE_HEIGHT>SMALL_ENEMY_REFERENCE_HEIGHT);
assert.ok(SMALL_ENEMY_REFERENCE_HEIGHT>PROJECTILE_REFERENCE_SIZE);
assert.ok(LEVELS.every(level=>level.enemies.some(enemy=>enemy.type==="thrower")));
const clonedLevel=getLevel(1);clonedLevel.platforms[0].x=999;
assert.notEqual(LEVELS[0].platforms[0].x,999,"el nivel debe clonarse sin depender de structuredClone");

const player=new Player(input,audio),feet=player.y+player.h;
player.setCrouched(true);
assert.equal(player.y+player.h,feet,"agacharse debe conservar el anclaje de pies");
assert.equal(player.h,player.crouchH);
player.attack={type:"skirt",t:.15,duration:.31};
const skirt={damage:player.attackDamage(),range:player.attackRect().w};
player.attack={type:"fan",t:.2,duration:.43};
const fan={damage:player.attackDamage(),range:player.attackRect().w};
assert.ok(fan.damage<skirt.damage&&fan.range>skirt.range,"el abanico debe ser más débil y largo");
player.attack={type:"guitar",t:.5,duration:1.46};
assert.equal(player.attackIsActive(),true,"la guitarra debe dañar en su frame de impacto");
player.attack.t=1.2;
assert.equal(player.attackIsActive(),false,"la anticipación de guitarra no debe dañar");

const pigeon=new Enemy({x:300,type:"pigeon"});
assert.equal(pigeon.y+pigeon.h,486,"las patas de la paloma deben apoyar en el suelo");
const thrower=new Enemy({x:500,type:"thrower"});
let throws=0;
const testLevel={worldWidth:1000,platforms:[{x:0,y:486,w:1000,h:54}]};
for(let i=0;i<240;i++)thrower.update(1/60,{x:100,y:404,w:42,h:82},testLevel,()=>throws++);
assert.ok(throws>=1,"el lanzador debe preparar y lanzar una piedra");

function projectileTest(crouched){
  const p=new Player(input,audio);if(crouched)p.setCrouched(true);
  const game=Object.create(Game.prototype);Object.assign(game,{player:p,particles:[],level:{worldWidth:1000},projectiles:[{x:p.x,y:418,w:18,h:18,vx:0,t:1,frame:5}]});
  game.updateProjectiles(1/60,()=>{});return p.hp;
}
assert.equal(projectileTest(false),2,"la piedra debe golpear a la protagonista de pie");
assert.equal(projectileTest(true),3,"la piedra debe pasar por encima al agacharse");

const saves=new SaveManager();saves.newGame();let rankingRequests=0;
globalThis.fetch=async()=>{rankingRequests++;return new Response(JSON.stringify({ok:true}),{status:201,headers:{"content-type":"application/json"}});};
saves.complete(1,1000,20);saves.complete(2,1200,25);saves.complete(3,1500,30);
assert.equal(rankingRequests,0,"completar niveles no debe publicar el ranking automáticamente");
await saves.submitFinalRanking("Martin");
assert.equal(rankingRequests,1,"el ranking debe publicarse solo tras aceptar al final de la partida");
await saves.submitFinalRanking("Martin");
assert.equal(rankingRequests,1,"una partida no debe publicarse dos veces");

const touchInput=Object.assign(Object.create(InputManager.prototype),{down:new Set(),pressed:new Set(),keyboardDown:new Set(),touchRefs:new Map(),lastDirection:"ArrowRight"});
const listeners={};const runButton={dataset:{key:"ShiftLeft",autoForward:"true"},classList:{add:()=>{},remove:()=>{}},addEventListener:(name,fn)=>listeners[name]=fn,setPointerCapture:()=>{},hasPointerCapture:()=>false};
touchInput.bindTouch({querySelectorAll:()=>[runButton]});
listeners.pointerdown({preventDefault:()=>{},pointerId:1});
assert.equal(touchInput.is("run"),true,"RUN táctil debe activar la carrera");
assert.equal(touchInput.is("right"),true,"RUN táctil debe avanzar hacia donde mira el personaje");
listeners.pointerup({preventDefault:()=>{},pointerId:1});
assert.equal(touchInput.is("run"),false,"soltar RUN debe detener la carrera");
assert.equal(touchInput.is("right"),false,"soltar RUN debe detener el avance automático");
touchInput.lastDirection="ArrowLeft";listeners.pointerdown({preventDefault:()=>{},pointerId:2});
assert.equal(touchInput.is("left"),true,"RUN táctil debe respetar la dirección hacia la izquierda");
listeners.pointerup({preventDefault:()=>{},pointerId:2});

console.log("OK: escala, combate, anclajes, lanzamiento y evasión validados.");
