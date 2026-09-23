import { GAME } from "./config.js";
import { LEVELS, WORLDS } from "./data/levels.js";
import { SaveManager } from "./managers/SaveManager.js";
import { InputManager } from "./managers/InputManager.js";
import { AudioManager } from "./managers/AudioManager.js";
import { preloadAssets } from "./managers/AssetManager.js";
import { Game } from "./scenes/Game.js";
import { Epilogue } from "./scenes/Epilogue.js";

const shell=document.querySelector("#game-shell"),save=new SaveManager(),input=new InputManager(),audio=new AudioManager(save);let game=null,epilogue=null;
const coarsePointer=window.matchMedia("(pointer: coarse)");
function updateDeviceMode(){const mobile=coarsePointer.matches&&navigator.maxTouchPoints>0&&Math.min(window.innerWidth,window.innerHeight)<=900;document.documentElement.classList.toggle("mobile-touch",mobile);document.documentElement.classList.toggle("mobile-portrait",mobile&&window.innerHeight>window.innerWidth);}
updateDeviceMode();window.addEventListener("resize",updateDeviceMode,{passive:true});window.addEventListener("orientationchange",()=>setTimeout(updateDeviceMode,80),{passive:true});
const unlockAudio=()=>audio.unlock();
document.addEventListener("pointerdown",unlockAudio,{once:true});
document.addEventListener("keydown",unlockAudio,{once:true});

const icon={play:"▶",continue:"◆",levels:"▦",rank:"★",help:"?",credits:"✦"};
const menuButton=(id,label,ico,disabled=false)=>`<button class="menu-btn" data-action="${id}" ${disabled?"disabled":""}><span>${ico}</span>${label}</button>`;

function renderMenu(){
  epilogue?.stop();epilogue=null;game?.stop();game=null;audio.music("menu");
  shell.innerHTML=`<section class="menu-screen">
    <div class="fog"></div><div class="menu-card">
      <p class="eyebrow">UNA AVENTURA ENTRE BALCONES Y GARÚA</p>
      <h1>LA DAMA<br><em>DE LIMA</em></h1><div class="gold-rule"></div>
      <nav aria-label="Menú principal">
        ${menuButton("new","NUEVA PARTIDA",icon.play)}
        ${menuButton("continue","CONTINUAR",icon.continue,!save.data.started)}
        ${menuButton("levels","SELECCIONAR NIVEL",icon.levels)}
        ${menuButton("ranking","RANKING GLOBAL",icon.rank)}
        ${menuButton("help","CÓMO JUGAR",icon.help)}
        ${menuButton("credits","CRÉDITOS",icon.credits)}
      </nav>
      <div class="menu-meta"><span>RÉCORD ${String(save.data.record).padStart(6,"0")}</span><span>PROGRESO ${Object.keys(save.data.progress).length}/12</span></div>
    </div>
    <aside class="sound-panel" aria-label="Audio y datos locales"><button data-audio="music">MÚSICA ${save.data.audio.music?"ON":"OFF"}</button><button data-audio="sfx">FX ${save.data.audio.sfx?"ON":"OFF"}</button><label>VOL <input type="range" min="0" max="1" step=".05" value="${save.data.audio.volume}" data-audio="volume"></label><button class="clear-cache" data-action="clearCache" title="Borrar el progreso de este navegador">BORRAR CACHÉ</button></aside>
    <p class="menu-hint">ENTER SELECCIONA · FLECHAS PARA MOVER</p>
  </section>`;
  shell.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>{audio.sfx("button");actions[b.dataset.action]();});
  bindAudio();keyboardMenu();
}

const actions={
  new:()=>{save.newGame();startGame(1);},
  continue:()=>startGame(save.data.currentLevel||1),
  levels:()=>showLevels(),ranking:()=>showRanking(),help:()=>showHelp(),credits:()=>showCredits(),clearCache:()=>showClearCache()
};

function keyboardMenu(){const buttons=[...shell.querySelectorAll(".menu-btn:not(:disabled)")];if(!buttons.length)return;let i=0;buttons[0].focus();shell.onkeydown=e=>{if(e.key==="ArrowDown"){i=(i+1)%buttons.length;buttons[i].focus();}if(e.key==="ArrowUp"){i=(i-1+buttons.length)%buttons.length;buttons[i].focus();}};}

