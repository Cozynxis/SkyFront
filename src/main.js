import {installLobbyNews,refreshLobbyNews} from './lobby-news.js';
import {showLoadingScreen} from './loading-screen.js';
import {mountGameplay} from './gameplay.js';
import { mountLocker, unmountLocker, getEquippedSkinName } from './locker.js';
import { mountCharacterPreview } from './characters.js';
import { mountShop } from './shop.js';
import { mountFrontPass } from './frontpass.js';
import { installAudio, readSettings, playReadySound, stopLobbyMusic, resumeLobbyMusic } from './audio.js';
import { mountCareer } from './career.js';
import { mountCommunity } from './community.js';
import { installAuthGate } from './auth.js';
import { installAccountMenu } from './account-menu.js';
import { installFriends } from './friends.js';
import { installParty } from './party.js';
import { supabase } from './community.js';
import './style.css';

const pages = [
  {id:'play',label:'PLAY',icon:'play',colors:['#4b5a9d','#202b5e','#111a3c'],bar:'#27366e'},
  {id:'locker',label:'LOCKER',icon:'shirt',colors:['#427eb7','#234d8d','#112f5e'],bar:'#235488'},
  {id:'shop',label:'SHOP',icon:'bag',colors:['#45a6bd','#246c9d','#163c67'],bar:'#226d8b'},
  {id:'battlepass',label:'FRONTPASS',icon:'star',colors:['#b46b9f','#663a85','#291c57'],bar:'#693d83'},
  {id:'quests',label:'QUESTS',icon:'flag',colors:['#6baf87','#31716b','#173c52'],bar:'#306b63'},
  {id:'compete',label:'COMPETE',icon:'trophy',colors:['#b27e5c','#82536a','#3e3159'],bar:'#865367'},
  {id:'career',label:'CAREER',icon:'chart',colors:['#6f7da8','#3d487c','#20264f'],bar:'#394b7c'},
  {id:'community',label:'COMMUNITY',icon:'users',colors:['#b83f56','#85283e','#36172e'],bar:'#762a42'}
];
const svg = (paths) => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg>';
const icons = {
  play:svg('<path d="m8 5 11 7-11 7V5Z"/>'),
  shirt:svg('<path d="m8 4 4 2 4-2 5 4-3 4-2-1v9H8v-9l-2 1-3-4 5-4Z"/>'),
  bag:svg('<rect x="4" y="8" width="16" height="13" rx="2"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>'),
  star:svg('<path d="m12 2 3 6 7 .9-5 4.9 1.3 7L12 17.5 5.7 20.8l1.3-7L2 8.9 9 8l3-6Z"/>'),
  flag:svg('<path d="M5 22V3m0 1c5-4 9 4 15 0v12c-6 4-10-4-15 0"/>'),
  trophy:svg('<path d="M7 3h10v8a5 5 0 0 1-10 0V3Zm0 2H4v3a4 4 0 0 0 3 4m10-7h3v3a4 4 0 0 1-3 4m-5 4v4m-5 1h10"/>'),
  chart:svg('<path d="M4 20V4m0 16h16M8 15l4-5 3 2 5-7"/>'),
  users:svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>')
};
const logoUrl = import.meta.env.BASE_URL + 'images/skyfront-logo.png';
let selectedTeam='SOLO';
let fillMode='FILL';
let current = 'play';
let pageEvents=new AbortController();
let cleanupShop=null;
let cleanupFrontPass=null;
let cleanupCareer=null;
let cleanupCommunity=null;
const lobbyPreviewCleanup=new Map();
let localPlayerId=null;
supabase.auth.getUser().then(({data})=>{localPlayerId=data?.user?.id||null;if(current==='play')renderLobbyParty(window.__sfPartyMembers||[])}).catch(()=>{});
supabase.auth.onAuthStateChange((_event,session)=>{localPlayerId=session?.user?.id||null;if(current==='play')queueMicrotask(()=>renderLobbyParty(window.__sfPartyMembers||[]));});
function clearLobbyPreviews(){for(const cleanup of lobbyPreviewCleanup.values())cleanup();lobbyPreviewCleanup.clear();}
const app = document.querySelector('#app');
app.innerHTML = `
  <div class="background" aria-hidden="true"><div class="light light-a"></div><div class="light light-b"></div><div class="horizon"></div><div class="grid-floor"></div></div>
  <div class="shell">
    <header class="topbar">
      <div class="brand"><img class="brand-logo" src="${logoUrl}" alt="SKYFRONT logo"><span>SKYFRONT<small class="alpha-version">Alpha V1.0.0</small></span></div>
      <div class="top-right"><div class="wallet" aria-label="S coins balance"><span class="sf-coin-mark" aria-hidden="true">S</span><strong id="wallet-balance">100,000</strong></div><span class="user"><b><img class="profile-logo" src="${logoUrl}" alt=""></b><span id="sf-profile-name">PLAYER ONE<small>LEVEL 1</small></span></span><button id="sf-signout" type="button" title="Sign out of SKYFRONT" aria-label="Sign out of SKYFRONT">LOG OUT</button></div>
    </header>
    <div class="shop-top-nav" id="shop-top-nav" aria-label="Shop quick navigation"></div>
    <main class="stage" id="stage" aria-live="polite"></main>
    <footer class="bottom-area"><nav class="dock" aria-label="Main navigation"></nav></footer>
  </div>`;
