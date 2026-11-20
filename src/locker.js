import {mountCharacterPreview,getSkinThumbnail,generateSkinThumbnail} from './characters.js';
import './locker.css';

const categories=[
 {id:'skin',name:'SKIN',title:'SKIN',icon:'◉',items:['Jaxon','Nova']},
 {id:'backpack',name:'BACK BLING',title:'BACK BLING',icon:'▣',items:[]},
 {id:'axe',name:'PICKAXE',title:'PICKAXE',icon:'⚒',items:[]},
 {id:'parachute',name:'GLIDER',title:'GLIDER',icon:'◇',items:[]},
 {id:'skyfall',name:'CONTRAIL',title:'CONTRAIL',icon:'✦',items:[]}
];
const key='skyfront-locker-v1';
let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{}
const equipped=Object.fromEntries(categories.map(c=>[c.id,c.items.includes(saved[c.id])?saved[c.id]:(c.items[0]||'None')]));
let animateView=true;
let disposeCharacterPreview=null;
let section='you',view='overview',active='skin',selected=equipped.skin,search='',sort='default',favoritesOnly=false,equippedOnly=false;
let favorites={};try{favorites=JSON.parse(localStorage.getItem('skyfront-locker-favorites')||'{}')||{}}catch{}
const isFavorite=(category,item)=>Boolean(favorites[category+':'+item]);
function toggleFavorite(category,item){const k=category+':'+item;if(isFavorite(category,item))delete favorites[k];else favorites[k]=true;localStorage.setItem('skyfront-locker-favorites',JSON.stringify(favorites));}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cat=()=>categories.find(c=>c.id===active);
const save=()=>{localStorage.setItem(key,JSON.stringify(equipped));window.dispatchEvent(new CustomEvent('skyfront:cosmetic-changed',{detail:{...equipped}}));};
const favoriteKey=()=>active+':'+selected;
const colors=['#217ad5','#763fd1','#1aabaf','#cc5c91','#5372cc','#2884a7','#b47737','#5d65b8','#178fa2','#7957b4','#257ab7','#af4b84'];
const cosmeticArt=(category,item,index=0)=>{
 if(category==='skin'&&getSkinThumbnail(item))return `<img class="sf-model-thumbnail" src="${getSkinThumbnail(item)}" alt="${esc(item)} 3D model">`;
 const hue=(index*39+category.length*17)%360;
 const palette=['#4ad8ff','#8c79ff','#ff6caa','#f7c35b','#5ef3c4'];
 const a=palette[index%palette.length],b=palette[(index+2)%palette.length];
 const body={
 skin:`<circle cx="50" cy="27" r="13" fill="#f4c9a6"/><path d="M37 18Q50 2 63 18L62 24Q49 17 38 24Z" fill="${b}"/><path d="M26 50Q30 40 42 40H58Q70 40 74 50L80 83H20Z" fill="${a}"/><path d="M37 48L50 58L63 48" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/><path d="M27 53L16 79M73 53L84 79" stroke="${b}" stroke-width="12" stroke-linecap="round"/><path d="M38 82L35 98M62 82L65 98" stroke="#253a73" stroke-width="13" stroke-linecap="round"/>`,
 backpack:`<rect x="23" y="24" width="54" height="67" rx="15" fill="${b}" stroke="#d8f7ff" stroke-width="3"/><path d="M35 28V20Q50 5 65 20V28" fill="none" stroke="${a}" stroke-width="7"/><rect x="29" y="46" width="42" height="35" rx="9" fill="${a}"/><path d="M36 54H64M50 48V70" stroke="#fff" stroke-width="4" opacity=".65"/><rect x="40" y="76" width="20" height="7" rx="3" fill="#fff" opacity=".65"/>`,
 axe:`<g transform="rotate(30 50 55)"><rect x="46" y="17" width="9" height="86" rx="4" fill="#d5e9fa"/><rect x="46" y="70" width="9" height="22" fill="#263f70"/><path d="M50 18Q27 4 19 20L27 43Q38 34 50 37Q63 34 75 43L83 20Q73 4 50 18Z" fill="${a}" stroke="${b}" stroke-width="4"/><path d="M50 17V38" stroke="#fff" stroke-width="4" opacity=".8"/></g>`,
 parachute:`<path d="M9 48Q12 8 50 7Q88 8 91 48Q70 38 50 49Q30 38 9 48Z" fill="${a}" stroke="#d6faff" stroke-width="3"/><path d="M50 8V49M25 22L32 43M75 22L68 43" stroke="${b}" stroke-width="4"/><path d="M10 48L38 86M90 48L62 86M50 49V86" stroke="#e3f4ff" stroke-width="2.5"/><rect x="32" y="82" width="36" height="12" rx="5" fill="#203d77" stroke="${a}" stroke-width="3"/>`,
 skyfall:`<path d="M25 7L12 47L34 40L19 91L64 34L43 38L56 7Z" fill="${a}" stroke="#f5fcff" stroke-width="2"/><path d="M67 20L57 51L76 47L62 93L93 40L76 44L84 20Z" fill="${b}"/><circle cx="79" cy="12" r="5" fill="#fff"/><circle cx="38" cy="90" r="4" fill="#fff"/>`
 }[category]||'';
 return `<svg class="sf-art-svg" viewBox="0 0 100 110" role="img" aria-label="${esc(item)}"><defs><radialGradient id="glow-${category}-${index}"><stop stop-color="${a}" stop-opacity=".38"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient></defs><ellipse cx="50" cy="55" rx="46" ry="51" fill="url(#glow-${category}-${index})"/>${item==='None'?'<path d="M22 25L78 85M78 25L22 85" stroke="#e7f7ff" stroke-width="11" stroke-linecap="round"/>':body}</svg>`;
};

