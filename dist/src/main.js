import { GAME } from "./config.js";
import { LEVELS } from "./data/levels.js";
import { SaveManager } from "./managers/SaveManager.js";
import { InputManager } from "./managers/InputManager.js";
import { AudioManager } from "./managers/AudioManager.js";
import { preloadAssets } from "./managers/AssetManager.js";
import { Game } from "./scenes/Game.js";

const shell=document.querySelector("#game-shell"),save=new SaveManager(),input=new InputManager(),audio=new AudioManager(save);let game=null;

const icon={play:"▶",continue:"◆",levels:"▦",rank:"★",help:"?",credits:"✦"};
const menuButton=(id,label,ico,disabled=false)=>`<button class="menu-btn" data-action="${id}" ${disabled?"disabled":""}><span>${ico}</span>${label}</button>`;

function renderMenu(){
  game?.stop();game=null;audio.music("menu");
  shell.innerHTML=`<section class="menu-screen">
    <div class="fog"></div><div class="menu-card">
      <p class="eyebrow">UNA AVENTURA ENTRE BALCONES Y GARÚA</p>
      <h1>LA DAMA<br><em>DE LIMA</em></h1><div class="gold-rule"></div>
      <nav aria-label="Menú principal">
        ${menuButton("new","NUEVA PARTIDA",icon.play)}
        ${menuButton("continue","CONTINUAR",icon.continue,!save.data.name)}
        ${menuButton("levels","SELECCIONAR NIVEL",icon.levels)}
        ${menuButton("ranking","RANKING LOCAL",icon.rank)}
        ${menuButton("help","CÓMO JUGAR",icon.help)}
        ${menuButton("credits","CRÉDITOS",icon.credits)}
      </nav>
      <div class="menu-meta"><span>RÉCORD ${String(save.data.record).padStart(6,"0")}</span><span>PROGRESO ${Object.keys(save.data.progress).length}/3</span></div>
    </div>
    <aside class="sound-panel" aria-label="Audio"><button data-audio="music">MÚSICA ${save.data.audio.music?"ON":"OFF"}</button><button data-audio="sfx">FX ${save.data.audio.sfx?"ON":"OFF"}</button><label>VOL <input type="range" min="0" max="1" step=".05" value="${save.data.audio.volume}" data-audio="volume"></label></aside>
    <p class="menu-hint">ENTER SELECCIONA · FLECHAS PARA MOVER</p>
  </section>`;
  shell.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>{audio.sfx("button");actions[b.dataset.action]();});
  bindAudio();keyboardMenu();
}

const actions={
  new:()=>modal("Nueva partida",`<label class="field">NOMBRE DE LA JUGADORA O JUGADOR<input id="player-name" maxlength="18" autocomplete="off" placeholder="Escribe tu nombre"></label><p class="muted">Tu progreso se guardará en este dispositivo.</p>`,`COMENZAR`,()=>{const n=document.querySelector("#player-name").value.trim();if(!n)return;save.newGame(n);startGame(1);}),
  continue:()=>startGame(save.data.currentLevel||1),
  levels:()=>showLevels(),ranking:()=>showRanking(),help:()=>showHelp(),credits:()=>showCredits()
};

function keyboardMenu(){const buttons=[...shell.querySelectorAll(".menu-btn:not(:disabled)")];if(!buttons.length)return;let i=0;buttons[0].focus();shell.onkeydown=e=>{if(e.key==="ArrowDown"){i=(i+1)%buttons.length;buttons[i].focus();}if(e.key==="ArrowUp"){i=(i-1+buttons.length)%buttons.length;buttons[i].focus();}};}

function modal(title,body,confirm="VOLVER",onConfirm=closeModal,dismissible=true){
  const wrap=document.createElement("div");wrap.className=`modal-backdrop${dismissible?"":" modal-locked"}`;wrap.innerHTML=`<section class="pixel-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">${dismissible?'<button class="modal-x" aria-label="Cerrar">×</button>':""}<h2 id="modal-title">${title}</h2><div class="modal-body">${body}</div><button class="primary-modal">${confirm}</button></section>`;shell.append(wrap);if(dismissible){wrap.querySelector(".modal-x").onclick=()=>wrap.remove();wrap.onclick=e=>{if(e.target===wrap)wrap.remove();};}wrap.querySelector(".primary-modal").onclick=()=>onConfirm(wrap);wrap.querySelector("input")?.focus();return wrap;
}
function closeModal(w){w.remove();}

