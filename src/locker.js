import './locker.css';

const categories=[
 {id:'skin',name:'SKIN',title:'SKIN',icon:'◉',items:['Recruit','Sky Scout','Night Runner','Blue Phantom','Storm Ranger','Solar Scout','Frost Agent','Neon Striker','Shadow Guard','Cloud Walker','Aurora','Sky Sentinel']},
 {id:'backpack',name:'BACKPACK',title:'BACKPACK',icon:'▣',items:['None','Field Pack','Jetpack','Signal Pack','Scout Bag','Energy Core','Mini Drone','Star Pack','Travel Kit']},
 {id:'axe',name:'AXE',title:'AXE',icon:'⚒',items:['Standard Axe','Neon Cutter','Storm Blade','Crystal Pick','Skybreaker','Solar Hammer','Frost Edge','Pulse Pick']},
 {id:'parachute',name:'PARACHUTE',title:'PARACHUTE',icon:'◇',items:['Standard Glider','Sky Wing','Cloud Rider','Night Glider','Storm Sail','Blue Comet','Solar Wings','Aero Glider']},
 {id:'skyfall',name:'SKYFALL',title:'SKYFALL',icon:'✦',items:['None','Default Trail','Blue Sparks','Stardust','Comet Trail','Aurora Fall','Electric Rain','Skyfire']}
];
const key='skyfront-locker-v1';
let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{}
const equipped=Object.fromEntries(categories.map(c=>[c.id,c.items.includes(saved[c.id])?saved[c.id]:c.items[0]]));
let section='you',view='overview',active='skin',selected=equipped.skin,search='',sort='default',favoritesOnly=false;
let favorites={};try{favorites=JSON.parse(localStorage.getItem('skyfront-locker-favorites')||'{}')||{}}catch{}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cat=()=>categories.find(c=>c.id===active);
const save=()=>localStorage.setItem(key,JSON.stringify(equipped));
const favoriteKey=()=>active+':'+selected;
const colors=['#217ad5','#763fd1','#1aabaf','#cc5c91','#5372cc','#2884a7','#b47737','#5d65b8','#178fa2','#7957b4','#257ab7','#af4b84'];
const cosmeticArt=(category,item,index=0)=>{
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
function tile(item,index,c){
 const chosen=selected===item,eq=equipped[active]===item;
 return `<button type="button" class="sf-cosmetic ${chosen?'is-selected':''}" data-item="${esc(item)}" aria-pressed="${chosen}" title="${esc(item)}" style="--tile-color:${colors[index%colors.length]}">
 <span class="sf-cosmetic-art" aria-hidden="true">${cosmeticArt(c.id,item,index)}</span>
 <span class="sf-cosmetic-name">${esc(item)}</span>
 ${eq?'<span class="sf-equipped">✓</span>':''}</button>`;
}

function openCategory(id){active=id;selected=equipped[id];search='';sort='default';favoritesOnly=false;view='inventory';render()}
function equipSelected(){equipped[active]=selected;save();render();const root=document.getElementById('locker-root');root?.querySelector('.sf-cosmetic.is-selected')?.classList.add('sf-equip-flash')}
function render(){
 const root=document.getElementById('locker-root');if(!root)return;
 const c=cat(),isEmotes=section==='emotes',overview=view==='overview'&&!isEmotes;
 const filtered=c.items.map((item,index)=>({item,index})).filter(x=>x.item.toLowerCase().includes(search.toLowerCase())&&(!favoritesOnly||favorites[active+':'+x.item]));
 if(sort==='az')filtered.sort((a,b)=>a.item.localeCompare(b.item));
 if(sort==='za')filtered.sort((a,b)=>b.item.localeCompare(a.item));
 root.innerHTML=`<div class="sf-locker ${overview?'sf-overview':'sf-detail-view'}">
 <aside class="sf-locker-rail"><div class="sf-rail-heading">LOCKER</div><button class="sf-rail-button ${!isEmotes?'active':''}" data-section="you" title="You"><span>◉</span><small>YOU</small></button><div class="sf-rail-divider"></div><button class="sf-rail-button ${isEmotes?'active':''}" data-section="emotes" title="Emotes"><span>♫</span><small>EMOTES</small><i>SOON</i></button></aside>
 ${overview?`<section class="sf-loadout"><div class="sf-loadout-sub">MY LOCKER LOADOUT</div><h1>CHARACTER</h1><div class="sf-loadout-grid">${categories.map(k=>`<button type="button" class="sf-loadout-card" data-category="${k.id}" aria-label="Open ${k.title}"><span class="sf-loadout-icon">${cosmeticArt(k.id,equipped[k.id],Math.max(0,k.items.indexOf(equipped[k.id])))}</span><strong>${k.title}</strong><small>${esc(equipped[k.id])}</small><span class="sf-loadout-arrow">↗</span></button>`).join('')}</div><div class="sf-loadout-note">SELECT A SLOT TO CUSTOMIZE YOUR LOADOUT</div></section>`:
 `<div class="sf-preview"><div class="sf-preview-stage"><div class="sf-preview-glow"></div><div class="sf-preview-object ${active}" style="--preview-color:${colors[Math.max(0,c.items.indexOf(selected))%colors.length]}">${active==='skin'||isEmotes?'<div class="sf-human"><div class="sf-head"></div><div class="sf-body"></div><div class="sf-arm left"></div><div class="sf-arm right"></div><div class="sf-leg left"></div><div class="sf-leg right"></div></div>':`<div class="sf-symbol">${selected==='None'?'×':c.icon}</div>`}</div><div class="sf-preview-platform"></div></div><div class="sf-preview-details"><div class="sf-rarity">SKYFRONT ORIGINAL · ${isEmotes?'EMOTE':c.title}</div><h2>${esc(isEmotes?'COMING SOON':selected)}</h2><p>${isEmotes?'Emotes will arrive in a future update.':'Original SKYFRONT cosmetic. 3D assets coming later.'}</p></div></div>
 <section class="sf-inventory">${isEmotes?`<div class="sf-coming"><h1>EMOTES</h1><p>This category is coming soon.</p><button data-section="you">BACK TO YOU</button></div>`:`
 <div class="sf-inventory-header"><button class="sf-back" id="sf-back" type="button">← BACK</button><h1>CHARACTER</h1></div>
 <div class="sf-category-tabs" role="tablist" aria-label="Cosmetic categories">${categories.map(k=>`<button type="button" role="tab" aria-selected="${active===k.id}" class="${active===k.id?'active':''}" data-category="${k.id}">${k.title}</button>`).join('')}</div>
 <div class="sf-inventory-tools"><label class="sf-search"><span>⌕</span><input id="sf-search" type="search" placeholder="Search ${c.title.toLowerCase()}..." value="${esc(search)}" aria-label="Search cosmetics"></label><select id="sf-sort" aria-label="Sort cosmetics"><option value="default" ${sort==='default'?'selected':''}>DEFAULT</option><option value="az" ${sort==='az'?'selected':''}>A–Z</option><option value="za" ${sort==='za'?'selected':''}>Z–A</option></select><button type="button" id="sf-filter" class="${favoritesOnly?'active':''}" title="Show favorites only">♥</button></div>
 <div class="sf-item-count">${filtered.length} COSMETICS · DOUBLE-CLICK TO EQUIP</div><div class="sf-cosmetic-grid" id="sf-grid">${filtered.map(x=>tile(x.item,x.index,c)).join('')||'<p class="sf-no-results">No cosmetics found.</p>'}</div>
 <div class="sf-inventory-footer"><span>${esc(selected)} ${equipped[active]===selected?'· EQUIPPED':''}</span><div><button type="button" id="sf-favorite">${favorites[favoriteKey()]?'♥ FAVORITED':'♡ FAVORITE'}</button><button type="button" id="sf-equip" ${equipped[active]===selected?'disabled':''}>${equipped[active]===selected?'EQUIPPED':'EQUIP'}</button></div></div>`}</section>`}
 </div>`;
 root.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>{section=b.dataset.section;view='overview';render()}));
 root.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>openCategory(b.dataset.category)));
 root.querySelector('#sf-back')?.addEventListener('click',()=>{view='overview';render()});
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
 root.querySelector('#sf-favorite')?.addEventListener('click',()=>{favorites[favoriteKey()]=!favorites[favoriteKey()];localStorage.setItem('skyfront-locker-favorites',JSON.stringify(favorites));render()});
 root.querySelector('#sf-equip')?.addEventListener('click',equipSelected);
}
export function mountLocker(){section='you';view='overview';render()}