export function getEquippedSkinArt(){const item=equipped.skin;return cosmeticArt('skin',item,Math.max(0,categories[0].items.indexOf(item)));}
export function getEquippedSkinName(){return equipped.skin;}
const emoteCatalog=[
 {id:'wave',name:'Wave',symbol:'👋',color:'#39c8ff'},
 {id:'dance',name:'Victory Dance',symbol:'✦',color:'#c78aff'},
 {id:'salute',name:'Salute',symbol:'★',color:'#f5b85a'},
 {id:'cheer',name:'Cheer',symbol:'🙌',color:'#63d8b3'},
 {id:'point',name:'Point It Out',symbol:'☞',color:'#75b9ff'},
 {id:'clap',name:'Applause',symbol:'👏',color:'#ff87ac'},
 {id:'pose',name:'Hero Pose',symbol:'⚡',color:'#ffcf62'},
 {id:'laugh',name:'Laugh',symbol:'☺',color:'#b5a2ff'},
 {id:'spin',name:'Spin',symbol:'↻',color:'#67e2e9'},
 {id:'hello',name:'Hello There',symbol:'☀',color:'#f3a0d6'},
 {id:'hype',name:'Hype',symbol:'♫',color:'#86d985'},
 {id:'bow',name:'Bow',symbol:'◆',color:'#8eb3ff'}
];
const emoteStorageKey='skyfront-emote-wheel-v1';
const loadWheel=()=>{try{const data=JSON.parse(localStorage.getItem(emoteStorageKey)||'[]');return Array.from({length:6},(_,i)=>emoteCatalog.some(e=>e.id===data?.[i])?data[i]:null)}catch{return Array(6).fill(null)}};
let emoteWheel=loadWheel(),emoteSlot=0,emoteSearch='';
export function getEmoteWheel(){return [...emoteWheel]}
export function getEmoteById(id){return emoteCatalog.find(e=>e.id===id)||null}
function saveEmoteWheel(){localStorage.setItem(emoteStorageKey,JSON.stringify(emoteWheel));window.dispatchEvent(new CustomEvent('skyfront:emote-wheel-changed',{detail:{slots:getEmoteWheel()}}))}
function assignEmote(id){emoteWheel[emoteSlot]=id;saveEmoteWheel();render()}
function emoteMarkup(){
 const filtered=emoteCatalog.filter(e=>e.name.toLowerCase().includes(emoteSearch.toLowerCase()));
 return `<section class="sf-emote-screen">
 <div class="sf-emote-header"><div><div class="sf-loadout-sub">MY LOCKER LOADOUT</div><h1>EMOTES</h1><p>Choose a wheel slot, then pick an emote to assign.</p></div><span class="sf-emote-saved">✓ AUTO SAVED</span></div>
 <div class="sf-emote-layout"><div class="sf-wheel-area">
 <div class="sf-wheel" role="group" aria-label="Six emote wheel slots">
 ${emoteWheel.map((id,i)=>{const em=getEmoteById(id);return `<button type="button" class="sf-wheel-slot ${emoteSlot===i?'active':''} ${em?'filled':''}" data-emote-slot="${i}" aria-label="Slot ${i+1}: ${em?esc(em.name):'Empty'}" aria-pressed="${emoteSlot===i}" style="--slot-angle:${i*60-90}deg;--emote-accent:${em?.color||'#79bce8'}"><span class="sf-wheel-number">${i+1}</span><span class="sf-wheel-symbol">${em?em.symbol:'+'}</span><small>${em?esc(em.name):'EMPTY'}</small></button>`}).join('')}
 <div class="sf-wheel-center"><span>SKYFRONT</span><strong>EMOTE<br>WHEEL</strong><small>6 SLOTS</small></div></div>
 <div class="sf-emote-selection"><span>SELECTED SLOT ${emoteSlot+1}</span><strong>${esc(getEmoteById(emoteWheel[emoteSlot])?.name||'EMPTY')}</strong><button type="button" id="sf-emote-clear" ${!emoteWheel[emoteSlot]?'disabled':''}>REMOVE EMOTE</button></div>
 </div><div class="sf-emote-library"><div class="sf-emote-library-heading"><h2>YOUR EMOTES</h2><small>${emoteCatalog.length} AVAILABLE</small></div><label class="sf-search sf-emote-search"><span>⌕</span><input id="sf-emote-search" type="search" value="${esc(emoteSearch)}" placeholder="Search emotes..." aria-label="Search emotes"></label><div class="sf-emote-grid">${filtered.map(em=>`<button type="button" class="sf-emote-card ${emoteWheel[emoteSlot]===em.id?'active':''}" data-emote-id="${em.id}" style="--emote-accent:${em.color}" aria-label="Assign ${esc(em.name)} to slot ${emoteSlot+1}"><span class="sf-emote-card-symbol">${em.symbol}</span><strong>${esc(em.name)}</strong><small>${emoteWheel.includes(em.id)?'IN WHEEL · ':''}SELECT</small></button>`).join('')||'<p class="sf-no-results">No emotes found.</p>'}</div><p class="sf-emote-help">Click an emote to assign it instantly. Your wheel is saved automatically.</p></div></div></section>`;
}