function showLevels(){const cards=LEVELS.map(l=>{const locked=l.id>save.data.unlocked,best=save.data.progress[l.id]?.score||0;return `<button class="level-card" data-level="${l.id}" ${locked?"disabled":""}><b>0${l.id}</b><span>${l.name}</span><small>${locked?"BLOQUEADO":best?`MEJOR ${best}`:"DISPONIBLE"}</small></button>`;}).join("");const w=modal("Seleccionar nivel",`<div class="level-grid">${cards}</div>`,`VOLVER`,closeModal);w.querySelectorAll("[data-level]:not(:disabled)").forEach(b=>b.onclick=()=>startGame(+b.dataset.level));}

function showRanking(){const rows=save.data.ranking.length?save.data.ranking.map((r,i)=>`<tr><td>${i+1}</td><td>${safe(r.name)}</td><td>${r.score}</td><td>${r.levels}/3</td><td>${formatTime(r.time)}</td></tr>`).join(""):`<tr><td colspan="5">Aún no hay marcas. Completa un nivel.</td></tr>`;modal("Ranking local",`<p class="muted">Guardado solo en este dispositivo.</p><div class="table-wrap"><table><thead><tr><th>#</th><th>NOMBRE</th><th>PUNTOS</th><th>NIVELES</th><th>TIEMPO</th></tr></thead><tbody>${rows}</tbody></table></div><div class="save-tools"><button id="export-save">EXPORTAR PARTIDA</button><label class="import-label">IMPORTAR<input type="file" id="import-save" accept="application/json"></label></div>`);setTimeout(()=>{document.querySelector("#export-save").onclick=exportSave;document.querySelector("#import-save").onchange=importSave;});}

function showHelp(){modal("Cómo jugar",`<div class="help-grid"><article><kbd>A</kbd><kbd>D</kbd><h3>MOVER</h3><p>Camina a izquierda y derecha.</p></article><article><kbd>⇧</kbd><h3>CORRER</h3><p>Más velocidad, consume resistencia.</p></article><article><kbd>ESPACIO</kbd><h3>SALTAR</h3><p>Supera plataformas y peligros.</p></article><article><kbd>S</kbd><h3>AGACHARSE</h3><p>Esquiva las piedras que vuelan a media altura.</p></article><article><kbd>J</kbd><h3>FALDA</h3><p>Golpe cercano, amplio y potente.</p></article><article><kbd>K</kbd><h3>ABANICO</h3><p>Más alcance, pero menos daño.</p></article><article><kbd>L</kbd><h3>GUITARRA</h3><p>Especial lento y devastador. Espera a que se recargue.</p></article></div><p class="goal-copy">Llega a las <strong>flores amarillas</strong>, cuida tus tres vidas y deja recuperar la barra de resistencia. P pausa · R reinicia.</p>`);}

function showCredits(){modal("Créditos",`<div class="credits"><img src="./assets/sprites/heroine-v3-atlas.png" alt="Hoja de animaciones de la protagonista"><div><h3>LA DAMA DE LIMA</h3><p>Diseño, programación, pixel art y música generativa original para esta experiencia.</p><p>Inspirado con respeto en la danza, los balcones, plazas y la memoria visual de Lima.</p><p class="muted">Sin música comercial ni recursos de videojuegos existentes.</p></div></div>`);}

