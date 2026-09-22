import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PLAYER_VISUAL_SCALE, PLAYER_REFERENCE_HEIGHT, NORMAL_ENEMY_REFERENCE_HEIGHT, SMALL_ENEMY_REFERENCE_HEIGHT, PROJECTILE_REFERENCE_SIZE } from "../game/src/config.js";
import { LEVELS, WORLDS, getLevel } from "../game/src/data/levels.js";
import { Player, ATLAS_TO_WORLD } from "../game/src/entities/Player.js";
import { Enemy } from "../game/src/entities/Enemy.js";
import { Game } from "../game/src/scenes/Game.js";
import { SaveManager } from "../game/src/managers/SaveManager.js";
import { InputManager } from "../game/src/managers/InputManager.js";
import { Boss } from "../game/src/entities/Boss.js";

const input={is:()=>false,tap:()=>false};
const audio={sfx:()=>{},music:()=>{},stop:()=>{}};

const assetPath=relative=>fileURLToPath(new URL(`../game/assets/${relative}`,import.meta.url));
const pngSize=relative=>{const png=readFileSync(assetPath(relative));return[png.readUInt32BE(16),png.readUInt32BE(20)];};
assert.deepEqual(pngSize("sprites/heroine-aspirant-atlas.png"),[2000,800],"el atlas aspirante debe conservar su cuadrícula 10x4");
assert.deepEqual(pngSize("sprites/heroine-novice-atlas.png"),[2000,800],"el atlas pardilla debe conservar su cuadrícula 10x4");
assert.deepEqual(pngSize("backgrounds/barranco.png"),[2079,756]);
assert.deepEqual(pngSize("backgrounds/trujillo.png"),[2079,756]);
assert.deepEqual(pngSize("sprites/boss-dialogue-portraits.png"),[1536,1024],"el diálogo debe tener cuatro retratos en un atlas 2x2");
for(const scene of ["shots","running","poses","pyramid"])assert.deepEqual(pngSize(`sprites/epilogue-${scene}.png`),[1536,1024],`el epílogo ${scene} debe tener cuatro cuadros 2x2`);
assert.ok(readFileSync(assetPath("audio/te-mando-flores-remastered.mp3")).length>1000000,"la canción del epílogo debe estar incluida");

assert.equal(PLAYER_VISUAL_SCALE,.95);
assert.equal(200*ATLAS_TO_WORLD,PLAYER_REFERENCE_HEIGHT*1.18*PLAYER_VISUAL_SCALE);
assert.equal(256*ATLAS_TO_WORLD/(200*ATLAS_TO_WORLD),256/200,"todos los atlas deben usar la misma escala de píxel");
assert.ok(PLAYER_REFERENCE_HEIGHT>NORMAL_ENEMY_REFERENCE_HEIGHT);
assert.ok(NORMAL_ENEMY_REFERENCE_HEIGHT>SMALL_ENEMY_REFERENCE_HEIGHT);
assert.ok(SMALL_ENEMY_REFERENCE_HEIGHT>PROJECTILE_REFERENCE_SIZE);
assert.ok(LEVELS.every(level=>level.enemies.some(enemy=>enemy.type==="thrower")));
assert.equal(WORLDS.length,3,"la campaña debe tener tres mundos");
assert.equal(LEVELS.length,12,"cada mundo debe tener cuatro capítulos");
assert.deepEqual(LEVELS.filter(level=>level.chapter===4).map(level=>level.reward),["fan","guitar","regalia"]);
assert.equal(LEVELS[0].abilities.fan,false);assert.equal(LEVELS[4].abilities.fan,true);assert.equal(LEVELS[4].abilities.guitar,false);assert.equal(LEVELS[8].abilities.guitar,true);
assert.ok(LEVELS[4].worldWidth>LEVELS[0].worldWidth&&LEVELS[8].worldWidth>LEVELS[4].worldWidth,"cada mundo debe ser más largo que el anterior");
const clonedLevel=getLevel(1);clonedLevel.platforms[0].x=999;
assert.notEqual(LEVELS[0].platforms[0].x,999,"el nivel debe clonarse sin depender de structuredClone");

const player=new Player(input,audio),feet=player.y+player.h;
player.anim="jump";player.animT=2;player.setAnim("fall");assert.equal(player.animT,0,"cada transición de pose debe empezar en su primer frame");
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
for(let level=1;level<=12;level++)saves.complete(level,1000+level*20,20+level);
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

const boss=new Boss({x:700});const bossLevel={worldWidth:1600,platforms:[{x:0,y:486,w:1600,h:54}]};
const bossGuitar=new Boss({x:700});
bossGuitar.attackT=1;bossGuitar.attackDuration=2.35;bossGuitar.attackType="guitar";
assert.equal(bossGuitar.hit(5,1,"guitar"),true);
assert.equal(bossGuitar.hp,bossGuitar.maxHp*.75,"la guitarra debe quitar exactamente un cuarto de la vida del jefe");
assert.equal(bossGuitar.attackT,0,"el golpe especial debe interrumpir el ataque del jefe");
assert.ok(bossGuitar.stunT>2,"el jefe debe quedar aturdido");
bossGuitar.update(1/60,{x:650,y:404,w:42,h:82},bossLevel);
assert.equal(bossGuitar.canDamage(),false,"el jefe aturdido no puede atacar");
for(let frame=0;frame<18;frame++)bossGuitar.update(1/60,{x:650,y:404,w:42,h:82},bossLevel);
assert.equal(bossGuitar.state,"stun","la reacción de impacto debe dar paso a la animación aturdida");
assert.ok([0,8].includes(bossGuitar.frameIndex()),"el aturdimiento usa fotogramas alternos y estrellas");
const slowBoss=new Boss({x:700});
slowBoss.attackCooldown=0;
slowBoss.update(1/60,{x:650,y:404,w:42,h:82},bossLevel);
assert.equal(slowBoss.attackDuration,2.35,"la animación de guitarra del jefe debe ser más lenta");
assert.ok(slowBoss.attackCooldown>5,"la guitarra del jefe necesita una recarga mayor");
const arena=Object.create(Game.prototype);
arena.level={goal:{x:1000},worldWidth:1600};arena.boss={defeated:false};arena.player={x:850,w:42,vx:120};arena.audio=audio;
arena.blockBossExit();
assert.equal(arena.player.x,arena.bossGateX()-arena.player.w,"el grupo final queda inaccesible durante el combate");
arena.boss.defeated=true;arena.player.x=850;arena.blockBossExit();
assert.equal(arena.player.x,850,"al derrotar al jefe se abre el camino");
arena.beginBossDialogue();
assert.equal(arena.dialogue.step,0);
arena.advanceDialogue();arena.advanceDialogue();
assert.equal(arena.dialogue.step,1,"la protagonista responde después del Tuno Mayor");
arena.advanceDialogue();arena.advanceDialogue();
assert.equal(arena.dialogue,null);
assert.equal(arena.introMessageT,2,"tras hablar aparece Vence al Tuno antes de reanudar");
boss.hit(99,1);for(let frame=0;frame<180&&!boss.defeated;frame++)boss.update(1/60,{x:650,y:404,w:42,h:82},bossLevel);
assert.equal(boss.defeated,true,"el jefe final debe caer al suelo antes de permitir avanzar");
assert.equal(boss.y+boss.h,486,"el jefe derrotado debe quedar apoyado en el suelo");

console.log("OK: escala, combate, anclajes, lanzamiento y evasión validados.");
