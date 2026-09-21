import assert from "node:assert/strict";
import { PLAYER_VISUAL_SCALE, PLAYER_REFERENCE_HEIGHT, NORMAL_ENEMY_REFERENCE_HEIGHT, SMALL_ENEMY_REFERENCE_HEIGHT, PROJECTILE_REFERENCE_SIZE } from "../dist/src/config.js";
import { LEVELS } from "../dist/src/data/levels.js";
import { Player } from "../dist/src/entities/Player.js";
import { Enemy } from "../dist/src/entities/Enemy.js";
import { Game } from "../dist/src/scenes/Game.js";

const input={is:()=>false,tap:()=>false};
const audio={sfx:()=>{},music:()=>{},stop:()=>{}};

assert.equal(PLAYER_VISUAL_SCALE,1);
assert.ok(PLAYER_REFERENCE_HEIGHT>NORMAL_ENEMY_REFERENCE_HEIGHT);
assert.ok(NORMAL_ENEMY_REFERENCE_HEIGHT>SMALL_ENEMY_REFERENCE_HEIGHT);
assert.ok(SMALL_ENEMY_REFERENCE_HEIGHT>PROJECTILE_REFERENCE_SIZE);
assert.ok(LEVELS.every(level=>level.enemies.some(enemy=>enemy.type==="thrower")));

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

console.log("OK: escala, combate, anclajes, lanzamiento y evasión validados.");
