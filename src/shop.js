import './shop.css';

const items=[
{id:'nova',name:'NOVA RUNNER',type:'SKIN',rarity:'legendary',price:2000,section:'FEATURED',desc:'Light up the horizon. A fearless explorer of the upper atmosphere.',symbol:'✦',palette:['#ffba3a','#ee5d63']},
{id:'eclipse',name:'ECLIPSE AGENT',type:'SKIN',rarity:'epic',price:1500,section:'FEATURED',desc:'When the lights go out, the mission begins.',symbol:'◈',palette:['#aa62ff','#3c2c9a']},
{id:'solar',name:'SOLAR AXE',type:'AXE',rarity:'epic',price:800,section:'FEATURED',desc:'A bright new way to break through.',symbol:'⚒',palette:['#ffbc4e','#a746c8']},
{id:'cloud',name:'CLOUD CHASER',type:'PARACHUTE',rarity:'rare',price:800,section:'FEATURED',desc:'Catch the wind and take the scenic route.',symbol:'◇',palette:['#48c7ff','#2562cb']},
{id:'pulse',name:'PULSE STEP',type:'EMOTE',rarity:'rare',price:500,section:'DAILY',desc:'Keep your rhythm wherever you land.',symbol:'♫',palette:['#2bcbbd','#2472bd']},
{id:'orbit',name:'ORBIT PACK',type:'BACKPACK',rarity:'epic',price:600,section:'DAILY',desc:'Carry a little piece of the cosmos.',symbol:'◎',palette:['#bc6eff','#3154b7']},
{id:'frost',name:'FROST SCOUT',type:'SKIN',rarity:'rare',price:1200,section:'DAILY',desc:'Cold weather. Clear skies. Ready for action.',symbol:'❄',palette:['#65e0ff','#3579c8']},
{id:'trail',name:'STAR TRAIL',type:'SKYFALL',rarity:'uncommon',price:300,section:'DAILY',desc:'Leave a trail of starlight behind you.',symbol:'✧',palette:['#53dca8','#188e91']},
{id:'royal',name:'ROYAL COMET',type:'SKIN',rarity:'legendary',price:2200,section:'SPECIAL OFFERS',desc:'A legendary arrival from beyond the clouds.',symbol:'★',palette:['#f7cb56','#d13e91'],special:true},
{id:'nebula',name:'NEBULA WINGS',type:'PARACHUTE',rarity:'epic',price:1200,section:'SPECIAL OFFERS',desc:'Unfold the night sky.',symbol:'❖',palette:['#d374ff','#3d58d8'],special:true}
];
const fmt=n=>new Intl.NumberFormat('en-US').format(n);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const image=item=>'<div class="shop-art" style="--item-a:'+item.palette[0]+';--item-b:'+item.palette[1]+'"><span class="shop-art-orbit"></span><span class="shop-art-symbol" aria-hidden="true">'+item.symbol+'</span><span class="shop-art-spark">✧</span></div>';
let closeModal=()=>{};
export function mountShop(){
 const root=document.querySelector('#shop-root');
 if(!root)return;
 const nextRefresh=()=>{const d=new Date();d.setUTCHours(24,0,0,0);return d;};
 let refresh=nextRefresh();
 root.innerHTML='<div class="sf-shop"><div class="shop-header"><div><span class="shop-kicker">SKYFRONT / COSMETICS</span><h1>ITEM SHOP</h1><p>Discover new looks, gear and emotes.</p></div><div class="shop-refresh"><span>DEMO SHOP ROTATION</span><strong id="shop-countdown">--:--:--</strong><small>Resets at 00:00 UTC · Preview only</small></div></div><div class="shop-layout"><aside class="shop-sidebar"><h2>DISCOVER</h2><a href="#shop-featured">FEATURED</a><a href="#shop-daily">DAILY</a><a href="#shop-special-offers">SPECIAL OFFERS</a><span class="shop-side-note">More collections coming soon.</span></aside><div class="shop-collections" id="shop-collections"></div></div><div class="shop-footer">Cosmetics are preview items. Purchases and accounts are not connected yet.</div></div><div class="shop-modal" id="shop-modal" hidden><div class="shop-modal-shade"></div><section class="shop-inspector" role="dialog" aria-modal="true" aria-labelledby="shop-item-title"><div class="shop-inspect-info"><div class="shop-inspect-top"><span class="shop-inspect-kicker">SKYFRONT / ITEM SHOP</span><button class="shop-close" type="button" data-close aria-label="Back to item shop">✕ <span>EXIT</span></button></div><div class="shop-inspect-feature" id="shop-inspect-feature"></div><span class="shop-inspect-rarity" id="shop-item-rarity"></span><h2 id="shop-item-title"></h2><span class="shop-inspect-type" id="shop-item-type"></span><p id="shop-item-desc"></p><div class="shop-inspect-price"><span class="sf-coin-mark" aria-hidden="true">S</span><strong id="shop-item-price"></strong></div><div class="shop-inspect-actions"><button type="button" class="shop-buy" disabled>AVAILABLE SOON</button><button type="button" class="shop-back" data-close>← BACK TO ITEM SHOP</button></div><small>Cosmetic preview · Purchases are not available yet.</small></div><div class="shop-inspect-art" id="shop-inspect-art"></div></section></div>';
 const collections=root.querySelector('#shop-collections');
 for(const section of ['FEATURED','DAILY','SPECIAL OFFERS']){
  const sectionItems=items.filter(i=>i.section===section);
  const id='shop-'+section.toLowerCase().replaceAll(' ','-');
  collections.insertAdjacentHTML('beforeend','<section class="shop-section" id="'+id+'"><div class="shop-section-title"><h2>'+section+'</h2><span>'+sectionItems.length+' ITEMS</span></div><div class="shop-grid">'+sectionItems.map(item=>'<button type="button" class="shop-item '+(item.special?'shop-special ':'')+'rarity-'+item.rarity+'" data-item="'+item.id+'" aria-label="Inspect '+escapeHTML(item.name)+'">'+(item.special?'<span class="shop-feature-label">SPECIAL</span>':'')+image(item)+'<div class="shop-item-details"><span class="shop-item-type">'+item.type+' · '+item.rarity.toUpperCase()+'</span><strong>'+escapeHTML(item.name)+'</strong><span class="shop-item-price"><span class="sf-coin-mark" aria-hidden="true">S</span>'+fmt(item.price)+'</span></div></button>').join('')+'</div></section>');
 }
 const modal=root.querySelector('#shop-modal');
 document.body.appendChild(modal);
 let lastFocus=null;
 let previousOverflow='';
 let savedScrollY=0;
 let activeItemIndex=0;
 const detail=(item)=>{
  modal.querySelector('#shop-inspect-art').innerHTML=image(item);
  modal.querySelector('#shop-inspect-feature').textContent=item.special?'SPECIAL OFFER':'COSMETIC ITEM';
  modal.querySelector('#shop-item-rarity').textContent=item.rarity.toUpperCase()+' · '+item.type;
  modal.querySelector('#shop-item-rarity').className='shop-inspect-rarity rarity-text-'+item.rarity;
  modal.querySelector('#shop-item-title').textContent=item.name;
  modal.querySelector('#shop-item-type').textContent=item.section;
  modal.querySelector('#shop-item-desc').textContent=item.desc;
  modal.querySelector('#shop-item-price').textContent=fmt(item.price);
 };
 let exitTimer=null;
 let isClosing=false;
 const finishClose=()=>{
  clearTimeout(exitTimer);exitTimer=null;
  modal.hidden=true;modal.classList.remove('shop-is-closing');
  document.body.style.overflow=previousOverflow;
  document.removeEventListener('keydown',onKey);
  isClosing=false;
  window.scrollTo(0,savedScrollY);
  if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
 };
 const close=()=>{
  if(modal.hidden||isClosing)return;
  isClosing=true;
  modal.classList.add('shop-is-closing');
  // Let the short exit animation finish before restoring the shop.
  exitTimer=setTimeout(finishClose,220);
 };
 const onKey=e=>{
  if(e.key==='Escape'){e.preventDefault();close();return}
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
   e.preventDefault();activeItemIndex=(activeItemIndex+(e.key==='ArrowRight'?1:-1)+items.length)%items.length;detail(items[activeItemIndex]);return;
  }
  if(e.key==='Tab'){
   const controls=[...modal.querySelectorAll('button:not([disabled])')].filter(el=>el.getClientRects().length);
   if(!controls.length)return;
   const first=controls[0],last=controls[controls.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
 };
 closeModal=close;
 modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',close));
 collections.addEventListener('click',e=>{
  const button=e.target.closest('[data-item]');if(!button)return;
  const index=items.findIndex(i=>i.id===button.dataset.item);if(index<0)return;
  activeItemIndex=index;lastFocus=button;savedScrollY=window.scrollY;
  previousOverflow=document.body.style.overflow;
  clearTimeout(exitTimer);exitTimer=null;isClosing=false;
  modal.classList.remove('shop-is-closing');
  detail(items[index]);
  modal.hidden=false;
  document.body.style.overflow='hidden';
  modal.querySelector('.shop-close').focus({preventScroll:true});
  document.addEventListener('keydown',onKey);
 });
 const countdown=root.querySelector('#shop-countdown');
 const tick=()=>{
  if(!root.isConnected){clearInterval(timer);document.removeEventListener('keydown',onKey);return}
  const remaining=refresh.getTime()-Date.now();
  if(remaining<=0)refresh=nextRefresh();
  const secs=Math.max(0,Math.floor((refresh.getTime()-Date.now())/1000));
  countdown.textContent=[Math.floor(secs/3600),Math.floor(secs%3600/60),secs%60].map(n=>String(n).padStart(2,'0')).join(':');
 };
 const timer=setInterval(tick,1000);tick();
 return ()=>{clearTimeout(exitTimer);clearInterval(timer);document.removeEventListener('keydown',onKey);document.body.style.overflow=previousOverflow;modal.remove();closeModal=()=>{}};
}