function modal(title,body,confirm="VOLVER",onConfirm=closeModal,dismissible=true,onDismiss=closeModal){
  const wrap=document.createElement("div");wrap.className=`modal-backdrop${dismissible?"":" modal-locked"}`;wrap.innerHTML=`<section class="pixel-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">${dismissible?'<button class="modal-x" aria-label="Cerrar">×</button>':""}<h2 id="modal-title">${title}</h2><div class="modal-body">${body}</div><button class="primary-modal">${confirm}</button></section>`;shell.append(wrap);
  if(dismissible){wrap.querySelector(".modal-x").onclick=()=>onDismiss(wrap);wrap.onclick=e=>{if(e.target===wrap)onDismiss(wrap);};}
  wrap.querySelector(".primary-modal").onclick=()=>onConfirm(wrap);wrap.querySelector("input")?.focus();return wrap;
}
function closeModal(w){w.remove();}

function showClearCache(){
  modal("Borrar datos locales",`<p>Se borrarán los niveles desbloqueados, el progreso, el récord, las opciones y la marca de puntuación ya enviada <strong>solo en este navegador</strong>.</p><p class="muted">La puntuación que ya aparece en el ranking global no se eliminará.</p>`,"BORRAR Y EMPEZAR DE CERO",()=>{save.clearLocalData();audio.stop();renderMenu();},true,closeModal);
}

function showLevels(){
  const worlds=WORLDS.map(world=>{const levels=LEVELS.filter(level=>level.world===world.id).map(level=>{const locked=level.id>save.data.unlocked,best=save.data.progress[level.id]?.score||0,current=level.id===save.data.currentLevel&&!locked;const status=locked?"BLOQUEADO":current?"ACTUAL":best?"COMPLETO":"DISPONIBLE";return `<button class="level-card${current?" is-current":""}" data-level="${level.id}" ${locked?"disabled":""} aria-label="Capítulo ${level.chapter}, ${status.toLowerCase()}"><b>${level.chapter}</b><small>${locked?"×":current?"ACTUAL":best?"✓":"○"}</small></button>`;}).join("");const worldLocked=(world.id-1)*4+1>save.data.unlocked;return `<section class="world-levels ${worldLocked?"is-locked":""}"><h3>MUNDO ${world.id} · ${world.name}</h3><p>${world.subtitle}</p><div class="level-grid">${levels}</div></section>`;}).join("");
  const w=modal("Seleccionar capítulo",worlds,"VOLVER",closeModal);w.querySelectorAll("[data-level]:not(:disabled)").forEach(button=>button.onclick=()=>startGame(+button.dataset.level));
}

async function showRanking(){
  const w=modal("Ranking global",`<p class="muted ranking-status" role="status">Conectando con el ranking global…</p><div class="table-wrap"><table><thead><tr><th>#</th><th>NOMBRE</th><th>PUNTOS</th><th>NIVELES</th><th>TIEMPO</th></tr></thead><tbody><tr><td colspan="5">Cargando puntuaciones…</td></tr></tbody></table></div>`);
  try{
    const ranking=await save.getRanking();
    if(!w.isConnected)return;
    w.querySelector(".ranking-status").textContent="CONECTADO · PUNTUACIONES COMPARTIDAS";
    w.querySelector("tbody").innerHTML=ranking.length?ranking.map((r,i)=>`<tr><td>${i+1}</td><td>${safe(r.name)}</td><td>${r.score}</td><td>${r.levels}/12</td><td>${formatTime(r.time)}</td></tr>`).join(""):`<tr><td colspan="5">Aún no hay marcas. Completa la aventura.</td></tr>`;
  }catch(error){
    if(!w.isConnected)return;
    w.querySelector(".ranking-status").textContent="SIN CONEXIÓN CON EL RANKING GLOBAL";
    w.querySelector("tbody").innerHTML=`<tr><td colspan="5">${safe(error.message||"No se pudo conectar con la base de datos.")}</td></tr>`;
  }
}

