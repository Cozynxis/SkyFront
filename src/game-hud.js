import './game-hud.css';
import {BR_PLACES} from './battle-royale-world.js';

// HUD is driven by game state, not hard-coded HTML updates.
export function mountGameHud(parent,{position,worldRadius=72}={}){
 const el=document.createElement('div');
 el.className='sf-battle-hud';
 el.innerHTML=`
 <div class="sf-hud-map-wrap">
  <div class="sf-hud-map" aria-label="Spawn Island minimap">
   <canvas width="240" height="240" class="sf-hud-map-canvas"></canvas>
   <div class="sf-hud-compass">N</div>
  </div>
  <div class="sf-hud-match-stats">
   <div><span class="sf-hud-stat-icon">◷</span><strong data-hud-time>00:25</strong></div>
   <div><span class="sf-hud-stat-icon">♟</span><strong data-hud-players>1</strong></div>
   <div><span class="sf-hud-stat-icon">✕</span><strong data-hud-kills>0</strong></div>
  </div>
  <div class="sf-hud-location">SPAWN ISLAND</div>
 </div>
 <div class="sf-hud-vitals">
  <div class="sf-hud-vital sf-hud-shield"><span class="sf-hud-vital-symbol">◆</span><div class="sf-hud-vital-track"><i data-hud-shield-bar></i></div><strong data-hud-shield>0</strong></div>
  <div class="sf-hud-vital sf-hud-health"><span class="sf-hud-vital-symbol">✚</span><div class="sf-hud-vital-track"><i data-hud-health-bar></i></div><strong data-hud-health>100</strong></div>
  <div class="sf-hud-stamina" data-hud-stamina-wrap aria-label="Sprint stamina"><span class="sf-hud-stamina-icon">⚡</span><div class="sf-hud-stamina-track"><i data-hud-stamina-bar></i></div></div>
 </div>
 <div class="sf-hud-inventory" aria-label="Inventory">
  
  <div class="sf-hud-slots">
   <button type="button" data-slot="0" class="sf-hud-slot is-active" aria-label="Slot 1: Pickaxe"><span class="sf-hud-slot-num">1</span><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><path d="M12 38L35 12M13 14Q24 6 39 14M29 11l10 10"/></svg><small>PICKAXE</small></button>
   ${[1,2,3,4,5].map(i=>`<button type="button" data-slot="${i}" class="sf-hud-slot" aria-label="Empty inventory slot ${i+1}"><span class="sf-hud-slot-num">${i+1}</span><span class="sf-hud-slot-empty">+</span></button>`).join('')}
  </div>
 </div>`;
 parent.append(el);
 const fullMap=document.createElement('div');fullMap.className='sf-full-map';fullMap.hidden=true;
 fullMap.innerHTML='<div class="sf-full-map-head"><strong>BATTLE ROYALE MAP</strong><span>M TO CLOSE</span></div><canvas width="760" height="760"></canvas><div class="sf-full-map-footer">SKYFRONT ISLAND · EXPLORE THE NAMED LOCATIONS</div>';
 parent.append(fullMap);
 const fullCanvas=fullMap.querySelector('canvas'),fullCtx=fullCanvas.getContext('2d');
 let mapOpen=false;
 const canvas=el.querySelector('canvas'),ctx=canvas.getContext('2d');
 const slots=[...el.querySelectorAll('[data-slot]')];
 let heading=0;
 let active=0,health=100,shield=0,kills=0,players=1,seconds=25,mode='spawn';
 const staminaWrap=el.querySelector('[data-hud-stamina-wrap]');
 const staminaBar=el.querySelector('[data-hud-stamina-bar]');
 let staminaVisibleUntil=0;
 let inventoryItems=[{name:'PICKAXE',kind:'pickaxe'},null,null,null,null,null];
 const update=()=>{
  el.querySelector('[data-hud-health]').textContent=Math.round(health);
  el.querySelector('[data-hud-shield]').textContent=Math.round(shield);
  el.querySelector('[data-hud-health-bar]').style.width=health+'%';
  el.querySelector('[data-hud-shield-bar]').style.width=shield+'%';
  el.querySelector('[data-hud-kills]').textContent=kills;
  el.querySelector('[data-hud-players]').textContent=players;
  el.querySelector('[data-hud-time]').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  slots.forEach((slot,i)=>{
   slot.classList.toggle('is-active',i===active);
   slot.setAttribute('aria-pressed',String(i===active));
   const item=inventoryItems[i];
   slot.setAttribute('aria-label',item?'Slot '+(i+1)+': '+item.name:'Empty slot '+(i+1));
   slot.innerHTML='<span class="sf-hud-slot-num">'+(i+1)+'</span>'+(item?'<span class="sf-hud-slot-item">'+(item.kind==='pickaxe'?'⛏':'⌁')+'</span><small>'+item.name+'</small>':'<span class="sf-hud-slot-empty">+</span>');
  });
 };
 const choose=i=>{active=Math.max(0,Math.min(5,i));update()};
 slots.forEach((slot,i)=>slot.addEventListener('click',()=>choose(i)));
 function drawMap(){
  if(!ctx)return;
  if(mode==='battle'){
   const size=240,c=120,scale=108/790;
   ctx.clearRect(0,0,size,size);ctx.fillStyle='#1e709c';ctx.fillRect(0,0,size,size);
   ctx.beginPath();ctx.arc(c,c,113,0,Math.PI*2);ctx.fillStyle='#d8c68e';ctx.fill();
   ctx.beginPath();ctx.arc(c,c,109,0,Math.PI*2);ctx.fillStyle='#72ae66';ctx.fill();
   ctx.fillStyle='#8d9696';ctx.fillRect(c-2,c-93,4,186);ctx.fillRect(c-93,c-2,186,4);
   for(const p of BR_PLACES){
    const x=c+p.x*scale,z=c+p.z*scale;
    ctx.fillStyle='#d1c5ac';ctx.fillRect(x-11,z-11,22,22);
    ctx.fillStyle='#526f85';for(let i=0;i<4;i++)ctx.fillRect(x-8+(i%2)*9,z-8+Math.floor(i/2)*9,7,7);
   }
   const x=c+(position?.x||0)*scale,z=c+(position?.z||0)*scale;
   ctx.fillStyle='#122c49';ctx.beginPath();ctx.arc(x,z,7,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,z,4.5,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#45d6ff';ctx.beginPath();ctx.arc(x,z,2.8,0,Math.PI*2);ctx.fill();
   drawFullMap();return;
  }
  const size=240,c=120,scale=1.57;
  ctx.clearRect(0,0,size,size);
  const water=ctx.createLinearGradient(0,0,240,240);
  water.addColorStop(0,'#144e86');water.addColorStop(1,'#268cb6');
  ctx.fillStyle=water;ctx.fillRect(0,0,240,240);
  ctx.save();ctx.translate(c,c);
  ctx.fillStyle='#c7b88b';ctx.beginPath();ctx.arc(0,0,115,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#67aa66';ctx.beginPath();ctx.arc(0,0,109,0,Math.PI*2);ctx.fill();
  // Updated minimap uses the same runway, garage and foliage coordinates as Spawn Island.
  ctx.fillStyle='#8a999e';ctx.fillRect(-10,-65,20,100);
  ctx.fillStyle='#d6d4bb';for(let z=-59;z<30;z+=18)ctx.fillRect(-1.2,z,2.4,9);
  ctx.fillStyle='#aeb9ba';ctx.beginPath();ctx.arc(0,17,19,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#e4d7a4';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,17,16,0,Math.PI*2);ctx.stroke();
  const garageLocations=[[0,-48],[-37,-12],[37,-12]];
  for(const [x,z] of garageLocations){
   ctx.save();ctx.translate(x*scale,z*scale);ctx.fillStyle='#405b75';ctx.fillRect(-10,-7,20,14);
   ctx.fillStyle='#9fb3bf';ctx.fillRect(-8,-5,16,10);ctx.restore();
  }
  const hash=n=>((n*1664525+1013904223)>>>0)/4294967296;
  for(const [count,min,max,r,color] of [[24,31,60,4,'#2e774b'],[35,21,63,2.2,'#458b51'],[19,34,67,2.6,'#8e9b87']]){
   ctx.fillStyle=color;
   for(let i=0;i<count;i++){
    const angle=i*2.399963+hash(i+count)*.42;
    const radius=min+(max-min)*Math.sqrt(hash(i*19+count));
    const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
    if(Math.abs(x)<15&&z>-53&&z<35)continue;
    if(z<0&&Math.abs(x)>16&&Math.abs(x)<48&&z>-43)continue;
    if(Math.abs(x)<13&&z<-39)continue;
    ctx.beginPath();ctx.arc(x*scale,z*scale,r,0,Math.PI*2);ctx.fill();
   }
  }
  ctx.restore();
  const px=c+(position?.x||0)*scale,pz=c+(position?.z||0)*scale;
  ctx.beginPath();ctx.arc(px,pz,9,0,Math.PI*2);ctx.fillStyle='#102a47';ctx.fill();
  ctx.beginPath();ctx.arc(px,pz,6,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
  ctx.beginPath();ctx.arc(px,pz,3.5,0,Math.PI*2);ctx.fillStyle='#35d5ff';ctx.fill();
 }
 function drawFullMap(){
  if(!fullCtx||!mapOpen)return;
  const c=380,scale=350/790;
  fullCtx.fillStyle='#1b729d';fullCtx.fillRect(0,0,760,760);
  fullCtx.fillStyle='#d9c991';fullCtx.beginPath();fullCtx.arc(c,c,357,0,Math.PI*2);fullCtx.fill();
  fullCtx.fillStyle='#76b66b';fullCtx.beginPath();fullCtx.arc(c,c,346,0,Math.PI*2);fullCtx.fill();
  fullCtx.fillStyle='#77878d';fullCtx.fillRect(c-7,c-295,14,590);fullCtx.fillRect(c-295,c-7,590,14);
  for(const p of BR_PLACES){const x=c+p.x*scale,z=c+p.z*scale;fullCtx.fillStyle='#b6c6c8';fullCtx.fillRect(x-26,z-26,52,52);fullCtx.fillStyle='#324d65';for(let i=0;i<9;i++)fullCtx.fillRect(x-21+(i%3)*15,z-21+Math.floor(i/3)*15,10,10);fullCtx.font='bold 16px Arial';fullCtx.textAlign='center';fullCtx.lineWidth=4;fullCtx.strokeStyle='#152942';fullCtx.strokeText(p.name,x,z-34);fullCtx.fillStyle='#fff';fullCtx.fillText(p.name,x,z-34)}
  const x=c+(position?.x||0)*scale,z=c+(position?.z||0)*scale;
  fullCtx.beginPath();fullCtx.arc(x,z,12,0,Math.PI*2);fullCtx.fillStyle='#fff';fullCtx.fill();fullCtx.beginPath();fullCtx.arc(x,z,8,0,Math.PI*2);fullCtx.fillStyle='#2ccfff';fullCtx.fill();
 }
 const keydown=e=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;if(/^Digit[1-6]$/.test(e.code)){choose(Number(e.code.slice(-1))-1)}};
 window.addEventListener('keydown',keydown);
 update();drawMap();
 let lastX=NaN,lastZ=NaN;
 return {
  toggleMap(){if(mode!=='battle')return;mapOpen=!mapOpen;fullMap.hidden=!mapOpen;drawFullMap()},
  setMode(next){mode=next;if(next!=='battle'){mapOpen=false;fullMap.hidden=true}el.classList.toggle('sf-hud-spawn',next==='spawn');el.classList.toggle('sf-hud-battle',next==='battle');el.querySelector('.sf-hud-location').textContent=next==='battle'?'BATTLE ROYALE':'SPAWN ISLAND';drawMap()},
  setStamina(value,sprinting,exhausted){
   if(!staminaWrap||!staminaBar)return;
   const amount=Math.max(0,Math.min(100,value));
   staminaBar.style.width=amount+'%';
   if(sprinting||amount<99.9)staminaVisibleUntil=performance.now()+1100;
   const visible=sprinting||amount<99.9||performance.now()<staminaVisibleUntil;
   staminaWrap.classList.toggle('is-visible',visible);
   staminaWrap.classList.toggle('is-exhausted',exhausted);
   staminaWrap.setAttribute('aria-valuenow',String(Math.round(amount)));
  },
  setInventory(items,index){inventoryItems=items;active=index;update()},
  setState(next={}){if(next.health!==undefined)health=Math.max(0,Math.min(100,next.health));if(next.shield!==undefined)shield=Math.max(0,Math.min(100,next.shield));if(next.kills!==undefined)kills=Math.max(0,next.kills);if(next.players!==undefined)players=Math.max(1,next.players);if(next.seconds!==undefined)seconds=Math.max(0,next.seconds);update()},
  updatePosition(){if(position&&(position.x!==lastX||position.z!==lastZ)){lastX=position.x;lastZ=position.z;drawMap()}},
  dispose(){window.removeEventListener('keydown',keydown);el.remove();fullMap.remove()}
 };
}
