import './locker.css';
const categories=[
 {id:'skin',name:'SKIN',icon:'◉',items:['Recruit','Sky Scout','Night Runner','Blue Phantom']},
 {id:'backpack',name:'BACKPACK',icon:'▣',items:['None','Field Pack','Jetpack','Signal Pack']},
 {id:'axe',name:'AXE',icon:'⚒',items:['Standard Axe','Neon Cutter','Storm Blade','Crystal Pick']},
 {id:'parachute',name:'PARACHUTE',icon:'◇',items:['Standard Glider','Sky Wing','Cloud Rider','Night Glider']},
 {id:'skyfall',name:'SKYFALL',icon:'✦',items:['Default Trail','Blue Sparks','Stardust','Comet Trail']}
];
const storageKey='skyfront-locker-v1';
let saved={};
try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')||{}}catch{}
const equipped=Object.fromEntries(categories.map(c=>[c.id,c.items.includes(saved[c.id])?saved[c.id]:c.items[0]]));
let tab='you',active='skin',editing=false;
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function symbol(id){return categories.find(c=>c.id===id)?.icon||'✦'}
function render(){
 const root=document.querySelector('#locker-root');if(!root)return;
 const current=categories.find(c=>c.id===active);
 root.innerHTML=`<div class="locker-ui">
  <aside class="locker-sidebar"><div class="locker-side-title">LOCKER</div><button class="locker-tab ${tab==='you'?'on':''}" data-tab="you"><span>◉</span><span>YOU</span></button><div class="locker-divider"></div><button class="locker-tab ${tab==='emotes'?'on':''}" data-tab="emotes"><span>♫</span><span>EMOTES</span><small>SOON</small></button></aside>
  <div class="locker-content">${tab==='you'?`
    <div class="locker-eyebrow">MY LOCKER LOADOUT</div><h1>CHARACTER</h1>
    <div class="locker-slot-grid">${categories.map(c=>`<button class="locker-slot ${active===c.id?'on':''}" data-slot="${c.id}" title="${c.name}"><span class="locker-slot-icon">${c.icon}</span><span class="locker-slot-label">${c.name}</span><small>${safe(equipped[c.id])}</small></button>`).join('')}</div>
    <div class="locker-actions"><button id="locker-change" class="locker-action-main">CHANGE ${current.name}</button><button id="locker-reset" class="locker-action-alt">RESET LOADOUT</button></div>
    ${editing?`<section class="locker-picker" aria-label="Choose ${current.name}"><div class="locker-picker-head"><h2>SELECT ${current.name}</h2><button id="locker-close-picker" aria-label="Close picker">×</button></div><div class="locker-item-grid">${current.items.map((item,i)=>`<button class="locker-item ${equipped[active]===item?'on':''}" data-item="${safe(item)}"><span class="locker-item-symbol">${current.icon}</span><strong>${safe(item)}</strong><small>${equipped[active]===item?'EQUIPPED':'SELECT'}</small></button>`).join('')}</div></section>`:''}
   `:`<div class="locker-coming"><span>♫</span><h1>EMOTES</h1><p>Emotes are coming to SKYFRONT.</p><button data-tab="you">BACK TO YOU</button></div>`}</div>
  <aside class="locker-preview"><div class="locker-preview-art"><div class="locker-preview-halo"></div><div class="locker-avatar"><div class="locker-avatar-head"></div><div class="locker-avatar-body"></div><div class="locker-avatar-legs"></div></div><div class="locker-preview-ground"></div></div><div class="locker-preview-caption"><small>${tab==='you'?'CURRENTLY EQUIPPED':'LOCKER CATEGORY'}</small><h2>${tab==='you'?safe(equipped[active]):'EMOTES'}</h2><p>${tab==='you'?current.name:'COMING SOON'}</p></div></aside>
 </div>`;
 root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;editing=false;render()}));
 root.querySelectorAll('[data-slot]').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.slot;editing=false;render()}));
 root.querySelector('#locker-change')?.addEventListener('click',()=>{editing=!editing;render()});
 root.querySelector('#locker-close-picker')?.addEventListener('click',()=>{editing=false;render()});
 root.querySelectorAll('[data-item]').forEach(b=>b.addEventListener('click',()=>{equipped[active]=b.dataset.item;localStorage.setItem(storageKey,JSON.stringify(equipped));editing=false;render()}));
 root.querySelector('#locker-reset')?.addEventListener('click',()=>{categories.forEach(c=>equipped[c.id]=c.items[0]);localStorage.setItem(storageKey,JSON.stringify(equipped));editing=false;render()});
}
export function mountLocker(){render()}
