import './style.css';

const pages = [
  {id:'play',label:'PLAY',icon:'play',colors:['#4b5a9d','#202b5e','#111a3c'],bar:'#27366e'},
  {id:'locker',label:'LOCKER',icon:'shirt',colors:['#427eb7','#234d8d','#112f5e'],bar:'#235488'},
  {id:'shop',label:'SHOP',icon:'bag',colors:['#45a6bd','#246c9d','#163c67'],bar:'#226d8b'},
  {id:'battlepass',label:'BATTLE PASS',icon:'star',colors:['#b46b9f','#663a85','#291c57'],bar:'#693d83'},
  {id:'quests',label:'QUESTS',icon:'flag',colors:['#6baf87','#31716b','#173c52'],bar:'#306b63'},
  {id:'compete',label:'COMPETE',icon:'trophy',colors:['#b27e5c','#82536a','#3e3159'],bar:'#865367'},
  {id:'career',label:'CAREER',icon:'chart',colors:['#6f7da8','#3d487c','#20264f'],bar:'#394b7c'}
];
const svg = (paths) => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg>';
const icons = {
  play:svg('<path d="m8 5 11 7-11 7V5Z"/>'),
  shirt:svg('<path d="m8 4 4 2 4-2 5 4-3 4-2-1v9H8v-9l-2 1-3-4 5-4Z"/>'),
  bag:svg('<rect x="4" y="8" width="16" height="13" rx="2"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>'),
  star:svg('<path d="m12 2 3 6 7 .9-5 4.9 1.3 7L12 17.5 5.7 20.8l1.3-7L2 8.9 9 8l3-6Z"/>'),
  flag:svg('<path d="M5 22V3m0 1c5-4 9 4 15 0v12c-6 4-10-4-15 0"/>'),
  trophy:svg('<path d="M7 3h10v8a5 5 0 0 1-10 0V3Zm0 2H4v3a4 4 0 0 0 3 4m10-7h3v3a4 4 0 0 1-3 4m-5 4v4m-5 1h10"/>'),
  chart:svg('<path d="M4 20V4m0 16h16M8 15l4-5 3 2 5-7"/>')
};
let current = 'play';
const app = document.querySelector('#app');
app.innerHTML = `
  <div class="background" aria-hidden="true"><div class="light light-a"></div><div class="light light-b"></div><div class="horizon"></div><div class="grid-floor"></div></div>
  <div class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">S<span class="brand-spark">✦</span></span><span>SKYFRONT<small>PRE-ALPHA</small></span></div>
      <div class="top-right"><span class="status"><i></i> ONLINE PREVIEW</span><span class="user"><b>S</b><span>PLAYER ONE<small>LEVEL 1</small></span></span></div>
    </header>
    <main class="stage" id="stage" aria-live="polite"></main>
    <footer class="bottom-area"><div class="bottom-info"><span>SKYFRONT <span class="dot">•</span> WEB EDITION</span><span>EARLY ACCESS PREVIEW</span></div><nav class="dock" aria-label="Main navigation"></nav></footer>
  </div>`;
const stage=app.querySelector('#stage');
const dock=app.querySelector('.dock');
dock.innerHTML=pages.map(p=>`<button class="nav-item" type="button" data-page="${p.id}" aria-label="${p.label}">${icons[p.icon]}<span>${p.label}</span></button>`).join('');
dock.addEventListener('click',e=>{const btn=e.target.closest('[data-page]');if(btn) setPage(btn.dataset.page);});
function playMarkup(){
  return `<div class="play-layout">
    <section class="game-panel"><div class="panel-eyebrow"><span class="pulse-dot"></span> THE LOBBY</div><h1>READY FOR<br><em>WHAT'S NEXT?</em></h1><p>Welcome to SKYFRONT. Your next adventure is on its way.</p><div class="mode-card"><div><small>SELECTED MODE</small><strong>COMING SOON</strong></div><span class="mode-icon">✦</span></div><button class="primary-button" type="button" disabled>PLAY <span>SOON</span></button><div class="panel-foot">GAME MODES ARE IN DEVELOPMENT</div></section>
    <div class="center-space" aria-hidden="true"><div class="platform platform-back"></div><div class="platform platform-main"></div><span class="center-caption">YOUR LOBBY. YOUR WAY.</span></div>
    <aside class="side-panel"><div class="side-label">LATEST UPDATE <span>01 / 01</span></div><div class="news-art"><span>SKYFRONT</span><strong>THE<br>BEGINNING.</strong><i>✦</i></div><div class="news-caption">Welcome to the new lobby <span>↗</span></div></aside>
  </div>`;
}
function soonMarkup(p){
  return `<div class="soon-layout"><div class="mascot" aria-hidden="true"><div class="mascot-shadow"></div><div class="mascot-body"><div class="mascot-eye eye-left"></div><div class="mascot-eye eye-right"></div><div class="mascot-mouth"></div><div class="mascot-cheek cheek-left"></div><div class="mascot-cheek cheek-right"></div></div><div class="mascot-arm arm-left"></div><div class="mascot-arm arm-right"></div><div class="mascot-foot foot-left"></div><div class="mascot-foot foot-right"></div><span class="mascot-question">?</span></div><div class="soon-eyebrow">${p.label} / UNDER CONSTRUCTION</div><h1>NOT HERE <em>YET!</em></h1><p>This page doesn't exist yet. Our little friend is working on it.</p><button class="back-button" type="button" id="back-home">← BACK TO LOBBY</button></div>`;
}
function setPage(id){
 const p=pages.find(x=>x.id===id)||pages[0];current=p.id;
 const root=document.documentElement;
 p.colors.forEach((color,i)=>root.style.setProperty('--bg'+(i+1),color));
 root.style.setProperty('--dock',p.bar);
 dock.querySelectorAll('button').forEach(btn=>{const active=btn.dataset.page===id;btn.classList.toggle('active',active);btn.setAttribute('aria-current',active?'page':'false')});
 stage.classList.remove('page-in');void stage.offsetWidth;stage.classList.add('page-in');
 stage.innerHTML=id==='play'?playMarkup():soonMarkup(p);
 stage.querySelector('#back-home')?.addEventListener('click',()=>setPage('play'));
 document.title='SKYFRONT — '+p.label;
}
setPage('play');
