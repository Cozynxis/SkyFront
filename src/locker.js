import './locker.css';

const categories=[
 {id:'skin',name:'SKIN',title:'OUTFIT',icon:'◉',items:['Recruit','Sky Scout','Night Runner','Blue Phantom','Storm Ranger','Solar Scout','Frost Agent','Neon Striker','Shadow Guard','Cloud Walker','Aurora','Sky Sentinel']},
 {id:'backpack',name:'BACKPACK',title:'BACK BLING',icon:'▣',items:['None','Field Pack','Jetpack','Signal Pack','Scout Bag','Energy Core','Mini Drone','Star Pack','Travel Kit']},
 {id:'axe',name:'AXE',title:'PICKAXE',icon:'⚒',items:['Standard Axe','Neon Cutter','Storm Blade','Crystal Pick','Skybreaker','Solar Hammer','Frost Edge','Pulse Pick']},
 {id:'parachute',name:'PARACHUTE',title:'GLIDER',icon:'◇',items:['Standard Glider','Sky Wing','Cloud Rider','Night Glider','Storm Sail','Blue Comet','Solar Wings','Aero Glider']},
 {id:'skyfall',name:'SKYFALL',title:'CONTRAIL',icon:'✦',items:['None','Default Trail','Blue Sparks','Stardust','Comet Trail','Aurora Fall','Electric Rain','Skyfire']}
];
const key='skyfront-locker-v1';
let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{}
const equipped=Object.fromEntries(categories.map(c=>[c.id,c.items.includes(saved[c.id])?saved[c.id]:c.items[0]]));
let section='you',active='skin',selected=equipped.skin,search='',sort='default',favoritesOnly=false;
let favorites={};try{favorites=JSON.parse(localStorage.getItem('skyfront-locker-favorites')||'{}')||{}}catch{}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cat=()=>categories.find(c=>c.id===active);
const save=()=>localStorage.setItem(key,JSON.stringify(equipped));
const favoriteKey=()=>active+':'+selected;
const colors=['#217ad5','#763fd1','#1aabaf','#cc5c91','#5372cc','#2884a7','#b47737','#5d65b8','#178fa2','#7957b4','#257ab7','#af4b84'];
function tile(item,index,c){
 const chosen=selected===item,eq=equipped[active]===item;
 return `<button type="button" class="sf-cosmetic ${chosen?'is-selected':''}" data-item="${esc(item)}" aria-pressed="${chosen}" title="${esc(item)}" style="--tile-color:${colors[index%colors.length]}">
 <span class="sf-cosmetic-art" aria-hidden="true">${item==='None'?'×':c.icon}</span>
 <span class="sf-cosmetic-name">${esc(item)}</span>
 ${eq?'<span class="sf-equipped">✓</span>':''}</button>`;
}
function render(){
 const root=document.getElementById('locker-root');if(!root)return;
 const c=cat();const all=c.items.map((item,index)=>({item,index}));
 const filtered=all.filter(x=>x.item.toLowerCase().includes(search.toLowerCase())&&(!favoritesOnly||favorites[active+':'+x.item]));
 if(sort==='az')filtered.sort((a,b)=>a.item.localeCompare(b.item));
 if(sort==='za')filtered.sort((a,b)=>b.item.localeCompare(a.item));
 const isEmotes=section==='emotes';
 root.innerHTML=`<div class="sf-locker">
  <aside class="sf-locker-rail"><div class="sf-rail-heading">LOCKER</div><button class="sf-rail-button ${!isEmotes?'active':''}" data-section="you" title="You"><span>◉</span><small>YOU</small></button><div class="sf-rail-divider"></div><button class="sf-rail-button ${isEmotes?'active':''}" data-section="emotes" title="Emotes"><span>♫</span><small>EMOTES</small><i>SOON</i></button></aside>
  <div class="sf-preview"><div class="sf-preview-stage"><div class="sf-preview-glow"></div><div class="sf-preview-object ${active}" style="--preview-color:${colors[Math.max(0,c.items.indexOf(selected))%colors.length]}">
  ${active==='skin'||isEmotes?'<div class="sf-human"><div class="sf-head"></div><div class="sf-body"></div><div class="sf-arm left"></div><div class="sf-arm right"></div><div class="sf-leg left"></div><div class="sf-leg right"></div></div>':`<div class="sf-symbol">${selected==='None'?'×':c.icon}</div>`}
  </div><div class="sf-preview-platform"></div></div>
  <div class="sf-preview-details"><div class="sf-rarity">SKYFRONT ORIGINAL · ${isEmotes?'EMOTE':c.title}</div><h2>${esc(isEmotes?'COMING SOON':selected)}</h2><p>${isEmotes?'Emotes will arrive in a future update.':'A SKYFRONT cosmetic preview. Original models and artwork will be added later.'}</p></div></div>
  <section class="sf-inventory">${isEmotes?`<div class="sf-coming"><h1>EMOTES</h1><p>This category is coming soon.</p><button data-section="you">BACK TO YOU</button></div>`:`
   <h1>CHARACTER</h1><div class="sf-category-tabs" role="tablist" aria-label="Cosmetic categories">${categories.map(k=>`<button type="button" role="tab" aria-selected="${active===k.id}" class="${active===k.id?'active':''}" data-category="${k.id}">${k.title}</button>`).join('')}</div>
   <div class="sf-inventory-tools"><label class="sf-search"><span>⌕</span><input id="sf-search" type="search" placeholder="Search ${c.title.toLowerCase()}..." value="${esc(search)}" aria-label="Search cosmetics"></label><select id="sf-sort" aria-label="Sort cosmetics"><option value="default" ${sort==='default'?'selected':''}>DEFAULT</option><option value="az" ${sort==='az'?'selected':''}>A–Z</option><option value="za" ${sort==='za'?'selected':''}>Z–A</option></select><button type="button" id="sf-filter" class="${favoritesOnly?'active':''}" title="Show favorites only">♥</button></div>
   <div class="sf-item-count">${filtered.length} COSMETICS</div><div class="sf-cosmetic-grid" id="sf-grid">${filtered.map(x=>tile(x.item,x.index,c)).join('')||'<p class="sf-no-results">No cosmetics found.</p>'}</div>
   <div class="sf-inventory-footer"><span>${esc(selected)} ${equipped[active]===selected?'· EQUIPPED':''}</span><div><button type="button" id="sf-favorite" aria-label="Toggle favorite">${favorites[favoriteKey()]?'♥ FAVORITED':'♡ FAVORITE'}</button><button type="button" id="sf-equip" ${equipped[active]===selected?'disabled':''}>${equipped[active]===selected?'EQUIPPED':'EQUIP'}</button></div></div>`}</section>
 </div>`;
 root.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>{section=b.dataset.section;render()}));
 root.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.category;selected=equipped[active];search='';sort='default';favoritesOnly=false;render()}));
 root.querySelectorAll('[data-item]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.item;render()}));
 const input=root.querySelector('#sf-search');
 input?.addEventListener('input',()=>{const pos=input.selectionStart;search=input.value;render();const next=root.querySelector('#sf-search');next?.focus();next?.setSelectionRange(pos,pos)});
 root.querySelector('#sf-sort')?.addEventListener('change',e=>{sort=e.target.value;render()});
 root.querySelector('#sf-filter')?.addEventListener('click',()=>{favoritesOnly=!favoritesOnly;render()});
 root.querySelector('#sf-favorite')?.addEventListener('click',()=>{favorites[favoriteKey()]=!favorites[favoriteKey()];localStorage.setItem('skyfront-locker-favorites',JSON.stringify(favorites));render()});
 root.querySelector('#sf-equip')?.addEventListener('click',()=>{equipped[active]=selected;save();render()});
}
export function mountLocker(){render()}