function tile(item,index,c){
 const fav=isFavorite(c.id,item);
 const chosen=selected===item,eq=equipped[active]===item;
 return `<button type="button" class="sf-cosmetic ${chosen?'is-selected':''}" data-item="${esc(item)}" aria-pressed="${chosen}" title="${esc(item)}" style="--tile-color:${colors[index%colors.length]}">
 <span class="sf-cosmetic-art" aria-hidden="true">${cosmeticArt(c.id,item,index)}</span>
 <span class="sf-cosmetic-name">${esc(item)}</span>
 ${eq?'<span class="sf-equipped">✓</span>':''}<span class="sf-card-favorite ${fav?'is-favorite':''}" data-favorite-item="${esc(item)}" role="button" tabindex="0" aria-label="${fav?'Remove from favorites':'Add to favorites'}" title="${fav?'Remove favorite':'Add favorite'}">${fav?'♥':'♡'}</span></button>`;
}

function openCategory(id){animateView=true;active=id;selected=equipped[id]||'None';search='';sort='default';favoritesOnly=false;equippedOnly=false;view='inventory';render()}
function equipSelected(){if(!cat().items.includes(selected))return;equipped[active]=selected;save();render();const root=document.getElementById('locker-root');root?.querySelector('.sf-cosmetic.is-selected')?.classList.add('sf-equip-flash')}
function render(){
 disposeCharacterPreview?.();disposeCharacterPreview=null;
 const shouldAnimate=animateView;animateView=false;
 const root=document.getElementById('locker-root');if(!root)return;
 for(const name of categories[0].items)generateSkinThumbnail(name).catch(()=>{});
 const c=cat(),isEmotes=section==='emotes',overview=view==='overview'&&!isEmotes;
 const filtered=c.items.map((item,index)=>({item,index})).filter(x=>x.item.toLowerCase().includes(search.toLowerCase())&&(!favoritesOnly||isFavorite(active,x.item))&&(!equippedOnly||equipped[active]===x.item));
 if(sort==='favorites')filtered.sort((a,b)=>Number(isFavorite(active,b.item))-Number(isFavorite(active,a.item))||a.index-b.index);
 if(sort==='az')filtered.sort((a,b)=>a.item.localeCompare(b.item));
 if(sort==='za')filtered.sort((a,b)=>b.item.localeCompare(a.item));
 root.innerHTML=`<div class="sf-locker ${shouldAnimate?'sf-animate-view':'sf-instant-view'} ${overview?'sf-overview':'sf-detail-view'}">
 <aside class="sf-locker-rail"><div class="sf-rail-heading">LOCKER</div><button class="sf-rail-button ${!isEmotes?'active':''}" data-section="you" title="You"><span>◉</span><small>YOU</small></button><div class="sf-rail-divider"></div><button class="sf-rail-button ${isEmotes?'active':''}" data-section="emotes" title="Emotes"><span>♫</span><small>EMOTES</small></button></aside>
 ${isEmotes?emoteMarkup():overview?`<section class="sf-loadout"><div class="sf-loadout-sub">MY LOCKER LOADOUT</div><h1>CHARACTER</h1><div class="sf-loadout-grid">${categories.map(k=>`<button type="button" class="sf-loadout-card" data-category="${k.id}" aria-label="Open ${k.title}"><span class="sf-loadout-icon">${k.items.length?cosmeticArt(k.id,equipped[k.id],Math.max(0,k.items.indexOf(equipped[k.id]))):'<span class="sf-empty-slot-icon">+</span>'}</span><strong>${k.title}</strong><small>${k.items.length?esc(equipped[k.id]):'EMPTY'}</small><span class="sf-loadout-arrow">↗</span></button>`).join('')}</div><div class="sf-loadout-note">MORE COSMETICS COMING SOON</div></section><div class="sf-overview-divider" aria-hidden="true"></div><section class="sf-overview-character"><div class="sf-overview-character-heading"><small>YOUR CHARACTER</small><h2>${esc(equipped.skin)}</h2><span>DRAG TO ROTATE</span></div><div class="sf-character-preview" id="sf-character-preview" aria-label="3D preview of equipped skin"></div></section>`:
 `<div class="sf-preview"><div class="sf-preview-stage"><div class="sf-preview-glow"></div>${active==='skin'&&!isEmotes?'<div class="sf-character-preview" id="sf-character-preview" aria-label="Interactive 3D character preview"></div>':`<div class="sf-preview-object ${active}" style="--preview-color:${colors[Math.max(0,c.items.indexOf(selected))%colors.length]}"><div class="sf-symbol">${selected==='None'?'×':c.icon}</div></div>`}<div class="sf-preview-platform"></div></div><div class="sf-preview-details"><div class="sf-rarity">SKYFRONT ORIGINAL · ${isEmotes?'EMOTE':c.title}</div><h2>${esc(isEmotes?'COMING SOON':selected)}</h2><p>${isEmotes?'Emotes will arrive in a future update.':'Original SKYFRONT cosmetic. Drag the character to rotate.'}</p></div></div>
 <section class="sf-inventory">${isEmotes?`<div class="sf-coming"><h1>EMOTES</h1><p>This category is coming soon.</p><button data-section="you">BACK TO YOU</button></div>`:`
 <div class="sf-inventory-header"><button class="sf-back" id="sf-back" type="button">← BACK</button><h1>CHARACTER</h1></div>
 <div class="sf-category-tabs" role="tablist" aria-label="Cosmetic categories">${categories.map(k=>`<button type="button" role="tab" aria-selected="${active===k.id}" class="${active===k.id?'active':''}" data-category="${k.id}">${k.title}</button>`).join('')}</div>
 <div class="sf-inventory-tools"><label class="sf-search"><span>⌕</span><input id="sf-search" type="search" placeholder="Search ${c.title.toLowerCase()}..." value="${esc(search)}" aria-label="Search cosmetics"></label><select id="sf-sort" aria-label="Sort cosmetics"><option value="default" ${sort==='default'?'selected':''}>DEFAULT</option><option value="favorites" ${sort==='favorites'?'selected':''}>FAVORITES FIRST</option><option value="az" ${sort==='az'?'selected':''}>A–Z</option><option value="za" ${sort==='za'?'selected':''}>Z–A</option></select><button type="button" id="sf-filter" class="${favoritesOnly?'active':''}" title="Show favorites only" aria-pressed="${favoritesOnly}">♥ FAVORITES</button><button type="button" id="sf-equipped-filter" class="${equippedOnly?'active':''}" aria-pressed="${equippedOnly}" title="Show equipped only">✓ EQUIPPED</button></div>
 <div class="sf-item-count">${filtered.length} OF ${c.items.length} COSMETICS · ${c.items.filter(item=>isFavorite(active,item)).length} FAVORITES · DOUBLE-CLICK TO EQUIP</div><div class="sf-cosmetic-grid" id="sf-grid">${filtered.map(x=>tile(x.item,x.index,c)).join('')||(c.items.length===0?'<p class="sf-no-results">NO ITEMS AVAILABLE YET</p>':'<p class="sf-no-results">No matching cosmetics. Try another search or clear your filters.</p>')}</div>
 <div class="sf-inventory-footer"><span>${esc(selected)} ${equipped[active]===selected?'· EQUIPPED':''}</span><div><button type="button" id="sf-favorite" ${!c.items.length?'disabled':''}>${isFavorite(active,selected)?'♥ FAVORITED':'♡ FAVORITE'}</button><button type="button" id="sf-equip" ${!c.items.length||equipped[active]===selected?'disabled':''}>${equipped[active]===selected?'EQUIPPED':'EQUIP'}</button></div></div>`}</section>`}
 </div>`;
 if(!isEmotes&&(overview||active==='skin'))disposeCharacterPreview=mountCharacterPreview(root.querySelector('#sf-character-preview'),overview?equipped.skin:selected);
 root.querySelectorAll('[data-emote-slot]').forEach(b=>b.addEventListener('click',()=>{emoteSlot=Number(b.dataset.emoteSlot);render()}));
 root.querySelectorAll('[data-emote-id]').forEach(b=>b.addEventListener('click',()=>assignEmote(b.dataset.emoteId)));
 root.querySelector('#sf-emote-clear')?.addEventListener('click',()=>{emoteWheel[emoteSlot]=null;saveEmoteWheel();render()});
 root.querySelector('#sf-emote-search')?.addEventListener('input',e=>{emoteSearch=e.target.value;const pos=e.target.selectionStart;render();const next=root.querySelector('#sf-emote-search');next?.focus();next?.setSelectionRange(pos,pos)});
 root.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>{animateView=true;section=b.dataset.section;view='overview';render()}));
 root.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>openCategory(b.dataset.category)));
 root.querySelector('#sf-back')?.addEventListener('click',()=>{animateView=true;view='overview';render()});
 root.querySelectorAll('[data-favorite-item]').forEach(star=>{const change=e=>{e.preventDefault();e.stopPropagation();toggleFavorite(active,star.dataset.favoriteItem);render()};star.addEventListener('click',change);star.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')change(e)})});
 root.querySelectorAll('[data-item]').forEach(b=>{
  b.addEventListener('click',e=>{
   selected=b.dataset.item;
   if(e.detail>=2){clearTimeout(window.__sfLockerClickTimer);equipSelected();return}
   clearTimeout(window.__sfLockerClickTimer);
   window.__sfLockerClickTimer=setTimeout(()=>render(),240);
  });
  b.addEventListener('dblclick',()=>{clearTimeout(window.__sfLockerClickTimer);selected=b.dataset.item;equipSelected()});
 });
 const input=root.querySelector('#sf-search');
 input?.addEventListener('input',()=>{const pos=input.selectionStart;search=input.value;render();const next=root.querySelector('#sf-search');next?.focus();next?.setSelectionRange(pos,pos)});
 root.querySelector('#sf-sort')?.addEventListener('change',e=>{sort=e.target.value;render()});
 root.querySelector('#sf-filter')?.addEventListener('click',()=>{favoritesOnly=!favoritesOnly;render()});
 root.querySelector('#sf-equipped-filter')?.addEventListener('click',()=>{equippedOnly=!equippedOnly;render()});
 root.querySelector('#sf-favorite')?.addEventListener('click',()=>{if(cat().items.includes(selected)){toggleFavorite(active,selected);render()}});
 root.querySelector('#sf-equip')?.addEventListener('click',equipSelected);
}
export function mountLocker(){animateView=true;section='you';view='overview';render()}
export function unmountLocker(){disposeCharacterPreview?.();disposeCharacterPreview=null}

window.addEventListener('skyfront:skin-thumbnail',event=>{
 const {name,url}=event.detail||{};
 if(!name||!url)return;
 document.querySelectorAll('#locker-root .sf-cosmetic[data-item],#locker-root .sf-loadout-card').forEach(card=>{
  const match=card.dataset.item===name||card.querySelector('small')?.textContent===name;
  if(!match)return;
  const art=card.querySelector('.sf-cosmetic-art,.sf-loadout-icon');
  if(art)art.innerHTML='<img class="sf-model-thumbnail" src="'+url+'" alt="'+name+' 3D model">';
 });
 window.dispatchEvent(new CustomEvent('skyfront:skin-art-updated',{detail:{name,url}}));
});
