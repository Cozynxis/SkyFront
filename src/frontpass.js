import './frontpass.css';
import { createFrontPassViewer } from './frontpass3d.js';
const rewards=[
 ['100 S-Coins','coin','common'],['Skyfront Banner','banner','rare'],['Victory Step','emote','epic'],['100 S-Coins','coin','common'],['Cloud Wrap','wrap','rare'],['Wave Hello','emote','rare'],['200 S-Coins','coin','common'],['Skyfall Spray','spray','rare'],['Skyrise Loading Screen','screen','rare'],['Azure Axe','axe','epic'],
 ['Rox','skin','legendary'],['Nightpack','backpack','epic'],['300 S-Coins','coin','rare'],['Azure Axe','axe','epic'],['Nebula Wrap','wrap','epic'],['Zero Gravity','emote','epic'],['Meteor Skyfall','skyfall','epic'],['500 S-Coins','coin','rare'],['Skywing','parachute','epic'],['Rox: Ascended','skin','legendary']
];
const symbols={coin:'S',banner:'⚑',emote:'✦',wrap:'▰',spray:'✳',screen:'▧',axe:'⚒',skin:'◈',backpack:'▣',skyfall:'☄',parachute:'◇'};
const totalPages=10;
const saved=()=>{try{return JSON.parse(localStorage.getItem('sf-frontpass-v1')||'{}')}catch{return {}}};
const persist=v=>{try{localStorage.setItem('sf-frontpass-v1',JSON.stringify(v))}catch{}};
export function mountFrontPass(){
 const root=document.querySelector('#frontpass-root');if(!root)return()=>{};
 let state={page:0,selected:0,tab:'rewards',...saved()};
 let messageTimer;
 let disposeViewer=null;
 let revealTimer=null;
 let revealAudio=null;
 const COST=950;
 const getCoins=()=>{const el=document.querySelector('#wallet-balance');const n=Number((el?.textContent||'100000').replace(/[^\d]/g,''));return Number.isFinite(n)?n:100000};
 const updateCoins=n=>{try{localStorage.setItem('sf-coins-balance',String(n))}catch{};const el=document.querySelector('#wallet-balance');if(el)el.textContent=n.toLocaleString('en-US');};
 const hasPremium=()=>localStorage.getItem('sf-frontpass-premium')==='true';
 const logo=import.meta.env.BASE_URL+'images/skyfront-logo.png';
 const closeReveal=()=>{clearTimeout(revealTimer);revealTimer=null;revealAudio?.pause();revealAudio=null;document.querySelector('#fp-reveal')?.remove();};
 const showReveal=()=>{
  closeReveal();const overlay=document.createElement('div');overlay.id='fp-reveal';overlay.className='fp-reveal';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','FrontPass unlocked');
  overlay.innerHTML='<div class="fp-reveal-stars"></div><div class="fp-reveal-ring"></div><div class="fp-reveal-logo"><img src="'+logo+'" alt="SKYFRONT logo"></div><div class="fp-reveal-copy"><span>SEASON 1 · SKYRISE</span><h2>FRONTPASS<br><em>UNLOCKED</em></h2><p>THE PREMIUM TRACK IS YOURS</p></div><button class="fp-reveal-skip" type="button">SKIP ›</button>';
  document.body.appendChild(overlay);overlay.querySelector('button').addEventListener('click',closeReveal);overlay.querySelector('button').focus();
  revealAudio=new Audio(import.meta.env.BASE_URL+'audio/Reveal.mp3');revealAudio.volume=.8;revealAudio.play().catch(()=>{});
  revealTimer=setTimeout(closeReveal,10000);
 };
 const buyPremium=()=>{if(hasPremium()){notify('Premium FrontPass is already unlocked.');return};const coins=getCoins();if(coins<COST){notify('Not enough S-Coins. You need '+(COST-coins)+' more.');return};updateCoins(coins-COST);localStorage.setItem('sf-frontpass-premium','true');render();showReveal()};

 const rewardAt=(page,index)=>{const item=rewards[index];return {name:item[0],type:item[1],rarity:item[2],tier:page*10+(index%10)+1,premium:index>=10}};
 const card=(item,index)=>{
 const selected=state.selected===index;
 const available=state.page===0&&index===0;
 return '<button class="fp-card fp-'+item.rarity+(selected?' selected':'')+'" data-reward="'+index+'" type="button" aria-pressed="'+selected+'"><span class="fp-card-tier">'+item.tier+'</span><span class="fp-card-icon">'+symbols[item.type]+'</span><span class="fp-card-name">'+item.name+'</span><span class="fp-card-state">'+(available?'FREE':item.premium&&hasPremium()?'♛':'🔒')+'</span></button>';
 };
 root.innerHTML='<div class="fp"><div class="fp-head"><div><div class="fp-kicker">SKYFRONT / SEASON 1</div><h1>FRONT<span>PASS</span></h1><p>SEASON 1 · SKYRISE</p></div><div class="fp-season"><span>SEASON ENDS IN</span><strong id="fp-countdown">—</strong></div></div><div class="fp-tabs"><button data-tab="rewards" class="active">REWARDS</button><button data-tab="missions">MISSIONS</button><button data-tab="bonus">BONUS REWARDS</button></div><div id="fp-content"></div></div>';
 const content=root.querySelector('#fp-content');
 const notify=(txt)=>{const n=root.querySelector('.fp-toast');if(!n)return;n.textContent=txt;n.hidden=false;clearTimeout(messageTimer);messageTimer=setTimeout(()=>{n.hidden=true},2600)};
 const render=()=>{
 disposeViewer?.();disposeViewer=null;
 root.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));
 if(state.tab!=='rewards'){
 content.innerHTML='<section class="fp-soon"><div class="fp-soon-icon">✦</div><h2>'+ (state.tab==='missions'?'MISSIONS':'BONUS REWARDS')+'</h2><p>COMING SOON · More FrontPass content is on the way.</p><button type="button" data-tab="rewards">BACK TO REWARDS</button></section>';
 return;
 }
 const chosen=rewardAt(state.page,state.selected);
 content.innerHTML='<div class="fp-workspace"><div class="fp-rewards"><div class="fp-progress"><div class="fp-level"><small>LEVEL</small><strong>1</strong></div><div class="fp-xp"><span>LEVEL PROGRESS <b>0 / 10,000 XP</b></span><div class="fp-xp-track"><i></i></div></div><div class="fp-pager"><button data-direction="-1" aria-label="Previous reward page">‹</button><strong>PAGE '+(state.page+1)+' / '+totalPages+'</strong><button data-direction="1" aria-label="Next reward page">›</button></div></div><div class="fp-track"><div class="fp-track-row"><div class="fp-row-label free"><span>✧</span><strong>FREE</strong></div><div class="fp-card-grid">'+rewards.slice(0,10).map((_,i)=>card(rewardAt(state.page,i),i)).join('')+'</div></div><div class="fp-track-row"><div class="fp-row-label premium"><span>♛</span><strong>PREMIUM</strong></div><div class="fp-card-grid">'+rewards.slice(10,20).map((_,i)=>card(rewardAt(state.page,i+10),i+10)).join('')+'</div></div></div><div class="fp-actions"><button type="button" class="fp-upgrade" data-action="premium">♛ &nbsp; '+(hasPremium()?'PREMIUM UNLOCKED':'GET PREMIUM · 950 S-COINS')+'</button><span>Unlock the Premium reward track</span></div></div><aside class="fp-preview"><div class="fp-preview-top"><span>REWARD PREVIEW</span><span>LEVEL '+chosen.tier+'</span></div><div class="fp-preview-visual fp-'+chosen.rarity+'"><div class="fp-preview-halo"></div><div id="fp-three-viewer" class="fp-three-viewer" aria-label="Interactive 3D cosmetic model. Drag to rotate."></div></div><div class="fp-preview-info"><span class="fp-rarity">'+chosen.rarity.toUpperCase()+' · '+chosen.type.toUpperCase()+'</span><h2>'+chosen.name+'</h2><p>'+(chosen.premium?'Premium FrontPass reward':'Free FrontPass reward')+' · Season 1</p><div class="fp-status">'+(chosen.premium?(hasPremium()?'♛ PREMIUM OWNED':'♛ PREMIUM REQUIRED'):'✧ FREE TRACK')+'</div></div><button type="button" class="fp-preview-button" data-action="preview">PREVIEW REWARD</button></aside></div><div class="fp-toast" role="status" hidden></div>';
 const host=root.querySelector('#fp-three-viewer');
 if(host){try{disposeViewer=createFrontPassViewer(host,chosen)}catch(err){console.warn('FrontPass preview failed:',err);host.textContent=symbols[chosen.type]}}
 };
 const onClick=e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.tab){state.tab=b.dataset.tab;persist(state);render();return}
 if(b.dataset.direction){state.page=Math.min(totalPages-1,Math.max(0,state.page+Number(b.dataset.direction)));state.selected=0;persist(state);render();return}
 if(b.dataset.reward!==undefined){state.selected=Number(b.dataset.reward);persist(state);render();return}
 if(b.dataset.action==='premium')buyPremium();
 if(b.dataset.action==='preview')notify('Drag the 3D model to rotate it.');
 };
 root.addEventListener('click',onClick);
 const end=new Date();end.setUTCDate(end.getUTCDate()+75);
 const update=()=>{const el=root.querySelector('#fp-countdown');if(!el)return;const s=Math.max(0,Math.floor((end-Date.now())/1000));el.textContent=Math.floor(s/86400)+'D '+Math.floor(s%86400/3600)+'H '+Math.floor(s%3600/60)+'M'};
 update();const timer=setInterval(update,60000);render();
 return()=>{disposeViewer?.();closeReveal();clearInterval(timer);clearTimeout(messageTimer);root.removeEventListener('click',onClick)};
}