function applyVisualSettings(settings=readSettings()){
 document.body.classList.toggle('sf-settings-no-animations',!settings.animations);
 document.body.classList.toggle('sf-settings-low',settings.quality==='low');
 document.body.classList.toggle('sf-settings-medium',settings.quality==='medium');
}
window.addEventListener('skyfront:settings-changed',e=>applyVisualSettings(e.detail));
applyVisualSettings();
// Lightweight real FPS counter; updates twice per second without rerendering the UI.
const fpsIndicator=document.createElement('div');
fpsIndicator.id='sf-fps-counter';
fpsIndicator.setAttribute('aria-label','Frames per second');
fpsIndicator.hidden=!readSettings().showFps;
fpsIndicator.textContent='-- FPS';
document.body.appendChild(fpsIndicator);
let fpsFrames=0,fpsWindowStart=0;
let fpsEnabled=Boolean(readSettings().showFps);
function sampleFps(now){
 if(!document.hidden&&fpsEnabled){
  if(!fpsWindowStart)fpsWindowStart=now;
  fpsFrames++;
  if(now-fpsWindowStart>=500){
   fpsIndicator.textContent=Math.round(fpsFrames*1000/(now-fpsWindowStart))+' FPS';
   fpsFrames=0;fpsWindowStart=now;
  }
 }else{fpsFrames=0;fpsWindowStart=0;}
 requestAnimationFrame(sampleFps);
}
requestAnimationFrame(sampleFps);
document.addEventListener('visibilitychange',()=>{fpsFrames=0;fpsWindowStart=0;});
window.addEventListener('skyfront:settings-changed',e=>{
 fpsEnabled=Boolean(e.detail.showFps);
 fpsIndicator.hidden=!fpsEnabled;
 if(!e.detail.showFps){fpsFrames=0;fpsWindowStart=0;}
});
installLobbyNews();
installAuthGate();
installAccountMenu();
installFriends();
installParty();
const stage=app.querySelector('#stage');
const dock=app.querySelector('.dock');
const shopTopNav=app.querySelector('#shop-top-nav');
dock.innerHTML=pages.map(p=>`<button class="nav-item" type="button" data-page="${p.id}" aria-label="${p.label}">${icons[p.icon]}<span>${p.label}</span></button>`).join('');
dock.addEventListener('click',e=>{const btn=e.target.closest('[data-page]');if(btn) setPage(btn.dataset.page);});
shopTopNav.innerHTML=pages.map(p=>`<button type="button" class="shop-nav-link" data-page="${p.id}">${p.label}</button>`).join('');
shopTopNav.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)setPage(b.dataset.page)});
function playMarkup(){
  return `<div class="play-layout">
    <aside class="side-panel" id="sf-lobby-news"></aside>
    <div class="center-space"><div class="sf-lobby-scene" id="sf-lobby-scene"><div class="sf-lobby-party" id="sf-lobby-party" aria-label="Party players"></div></div></div>
    <section class="game-panel"><div class="panel-eyebrow"><span class="pulse-dot"></span> THE LOBBY</div><h1>READY TO PLAY?</h1><button class="mode-card mode-selector" id="select-mode" type="button"><div><small>SELECTED MODE</small><strong id="mode-label">BATTLE ROYALE · SOLO</strong></div><span class="mode-icon">⌄</span></button><button class="primary-button" id="start-play" type="button">PLAY <span>ALPHA</span></button></section>
  </div><div class="mode-overlay" id="mode-overlay" hidden><div class="mode-backdrop" id="mode-backdrop"></div><section class="mode-dialog" role="dialog" aria-modal="true" aria-labelledby="mode-heading"><div class="mode-heading"><h2 id="mode-heading">SELECT GAME MODE</h2><button class="mode-close" id="mode-close" type="button" aria-label="Close">×</button></div><div class="mode-grid"><button class="mode-tile selected" id="battle-royale-tile" type="button"><img class="mode-logo" src="${logoUrl}" alt=""><strong>BATTLE ROYALE</strong><small>LAST PLAYER STANDING</small></button><div class="mode-tile locked"><img class="mode-logo" src="${logoUrl}" alt=""><strong>COMING SOON</strong></div><div class="mode-tile locked"><img class="mode-logo" src="${logoUrl}" alt=""><strong>COMING SOON</strong></div><div class="mode-tile locked"><img class="mode-logo" src="${logoUrl}" alt=""><strong>COMING SOON</strong></div></div><div class="team-options" id="team-options" hidden><h3>TEAM SETTINGS</h3><div class="team-buttons"><button data-team="SOLO" class="selected" type="button">SOLO</button><button data-team="DUO" type="button">DUO</button><button data-team="SQUAD" type="button">SQUAD</button></div><div class="fill-options" id="fill-options" hidden><span class="fill-title">TEAMMATES</span><div class="fill-buttons"><button type="button" data-fill="FILL" class="selected">FILL</button><button type="button" data-fill="NO-FILL">NO-FILL</button></div><p id="fill-description">Match with random teammates.</p></div><button class="mode-confirm" id="mode-confirm" type="button">CONFIRM SELECTION</button></div></section></div>`;
}
function soonMarkup(p){
  const isUpcoming = p.id==='quests' || p.id==='compete';
  const heading = isUpcoming ? 'COMING <em>SOON!</em>' : 'NOT HERE <em>YET!</em>';
  const description = isUpcoming ? `${p.label} is in development. Stay tuned!` : "This page doesn't exist yet. Our little friend is working on it.";
  return `<div class="soon-layout"><div class="mascot" aria-hidden="true"><div class="mascot-shadow"></div><div class="mascot-body"><div class="mascot-eye eye-left"></div><div class="mascot-eye eye-right"></div><div class="mascot-mouth"></div><div class="mascot-cheek cheek-left"></div><div class="mascot-cheek cheek-right"></div></div><div class="mascot-arm arm-left"></div><div class="mascot-arm arm-right"></div><div class="mascot-foot foot-left"></div><div class="mascot-foot foot-right"></div><span class="mascot-question">?</span></div><div class="soon-eyebrow">${p.label} / UNDER CONSTRUCTION</div><h1>${heading}</h1><p>${description}</p><button class="back-button" type="button" id="back-home">← BACK TO LOBBY</button></div>`;
}
function setPage(id){
 document.body.classList.toggle('sf-on-play',id==='play');
 if(id!=='play')document.dispatchEvent(new Event('sf:leave-play'));
 if(id===current && stage.childElementCount)return;
 unmountLocker();
 clearLobbyPreviews();
 pageEvents.abort();pageEvents=new AbortController();
 if(cleanupShop){cleanupShop();cleanupShop=null;}
 if(cleanupFrontPass){cleanupFrontPass();cleanupFrontPass=null;}
 if(cleanupCareer){cleanupCareer();cleanupCareer=null;}
 if(cleanupCommunity){cleanupCommunity();cleanupCommunity=null;}
 const p=pages.find(x=>x.id===id)||pages[0];current=p.id;
 document.body.classList.toggle('locker-page',p.id==='locker');
 document.body.classList.toggle('shop-page',p.id==='shop');
 document.body.classList.toggle('community-page',p.id==='community');
 document.body.classList.toggle('frontpass-page',p.id==='battlepass');
 shopTopNav.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===p.id));
 const root=document.documentElement;
 p.colors.forEach((color,i)=>root.style.setProperty('--bg'+(i+1),color));
 root.style.setProperty('--dock',p.bar);
 dock.querySelectorAll('button').forEach(btn=>{const active=btn.dataset.page===id;btn.classList.toggle('active',active);btn.setAttribute('aria-current',active?'page':'false')});
 stage.classList.remove('page-in');void stage.offsetWidth;stage.classList.add('page-in');
 stage.innerHTML=id==='play'?playMarkup():id==='locker'?'<div id="locker-root" style="width:100%"></div>':id==='shop'?'<div id="shop-root" style="width:100%"></div>':id==='battlepass'?'<div id="frontpass-root" style="width:100%"></div>':id==='career'?'<div id="career-root" style="width:100%"></div>':id==='community'?'<div id="community-root" style="width:100%"></div>':soonMarkup(p);
 stage.querySelector('#back-home')?.addEventListener('click',()=>setPage('play'));
 if(id==='play'){initModeSelector(); renderLobbyParty(window.__sfPartyMembers||[]);refreshLobbyNews();}
 if(id==='locker') mountLocker();
 if(id==='shop') cleanupShop=mountShop();
 if(id==='battlepass') cleanupFrontPass=mountFrontPass();
 if(id==='career') cleanupCareer=mountCareer();
 if(id==='community') cleanupCommunity=mountCommunity();
 document.title='SKYFRONT — '+p.label;
}
installAudio();
const savedCoins=localStorage.getItem('sf-coins-balance');
if(savedCoins!==null && Number.isFinite(Number(savedCoins))) document.querySelector('#wallet-balance').textContent=Number(savedCoins).toLocaleString('en-US');
setPage('play');

