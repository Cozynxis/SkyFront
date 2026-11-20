import './loading-screen.css';

export function showLoadingScreen({team='SOLO',fill='FILL',partySize=1,onReady=()=>{},onCancel=()=>{}}={}){
 const root=document.createElement('div');root.className='sf-loading';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Loading Battle Royale');
 const subtitle=team==='SOLO'?'SOLO':team+' · '+(fill==='NO-FILL'?'NO FILL':'FILL');
 root.innerHTML=`
 <div class="sf-loading-art" aria-hidden="true"><div class="sf-loading-sun"></div><div class="sf-loading-ridge ridge-one"></div><div class="sf-loading-ridge ridge-two"></div><div class="sf-loading-tower tower-one"></div><div class="sf-loading-tower tower-two"></div><div class="sf-loading-tower tower-three"></div><div class="sf-loading-grid"></div></div>
 <div class="sf-loading-vignette"></div>
 <div class="sf-loading-top"><div class="sf-loading-logo">S<span>SKYFRONT</span></div><div class="sf-loading-mode"><small>SELECTED GAME MODE</small><strong>BATTLE ROYALE</strong><span>${subtitle}</span><span>${Math.max(1,partySize)} / 4 PARTY PLAYERS</span><span>SEASON 1 · SKYRISE</span></div></div>
 <div class="sf-loading-bottom"><div class="sf-loading-caption"><small>DROP IN. GEAR UP. SURVIVE.</small><h1>BATTLE<br><em>ROYALE</em></h1><p>Explore the island. Be the last player standing.</p></div><div class="sf-loading-progress"><div class="sf-loading-spinner"><span></span></div><strong id="sf-loading-status">PREPARING THE ISLAND</strong><div class="sf-loading-track"><i></i></div><small>INITIALIZING GAMEPLAY</small><button type="button" class="sf-loading-cancel">CANCEL</button></div></div>`;
 document.body.append(root);
 let done=false;
 const timers=[];
 const cancel=()=>{if(done)return;done=true;timers.forEach(clearTimeout);root.remove();onCancel()};
 root.querySelector('.sf-loading-cancel').addEventListener('click',cancel);
 const progress=root.querySelector('.sf-loading-track i'),status=root.querySelector('#sf-loading-status');
 const stages=[[550,23,'LOADING WORLD'],[1250,51,'PREPARING GAMEPLAY'],[2200,78,'FINALIZING'],[3000,100,'READY']];
 for(const [delay,pct,label] of stages)timers.push(setTimeout(()=>{if(done)return;progress.style.width=pct+'%';status.textContent=label},delay));
 timers.push(setTimeout(()=>{if(done)return;done=true;root.classList.add('sf-loading-finish');setTimeout(()=>{root.remove();onReady()},360)},3450));
 return cancel;
}