function startGame(id){
  audio.ensure();save.save({currentLevel:id});shell.onkeydown=null;shell.innerHTML=`<section class="play-screen"><div class="game-topbar"><div class="hud-name"><small>JUGADOR</small><b>${safe(save.data.name||"VISITANTE")}</b></div><div><small>VIDAS</small><b id="lives">♥ ♥ ♥</b></div><div><small>PUNTOS</small><b id="score">000000</b></div><div><small>NIVEL</small><b>0${id}</b></div><div class="stamina-wrap"><small>RESISTENCIA</small><div class="meter"><i id="stamina"></i></div></div><div class="special-wrap"><small>ESPECIAL GUITARRA</small><div class="meter special"><i id="special"></i></div></div><div class="attack-ready"><small>ATAQUES</small><b id="cooldowns">J ◆ K ◆ L ◆</b></div><button id="pause-btn">Ⅱ</button></div><div class="canvas-wrap"><canvas id="game" width="${GAME.width}" height="${GAME.height}" aria-label="Juego de plataformas La Dama de Lima"></canvas><div class="level-banner"><b>0${id} · ${LEVELS[id-1].name}</b><span>${LEVELS[id-1].subtitle}</span></div></div><div class="touch-controls"><div><button data-key="ArrowLeft">◀</button><button data-key="ArrowRight">▶</button></div><div><button data-key="ShiftLeft">RUN</button><button data-key="Space">↑</button><button data-key="KeyJ">J</button><button data-key="KeyK">K</button><button data-key="KeyL">L</button></div></div><p class="desktop-controls">A D mover · SHIFT correr · ESPACIO saltar · S agacharse · J falda · K abanico · L guitarra · P pausa · R reiniciar</p></section>`;
  input.bindTouch(shell);const banner=shell.querySelector(".level-banner");setTimeout(()=>banner.classList.add("hide"),2400);
  game=new Game(shell.querySelector("#game"),input,audio,save,{hud:updateHud,pause:p=>shell.querySelector("#pause-btn").textContent=p?"▶":"Ⅱ",complete:showComplete,gameOver:showGameOver});game.start(id);shell.querySelector("#pause-btn").onclick=()=>{input.pressed.add("KeyP");};
}

function updateHud(d){shell.querySelector("#score").textContent=String(d.score).padStart(6,"0");shell.querySelector("#lives").textContent="♥ ".repeat(Math.max(0,d.hp));shell.querySelector("#stamina").style.width=`${d.stamina}%`;const special=shell.querySelector("#special"),ready=!d.cooldowns.guitar;special.style.width=`${Math.max(0,100-d.cooldowns.guitar/8*100)}%`;special.closest(".special-wrap").classList.toggle("is-ready",ready);shell.querySelector("#cooldowns").textContent=`J ${d.cooldowns.skirt?"○":"◆"}  K ${d.cooldowns.fan?"○":"◆"}  L ${ready?"◆":"○"}`;}
function showComplete(r){const next=r.next?`<button id="next-level">SIGUIENTE NIVEL</button>`:"<p>¡Has completado la aventura!</p>";const w=modal("¡Nivel completado!",`<div class="result-score">${r.score}</div><p>Bono por tiempo y vidas: ${r.bonus}</p>${next}`,"MENÚ PRINCIPAL",()=>renderMenu(),false);w.querySelector("#next-level")?.addEventListener("click",()=>startGame(r.next));}
function showGameOver(){modal("Fin de la partida",`<p>La dama necesita recuperar el aliento.</p><p class="muted">Puedes volver a intentarlo desde el inicio del nivel.</p>`,`REINTENTAR`,()=>startGame(save.data.currentLevel),false);}

function bindAudio(){shell.querySelectorAll("[data-audio]").forEach(el=>{el.oninput=()=>{const a=save.data.audio;if(el.dataset.audio==="volume")a.volume=+el.value;else a[el.dataset.audio]=!a[el.dataset.audio];save.save({audio:a});if(el.dataset.audio==="music")renderMenu();else if(el.dataset.audio==="sfx")el.textContent=`FX ${a.sfx?"ON":"OFF"}`;};});}
function exportSave(){const a=document.createElement("a");a.href=URL.createObjectURL(save.export());a.download="la-dama-de-lima-partida.json";a.click();URL.revokeObjectURL(a.href);}
async function importSave(e){try{await save.import(e.target.files[0]);renderMenu();}catch{alert("No se pudo importar esa partida.");}}
const safe=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const formatTime=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;

async function boot(){
  shell.innerHTML='<section class="loading-screen"><div class="loading-flower">✦</div><p>CARGANDO RECURSOS PIXEL-ART…</p></section>';
  try{await preloadAssets();renderMenu();}catch(error){shell.innerHTML=`<section class="loading-screen"><p>No se pudieron cargar los recursos del juego.</p><button onclick="location.reload()">REINTENTAR</button></section>`;console.error(error);}
}
boot();