function initModeSelector(){
 const playButton=stage.querySelector('#start-play');
 playButton?.addEventListener('click',()=>{
  playReadySound();
  playButton.disabled=true;
  const partySize=(window.__sfPartyMembers||[]).length||1;
  let cancelLoad=()=>{};
  cancelLoad=showLoadingScreen({team:selectedTeam,fill:fillMode,partySize,onCancel:()=>{playButton.disabled=false},onReady:()=>{
   if(current!=='play'){playButton.disabled=false;return;}
   stopLobbyMusic();
   const gameplayRoot=document.createElement('div');gameplayRoot.className='sf-gameplay';document.body.append(gameplayRoot);
   document.dispatchEvent(new Event('sf:leave-play'));
   const cleanup=mountGameplay(gameplayRoot,{onExit:()=>{gameplayRoot.remove();playButton.disabled=false;resumeLobbyMusic();document.dispatchEvent(new Event('sf:return-play'))}});
   pageEvents.signal.addEventListener('abort',()=>{cleanup();gameplayRoot.remove();resumeLobbyMusic()},{once:true});
  }});
  pageEvents.signal.addEventListener('abort',cancelLoad,{once:true});
 },{signal:pageEvents.signal});
 const overlay=stage.querySelector('#mode-overlay');
 const options=overlay.querySelector('#team-options');
 const label=stage.querySelector('#mode-label');
 const trigger=stage.querySelector('#select-mode');
 // The animated stage uses transforms, so the fixed overlay must live outside it.
 document.body.appendChild(overlay);
 label.textContent=modeLabel();
 let previousFocus=null;
 let closeTimer;
 const renderTeam=()=>{
   options.querySelectorAll('[data-team]').forEach(button=>{
     const active=button.dataset.team===selectedTeam;
     button.classList.toggle('selected',active);
     button.setAttribute('aria-pressed',String(active));
   });
   const fillOptions=overlay.querySelector('#fill-options');
   fillOptions.hidden=selectedTeam==='SOLO';
   fillOptions.querySelectorAll('[data-fill]').forEach(button=>{
     const active=button.dataset.fill===fillMode;
     button.classList.toggle('selected',active);
     button.setAttribute('aria-pressed',String(active));
   });
   overlay.querySelector('#fill-description').textContent=fillMode==='FILL'
     ? 'Match with random teammates.'
     : 'Enter without random teammates. Opponents can still be full teams.';
 };
 const close=()=>{
   if(overlay.hidden)return;
   overlay.classList.remove('visible');
   clearTimeout(closeTimer);
   closeTimer=setTimeout(()=>{overlay.hidden=true;previousFocus?.focus();},290);
 };
 const open=()=>{
   clearTimeout(closeTimer);
   previousFocus=document.activeElement;
   options.hidden=true;
   overlay.hidden=false;
   renderTeam();
   requestAnimationFrame(()=>overlay.classList.add('visible'));
   overlay.querySelector('#mode-close').focus();
 };
 trigger.addEventListener('click',open);

 overlay.querySelector('#mode-close').addEventListener('click',close);
 overlay.querySelector('#mode-backdrop').addEventListener('click',close);
 overlay.querySelector('#battle-royale-tile').addEventListener('click',()=>{
   options.hidden=false;
   renderTeam();
 });
 options.querySelectorAll('[data-team]').forEach(button=>button.addEventListener('click',()=>{
   selectedTeam=button.dataset.team;
   renderTeam();
 }));
 options.querySelectorAll('[data-fill]').forEach(button=>button.addEventListener('click',()=>{
   fillMode=button.dataset.fill;
   renderTeam();
 }));
 overlay.querySelector('#mode-confirm').addEventListener('click',()=>{
   label.textContent=modeLabel();
   trigger.setAttribute('aria-label','Selected mode: '+modeLabel()+'. Change mode');
   close();
 });
 const onKey=e=>{
   if(overlay.hidden)return;
   if(e.key==='Escape'){e.preventDefault();close();}
   if(e.key==='Tab'){
     const focusables=[...overlay.querySelectorAll('button:not([disabled])')].filter(el=>el.getClientRects().length);
     if(!focusables.length)return;
     const first=focusables[0],last=focusables[focusables.length-1];
     if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
     else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   }
 };
 document.addEventListener('keydown',onKey,{signal:pageEvents.signal});
 pageEvents.signal.addEventListener('abort',()=>{clearTimeout(closeTimer);overlay.remove();},{once:true});
 renderTeam();
}

