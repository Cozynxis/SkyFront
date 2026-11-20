import './loading-screen.css';

export function showLoadingScreen({team='SOLO',fill='FILL',partySize=1,onReady=()=>{},onCancel=()=>{}}={}){
 const root=document.createElement('div');root.className='sf-loading';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Loading Battle Royale');
 const subtitle=team==='SOLO'?'SOLO':team+' · '+(fill==='NO-FILL'?'NO FILL':'FILL');
 root.innerHTML=`
 <div class="sf-loading-art" aria-hidden="true"><div class="sf-loading-sun"></div><div class="sf-loading-ridge ridge-one"></div><div class="sf-loading-ridge ridge-two"></div><div class="sf-loading-tower tower-one"></div><div class="sf-loading-tower tower-two"></div><div class="sf-loading-tower tower-three"></div><div class="sf-loading-grid"></div></div>
 <div class="sf-loading-vignette"></div>
 <div class="sf-loading-story">
  <div class="sf-loading-mission"><small>SKYFRONT · SEASON ONE</small><h1>YOUR MISSION</h1><p class="sf-loading-mission-intro">Prepare for the drop</p>
   <div class="sf-loading-steps"><div class="sf-loading-step"><i>01</i><div><strong>LAND ON THE ISLAND</strong><p>Join the spawn island and prepare for deployment.</p></div></div><div class="sf-loading-step"><i>02</i><div><strong>GEAR UP</strong><p>Explore, collect supplies and get ready for the match.</p></div></div><div class="sf-loading-step"><i>03</i><div><strong>BE THE LAST ONE STANDING</strong><p>Survive the storm and claim the victory.</p></div></div></div>
  </div>
  <div class="sf-loading-hero"><div class="sf-loading-hero-badge">EARLY ACCESS</div><div class="sf-loading-hero-title"><small>SKYFRONT</small><strong>BATTLE<br>ROYALE</strong><span>SEASON ONE · SKYRISE</span></div></div>
 </div>
 <div class="sf-loading-mode"><small>SELECTED GAME MODE</small><strong>BATTLE ROYALE</strong><span>${subtitle}</span><span>${Math.max(1,partySize)} / 4 PARTY PLAYERS</span></div>
 <div class="sf-loading-footer"><div class="sf-loading-progress"><div class="sf-loading-progress-heading"><strong id="sf-loading-status">PREPARING THE ISLAND</strong><div class="sf-loading-spinner"><span></span></div></div><div class="sf-loading-track"><i></i></div><small>INITIALIZING GAMEPLAY</small></div><div class="sf-loading-tip"><strong>TIP</strong><p>Stick with your squad and explore the island together.</p><button type="button" class="sf-loading-cancel">CANCEL</button></div></div>`;
 document.body.append(root);
 let done=false;
 const timers=[];
 const cancel=()=>{if(done)return;done=true;timers.forEach(clearTimeout);root.remove();onCancel()};
 root.querySelector('.sf-loading-cancel').addEventListener('click',cancel);
 const progress=root.querySelector('.sf-loading-track i'),status=root.querySelector('#sf-loading-status');
 const stages=[[900,16,'LOADING WORLD'],[2100,38,'PREPARING GAMEPLAY'],[3700,64,'LOADING SPAWN ISLAND'],[5100,85,'FINALIZING'],[6100,100,'READY']];
 for(const [delay,pct,label] of stages)timers.push(setTimeout(()=>{if(done)return;progress.style.width=pct+'%';status.textContent=label},delay));
 // Keep the loading screen opaque while the gameplay canvas is created.
 // Otherwise the lobby flashes briefly between the two screens.
 timers.push(setTimeout(()=>{
  if(done)return;
  done=true;
  try{
   onReady(); // Mount the gameplay world BEFORE hiding the loading screen.
  }catch(error){
   console.error('Unable to start SKYFRONT gameplay:',error);
   root.remove();
   onCancel();
   return;
  }
  // Two frames give the new WebGL scene time to render behind the overlay.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   root.classList.add('sf-loading-finish');
   setTimeout(()=>root.remove(),260);
  }));
 },6750));
 return cancel;
}