function showHelp(){modal("Cómo jugar",`<div class="help-grid"><article><kbd>A</kbd><kbd>D</kbd><h3>MOVER</h3><p>Camina a izquierda y derecha.</p></article><article><kbd>⇧</kbd><h3>CORRER</h3><p>Más velocidad, consume resistencia.</p></article><article><kbd>ESPACIO</kbd><h3>SALTAR</h3><p>Supera plataformas y peligros.</p></article><article><kbd>S</kbd><h3>AGACHARSE</h3><p>Esquiva las piedras que vuelan a media altura.</p></article><article><kbd>J</kbd><h3>ATAQUE 1</h3><p>Patada con abanico como Aspirante; falda con los demás trajes.</p></article><article><kbd>K</kbd><h3>ABANICO</h3><p>Se obtiene al completar Lima.</p></article><article><kbd>L</kbd><h3>GUITARRA</h3><p>Se obtiene al completar Barranco.</p></article></div><p class="goal-copy">Completa 4 capítulos por mundo. Las flores marcan capítulos normales; los instrumentos esperan al final de Lima y Barranco.</p>`);}

function showCredits(){modal("Créditos",`<div class="credits"><img class="credits-author" src="./assets/sprites/credits-author-plush.png" alt="Muñeco de pelo blanco y gafas oscuras"><div><h3>LA DAMA DE LIMA</h3><p class="creator-credit">Creado por <strong>Martini_83</strong></p><p>Diseño, programación, pixel art y selección musical para esta experiencia.</p><p>Inspirado con respeto en la danza, los balcones, plazas y la memoria visual de Lima.</p></div></div>`);}

function startGame(id){
  epilogue?.stop();epilogue=null;
  const level=LEVELS[id-1]||LEVELS[0],attackOneLabel=level.costume==="aspirant"?"patada":"falda";audio.ensure();save.save({currentLevel:id,started:true});shell.onkeydown=null;shell.innerHTML=`<section class="play-screen"><div class="game-topbar"><div class="hud-name"><small>JUGADOR</small><b>${safe(save.data.name||"VISITANTE")}</b></div><div><small>VIDAS</small><b id="lives">♥ ♥ ♥</b></div><div><small>PUNTOS</small><b id="score">000000</b></div><div><small>MUNDO/NIVEL</small><b>${level.world}-${String(level.chapter).padStart(2,"0")}</b></div><div class="stamina-wrap"><small>RESISTENCIA</small><div class="meter"><i id="stamina"></i></div></div><div class="special-wrap"><small>ESPECIAL GUITARRA</small><div class="meter special"><i id="special"></i></div></div><div class="attack-ready"><small>ATAQUES</small><b id="cooldowns">J ◆ K × L × ↑² ◆</b></div><div class="top-actions"><button id="fullscreen-btn" aria-label="Pantalla completa" title="Pantalla completa">⛶</button><button id="pause-btn" aria-label="Pausar" title="Pausar">Ⅱ</button></div></div><div class="canvas-wrap"><canvas id="game" width="${GAME.width}" height="${GAME.height}" aria-label="Juego de plataformas La Dama de Lima"></canvas><div class="level-banner"><b>MUNDO ${level.world} · ${level.worldName}</b><span>${String(level.chapter).padStart(2,"0")} · ${level.name}</span></div></div><div class="touch-controls"></div><p class="desktop-controls">A D mover · SHIFT correr · ESPACIO saltar (otra vez en el aire: doble salto, recarga 2 s) · S agacharse · J ${attackOneLabel} · K abanico · L guitarra · P pausa · R reiniciar</p></section>`;
  const touch=shell.querySelector(".touch-controls");touch.setAttribute("aria-label","Controles táctiles");touch.innerHTML=`<div class="touch-left"><button class="touch-run" data-key="ShiftLeft" data-auto-forward="true" aria-label="Correr hacia adelante">RUN</button><button class="touch-left-move" data-key="ArrowLeft" aria-label="Mover izquierda">◀</button><button class="touch-right-move" data-key="ArrowRight" aria-label="Mover derecha">▶</button></div><div class="touch-right"><button class="touch-jump" data-key="Space" aria-label="Saltar; pulsar otra vez en el aire para salto doble">↑</button><button data-key="KeyS" aria-label="Agacharse">↓</button><button data-key="KeyJ" aria-label="Ataque de ${attackOneLabel}">J</button><button data-key="KeyK" aria-label="Ataque de abanico">K</button><button class="touch-special" data-key="KeyL" aria-label="Ataque especial de guitarra">L</button></div>`;input.bindTouch(shell);if(!shell.querySelector(".rotate-overlay")){const rotate=document.createElement("div");rotate.className="rotate-overlay";rotate.setAttribute("role","status");rotate.innerHTML="<strong>Gira tu dispositivo para jugar</strong><span>Coloca el teléfono en horizontal</span>";shell.querySelector(".play-screen").append(rotate);}const banner=shell.querySelector(".level-banner");setTimeout(()=>banner.classList.add("hide"),2400);
  game=new Game(shell.querySelector("#game"),input,audio,save,{hud:updateHud,pause:p=>shell.querySelector("#pause-btn").textContent=p?"▶":"Ⅱ",complete:showComplete,gameOver:showGameOver});
  try{game.start(id);}catch(error){console.error("No se pudo iniciar el nivel",error);game=null;modal("No se pudo iniciar",`<p>El escenario no pudo cargarse correctamente.</p><p class="muted">Recarga la página e inténtalo de nuevo.</p>`,`VOLVER AL MENÚ`,()=>renderMenu(),false);return;}
  shell.querySelector("#pause-btn").onclick=()=>{input.pressed.add("KeyP");};const fullscreen=shell.querySelector("#fullscreen-btn");fullscreen.hidden=!document.fullscreenEnabled||!document.documentElement.requestFullscreen;fullscreen.onclick=toggleFullscreen;
}