function modeLabel(){
 return 'BATTLE ROYALE · '+selectedTeam+(selectedTeam==='SOLO'?'':' · '+(fillMode==='FILL'?'FILL':'NO-FILL'));
}

function renderLobbyParty(members){
 const host=stage.querySelector('#sf-lobby-party');
 const scene=stage.querySelector('#sf-lobby-scene');
 if(!host||!scene)return;
 const players=members.length?members.slice(0,4):[{user_id:'solo',username:document.querySelector('#sf-profile-name')?.firstChild?.textContent?.trim()||'YOU',leader_id:'solo'}];
 const count=players.length;
 const oldCount=scene.dataset.count;
 const previousPositions=new Map([...host.children].filter(el=>!el.classList.contains('sf-lobby-departing')).map(el=>[el.dataset.id,el.getBoundingClientRect()]));
 const ids=new Set(players.map(p=>String(p.user_id)));
 for(const child of [...host.children])if(!ids.has(child.dataset.id)){
  lobbyPreviewCleanup.get(child.dataset.id)?.();lobbyPreviewCleanup.delete(child.dataset.id);
  child.classList.add('sf-lobby-departing');
  child.addEventListener('animationend',()=>child.remove(),{once:true});
  setTimeout(()=>child.remove(),450);
 }
 for(const p of players){
  let card=[...host.children].find(el=>el.dataset.id===String(p.user_id)&&!el.classList.contains('sf-lobby-departing'));
  if(!card){
   card=document.createElement('div');card.className='sf-lobby-player';
   card.dataset.id=String(p.user_id);
   card.innerHTML='<div class="sf-lobby-silhouette sf-lobby-character"></div><div class="sf-lobby-platform"><div class="sf-lobby-platform-inner"></div></div><strong></strong><small></small>';
   host.append(card);
  }
  const index=players.indexOf(p);
  const ordered=[...host.children].filter(el=>!el.classList.contains('sf-lobby-departing'));
  if(ordered[index]!==card)host.insertBefore(card,ordered[index]||null);
  card.style.setProperty('--slot',index);
  const skinName=p.user_id==='solo'||p.is_self||(localPlayerId&&String(p.user_id)===String(localPlayerId))?getEquippedSkinName():(p.skin_name||'Jaxon');
  if(card.dataset.skin!==skinName||!lobbyPreviewCleanup.has(card.dataset.id)){
   lobbyPreviewCleanup.get(card.dataset.id)?.();
   card.dataset.skin=skinName;
   lobbyPreviewCleanup.set(card.dataset.id,mountCharacterPreview(card.querySelector('.sf-lobby-character'),skinName,{lobby:true}));
  }
  card.classList.toggle('is-leader',p.user_id===p.leader_id);
  card.querySelector('strong').textContent=p.username||'Player';
  card.querySelector('small').textContent=p.user_id===p.leader_id?'♛ PARTY LEADER':'PARTY MEMBER';
 }
 if(oldCount!==String(count))scene.dataset.count=String(count);
 requestAnimationFrame(()=>{
  if(!host.isConnected)return;
  for(const card of host.children){
   if(card.classList.contains('sf-lobby-departing'))continue;
   const before=previousPositions.get(card.dataset.id);
   if(!before)continue;
   const after=card.getBoundingClientRect();
   const dx=before.left-after.left,dy=before.top-after.top;
   if(Math.abs(dx)+Math.abs(dy)>2)card.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration:520,easing:'cubic-bezier(.22,1,.36,1)'});
  }
 });
}
document.addEventListener('sf:party-update',e=>{window.__sfPartyMembers=e.detail.members;renderLobbyParty(e.detail.members);});
window.addEventListener('skyfront:cosmetic-changed',()=>{if(current==='play')renderLobbyParty(window.__sfPartyMembers||[]);});

