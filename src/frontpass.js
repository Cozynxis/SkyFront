import './frontpass.css';
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
 const rewardAt=(page,index)=>{const item=rewards[index];return {name:item[0],type:item[1],rarity:item[2],tier:page*10+(index%10)+1,premium:index>=10}};
 const card=(item,index)=>{
 const selected=state.selected===index;
 const available=state.page===0&&index===0;
 return '<button class="fp-card fp-'+item.rarity+(selected?' selected':'')+'" data-reward="'+index+'" type="button" aria-pressed="'+selected+'"><span class="fp-card-tier">'+item.tier+'</span><span class="fp-card-icon">'+symbols[item.type]+'</span><span class="fp-card-name">'+item.name+'</span><span class="fp-card-state">'+(available?'FREE':'🔒')+'</span></button>';
 };
 root.innerHTML='<div class="fp"><div class="fp-head"><div><div class="fp-kicker">SKYFRONT / SEASON 1</div><h1>FRONT<span>PASS</span></h1><p>SEASON 1 · SKYRISE</p></div><div class="fp-season"><span>SEASON ENDS IN</span><strong id="fp-countdown">—</strong></div></div><div class="fp-tabs"><button data-tab="rewards" class="active">REWARDS</button><button data-tab="missions">MISSIONS</button><button data-tab="bonus">BONUS REWARDS</button></div><div id="fp-content"></div></div>';
 const content=root.querySelector('#fp-content');
 const notify=(txt)=>{const n=root.querySelector('.fp-toast');if(!n)return;n.textContent=txt;n.hidden=false;clearTimeout(messageTimer);messageTimer=setTimeout(()=>{n.hidden=true},2600)};
 const render=()=>{
 root.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));
 if(state.tab!=='rewards'){
 content.innerHTML='<section class="fp-soon"><div class="fp-soon-icon">✦</div><h2>'+ (state.tab==='missions'?'MISSIONS':'BONUS REWARDS')+'</h2><p>COMING SOON · More FrontPass content is on the way.</p><button type="button" data-tab="rewards">BACK TO REWARDS</button></section>';
 return;
 }
 const chosen=rewardAt(state.page,state.selected);
 content.innerHTML='<div class="fp-workspace"><div class="fp-rewards"><div class="fp-progress"><div class="fp-level"><small>LEVEL</small><strong>1</strong></div><div class="fp-xp"><span>LEVEL PROGRESS <b>0 / 10,000 XP</b></span><div class="fp-xp-track"><i></i></div></div><div class="fp-pager"><button data-direction="-1" aria-label="Previous reward page">‹</button><strong>PAGE '+(state.page+1)+' / '+totalPages+'</strong><button data-direction="1" aria-label="Next reward page">›</button></div></div><div class="fp-track"><div class="fp-track-row"><div class="fp-row-label free"><span>✧</span><strong>FREE</strong></div><div class="fp-card-grid">'+rewards.slice(0,10).map((_,i)=>card(rewardAt(state.page,i),i)).join('')+'</div></div><div class="fp-track-row"><div class="fp-row-label premium"><span>♛</span><strong>PREMIUM</strong></div><div class="fp-card-grid">'+rewards.slice(10,20).map((_,i)=>card(rewardAt(state.page,i+10),i+10)).join('')+'</div></div></div><div class="fp-actions"><button type="button" class="fp-upgrade" data-action="premium">♛ &nbsp; GET PREMIUM FRONTPASS</button><span>Unlock the Premium reward track</span></div></div><aside class="fp-preview"><div class="fp-preview-top"><span>REWARD PREVIEW</span><span>LEVEL '+chosen.tier+'</span></div><div class="fp-preview-visual fp-'+chosen.rarity+'"><div class="fp-preview-halo"></div><span>'+symbols[chosen.type]+'</span></div><div class="fp-preview-info"><span class="fp-rarity">'+chosen.rarity.toUpperCase()+' · '+chosen.type.toUpperCase()+'</span><h2>'+chosen.name+'</h2><p>'+(chosen.premium?'Premium FrontPass reward':'Free FrontPass reward')+' · Season 1</p><div class="fp-status">'+(chosen.premium?'♛ PREMIUM REQUIRED':'✧ FREE TRACK')+'</div></div><button type="button" class="fp-preview-button" data-action="preview">PREVIEW REWARD</button></aside></div><div class="fp-toast" role="status" hidden></div>';
 };
 const onClick=e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.tab){state.tab=b.dataset.tab;persist(state);render();return}
 if(b.dataset.direction){state.page=Math.min(totalPages-1,Math.max(0,state.page+Number(b.dataset.direction)));state.selected=0;persist(state);render();return}
 if(b.dataset.reward!==undefined){state.selected=Number(b.dataset.reward);persist(state);render();return}
 if(b.dataset.action==='premium')notify('Premium FrontPass purchases are coming soon.');
 if(b.dataset.action==='preview')notify('3D cosmetic previews are coming soon.');
 };
 root.addEventListener('click',onClick);
 const end=new Date();end.setUTCDate(end.getUTCDate()+75);
 const update=()=>{const el=root.querySelector('#fp-countdown');if(!el)return;const s=Math.max(0,Math.floor((end-Date.now())/1000));el.textContent=Math.floor(s/86400)+'D '+Math.floor(s%86400/3600)+'H '+Math.floor(s%3600/60)+'M'};
 update();const timer=setInterval(update,60000);render();
 return()=>{clearInterval(timer);clearTimeout(messageTimer);root.removeEventListener('click',onClick)};
}