async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen({navigationUI:"hide"});}catch{const button=shell.querySelector("#fullscreen-btn");if(button)button.hidden=true;}}
document.addEventListener("fullscreenchange",()=>{const button=shell.querySelector("#fullscreen-btn");if(button)button.textContent=document.fullscreenElement?"↙":"⛶";});

function updateHud(d){shell.querySelector("#score").textContent=String(d.score).padStart(6,"0");shell.querySelector("#lives").textContent="♥ ".repeat(Math.max(0,d.hp));shell.querySelector("#stamina").style.width=`${d.stamina}%`;const special=shell.querySelector("#special"),ready=d.abilities.guitar&&!d.cooldowns.guitar;special.style.width=d.abilities.guitar?`${Math.max(0,100-d.cooldowns.guitar/8*100)}%`:"0%";special.closest(".special-wrap").classList.toggle("is-ready",ready);shell.querySelector("#cooldowns").textContent=`J ${d.cooldowns.skirt?"○":"◆"}  K ${!d.abilities.fan?"×":d.cooldowns.fan?"○":"◆"}  L ${!d.abilities.guitar?"×":ready?"◆":"○"}  ↑² ${d.cooldowns.doubleJump?`${d.cooldowns.doubleJump.toFixed(1)}s`:"◆"}`;const jump=shell.querySelector(".touch-jump");if(jump)jump.textContent=d.cooldowns.doubleJump?`↑ ${Math.ceil(d.cooldowns.doubleJump)}`:"↑";}
function showComplete(r){
  if(!r.next){showFinalSequence();return;}
  const reward=r.reward==="fan"?"<p class=\"unlock-message\">¡ABANICO DESBLOQUEADO! Ya puedes usar K en Barranco.</p>":r.reward==="guitar"?"<p class=\"unlock-message\">¡GUITARRA DESBLOQUEADA! Ya puedes usar L en Trujillo.</p>":"";
  const w=modal(r.chapter===4?"¡Mundo completado!":"¡Capítulo completado!",`<div class="result-score">${r.score}</div><p>Bono por tiempo y vidas: ${r.bonus}</p>${reward}<button id="next-level">${r.chapter===4?"SIGUIENTE MUNDO":"SIGUIENTE CAPÍTULO"}</button>`,"MENÚ PRINCIPAL",()=>renderMenu(),false);
  w.querySelector("#next-level").addEventListener("click",()=>startGame(r.next));
}
function showFinalSequence(){
  game?.stop();game=null;
  shell.onkeydown=null;
  shell.innerHTML=`<section class="epilogue-screen"><header><span>LA DAMA DE LIMA</span><strong>EL PARDILLAJE</strong><span>FIN DE LA AVENTURA</span></header><div class="epilogue-frame"><canvas id="epilogue-canvas" width="768" height="512" aria-label="Recuerdos animados de las tres pardillas"></canvas><div class="epilogue-caption" aria-live="polite"></div></div><p class="epilogue-score">PUNTUACIÓN FINAL · ${String(save.data.score).padStart(6,"0")}</p><div class="epilogue-actions"><button id="epilogue-menu" class="secondary-modal">SALIR AL MENÚ</button>${save.data.rankingSubmitted?"":'<button id="epilogue-save" class="epilogue-save">GUARDAR PUNTUACIÓN</button>'}</div></section>`;
  epilogue=new Epilogue(shell.querySelector("#epilogue-canvas"),caption=>{const node=shell.querySelector(".epilogue-caption");if(node)node.textContent=caption;});
  epilogue.start();
  audio.music("epilogue");
  shell.querySelector("#epilogue-menu").onclick=renderMenu;
  const saveButton=shell.querySelector("#epilogue-save");if(saveButton)saveButton.onclick=showFinalRanking;
}
function showFinalRanking(){
  if(save.data.rankingSubmitted)return;
  const body=`<div class="result-score">${save.data.score}</div><p>Si quieres aparecer en el ranking global, escribe tu nombre. Puedes cerrar esta ventana y seguir viendo el final sin guardar.</p><label class="field">NOMBRE PARA EL RANKING<input id="ranking-name" maxlength="18" autocomplete="off" placeholder="Tu nombre"></label><button id="save-ranking">GUARDAR PUNTUACIÓN</button><p class="muted ranking-save-status" role="status"></p>`;
  const w=modal("Guardar puntuación",body,"VOLVER AL FINAL",closeModal,true,closeModal);
  const button=w.querySelector("#save-ranking"),inputName=w.querySelector("#ranking-name"),status=w.querySelector(".ranking-save-status");
  button.onclick=async()=>{
    button.disabled=true;status.textContent="Guardando en el ranking global…";
    try{const result=await save.submitFinalRanking(inputName.value);status.textContent=result.duplicate?"ESTE NAVEGADOR YA GUARDÓ UNA PUNTUACIÓN":"PUNTUACIÓN GUARDADA EN EL RANKING GLOBAL";inputName.disabled=true;button.textContent="GUARDADO";shell.querySelector("#epilogue-save")?.remove();}
    catch(error){status.textContent=error.message;button.disabled=false;inputName.focus();}
  };
}
function showGameOver(){const w=modal("Fin de la partida",`<p>La dama necesita recuperar el aliento.</p><p class="muted">Puedes volver a intentarlo desde el inicio del nivel.</p>`,`REINTENTAR`,()=>startGame(save.data.currentLevel),false);const menu=document.createElement("button");menu.className="secondary-modal";menu.textContent="MENÚ PRINCIPAL";menu.onclick=()=>renderMenu();w.querySelector(".pixel-modal").append(menu);}