const partyNoticeSound=new Audio(import.meta.env.BASE_URL+'audio/Notification.mp3');
partyNoticeSound.volume=readSettings().notifications?readSettings().notificationVolume/100:0;
window.addEventListener('skyfront:settings-changed',e=>{partyNoticeSound.volume=e.detail.notifications?e.detail.notificationVolume/100:0});
let partyNoticeTimer;
document.addEventListener('sf:party-notice',event=>{
 const {kind,username}=event.detail||{};
 const message=kind==='kicked-self'?'YOU GOT KICKED FROM THE PARTY':kind==='kicked'?'GOT KICKED FROM THE PARTY':kind==='join'?'JOINED YOUR PARTY':kind==='leave'?'LEFT YOUR PARTY':kind==='leader'?'YOU ARE NOW PARTY LEADER':kind==='leader-changed'?'IS NOW PARTY LEADER':kind==='leave-self'?'YOU LEFT THE PARTY':kind==='join-self'?'YOU JOINED A PARTY':'PARTY UPDATED';
 let toast=document.querySelector('#sf-party-notice');
 if(!toast){toast=document.createElement('div');toast.id='sf-party-notice';toast.className='sf-party-notice';toast.setAttribute('role','status');document.body.append(toast);}
 const name=toast.querySelector('.sf-party-notice-name');
 toast.replaceChildren();
 const label=document.createElement('small');label.textContent='SKYFRONT • PARTY';
 const heading=document.createElement('strong');heading.textContent=kind==='kicked-self'?'YOU':username||'Player';
 const info=document.createElement('span');info.textContent=message;
 toast.append(label,heading,info);
 clearTimeout(partyNoticeTimer);
 toast.classList.remove('visible');
 requestAnimationFrame(()=>toast.classList.add('visible'));
 if(readSettings().notifications){partyNoticeSound.currentTime=0;partyNoticeSound.play().catch(()=>{});}
 partyNoticeTimer=setTimeout(()=>toast.classList.remove('visible'),4200);
});
