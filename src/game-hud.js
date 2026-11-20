import './game-hud.css';

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
 const canvas=el.querySelector('canvas'),ctx=canvas.getContext('2d');
 const slots=[...el.querySelectorAll('[data-slot]')];
 let active=0,health=100,shield=0,kills=0,players=1,seconds=25;
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
  const size=240,c=size/2,scale=1.5;
  ctx.clearRect(0,0,size,size);
  ctx.fillStyle='#17638e';ctx.fillRect(0,0,size,size);
  ctx.save();ctx.translate(c,c);
  ctx.fillStyle='#d5c18b';ctx.beginPath();ctx.arc(0,0,112,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#74b66d';ctx.beginPath();ctx.arc(0,0,106,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#6aaa63';for(let i=0;i<18;i++){const a=i*2.399,r=45+(i%4)*12;ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,7+(i%3)*2,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle='#899da9';ctx.fillRect(-13,-85,26,140);
  ctx.fillStyle='#e7e0b4';for(let z=-75;z<50;z+=20)ctx.fillRect(-1,z,2,9);
  ctx.fillStyle='#647d96';for(const [x,z,w,h] of [[0,-36,30,20],[-39,-24,19,23],[39,-30,22,20]])ctx.fillRect(x-w/2,z-h/2,w,h);
  ctx.fillStyle='#c58459';for(let i=0;i<10;i++)ctx.fillRect(-55+(i%5)*18,-65+Math.floor(i/5)*13,11,6);
  ctx.restore();
  const px=c+(position?.x||0)*scale,pz=c+(position?.z||0)*scale;
  ctx.beginPath();ctx.arc(px,pz,10,0,Math.PI*2);ctx.fillStyle='#081e3d';ctx.fill();
  ctx.beginPath();ctx.arc(px,pz,6,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
  ctx.beginPath();ctx.arc(px,pz,3.5,0,Math.PI*2);ctx.fillStyle='#31d7ff';ctx.fill();
 }
 const keydown=e=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;if(/^Digit[1-6]$/.test(e.code)){choose(Number(e.code.slice(-1))-1)}};
 window.addEventListener('keydown',keydown);
 update();drawMap();
 let lastX=NaN,lastZ=NaN;
 return {
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
  dispose(){window.removeEventListener('keydown',keydown);el.remove()}
 };
}