function bindAudio(){
  const music=shell.querySelector('[data-audio="music"]'),sfx=shell.querySelector('[data-audio="sfx"]'),volume=shell.querySelector('[data-audio="volume"]');
  music.onclick=()=>{audio.setMusicEnabled(!save.data.audio.music);save.save({audio:{...save.data.audio}});music.textContent=`MÚSICA ${save.data.audio.music?"ON":"OFF"}`;};
  sfx.onclick=()=>{if(save.data.audio.sfx)audio.sfx("button");audio.setSfxEnabled(!save.data.audio.sfx);save.save({audio:{...save.data.audio}});sfx.textContent=`FX ${save.data.audio.sfx?"ON":"OFF"}`;};
  volume.oninput=()=>{audio.setVolume(+volume.value);save.save({audio:{...save.data.audio}});};
}
const safe=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const formatTime=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;

async function boot(){
  shell.innerHTML='<section class="loading-screen"><div class="loading-flower">✦</div><p>CARGANDO RECURSOS PIXEL-ART…</p></section>';
  try{await preloadAssets();renderMenu();}catch(error){shell.innerHTML=`<section class="loading-screen"><p>No se pudieron cargar los recursos del juego.</p><button onclick="location.reload()">REINTENTAR</button></section>`;console.error(error);}
}
boot();
