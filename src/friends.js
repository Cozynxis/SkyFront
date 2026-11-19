import { supabase } from './community.js';
import './friends.css';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const uid=(r,me)=>r.sender===me?r.receiver:r.sender;
const flag=code=>{const c=String(code||'').trim().toLowerCase();return /^[a-z]{2}$/.test(c)?'<img class="sf-country-flag" src="https://flagcdn.com/w80/'+c+'.png" alt="Country flag" loading="lazy">':'🌐';};
export function installFriends(){
 const button=document.createElement('button');button.type='button';button.className='sf-friends-trigger';button.setAttribute('aria-label','Open friends');button.innerHTML='<span class="sf-friends-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 11a3 3 0 1 0-1-5M17 15a5 5 0 0 1 4 5"/></svg></span><b class="sf-friends-alert" hidden>!</b>';document.body.append(button);
 const layer=document.createElement('div');layer.className='sf-friends-layer';layer.hidden=true;
 layer.innerHTML='<div class="sf-friends-shade"></div><aside class="sf-friends-drawer" role="dialog" aria-modal="true" aria-label="Friends"><header><div><small>SKYFRONT SOCIAL</small><h2>FRIENDS <span id="sf-friend-count">0</span></h2></div><button data-close aria-label="Close">×</button></header><div class="sf-friends-body"><div class="sf-friends-tabs"><button data-tab="friends" class="active">FRIENDS</button><button data-tab="requests">REQUESTS <b id="sf-requests-count"></b></button><button data-tab="blocked">BLOCKED</button></div><form id="sf-friend-add"><input name="username" maxlength="32" placeholder="Enter exact username..." aria-label="Username" required><button type="submit">ADD +</button></form><p class="sf-friends-feedback" role="status"></p><div id="sf-friends-list"></div></div><footer>YOUR SQUAD. YOUR WAY.</footer></aside>';document.body.append(layer);
 const list=layer.querySelector('#sf-friends-list'),feedback=layer.querySelector('.sf-friends-feedback');
 const profilePopup=document.createElement('div');profilePopup.className='sf-friend-profile-layer';profilePopup.hidden=true;profilePopup.innerHTML='<div class="sf-friend-profile-shade"></div><section class="sf-friend-profile-card" role="dialog" aria-modal="true" aria-label="Player profile"><button type="button" data-profile-close aria-label="Close profile">×</button><div class="sf-friend-profile-content"></div></section>';layer.append(profilePopup);
 const toast=document.createElement('div');toast.className='sf-social-toast';toast.hidden=true;toast.setAttribute('role','status');document.body.append(toast);
 const notificationSound=new Audio(import.meta.env.BASE_URL+'audio/Notification.mp3');notificationSound.volume=.65;
 let notificationTimer=null,toastTimer=null,knownIncoming=null,channel=null,profileOpen=false,toastQueue=[],toastBusy=false,activeToast=null;
 let presenceChannel=null,presenceUser=null,liveOnline=new Set(),presenceReady=false,presenceRetry=null,presenceGeneration=0;const inviteCooldown=new Map();const INVITE_COOLDOWN_MS=10000;let lastSyncedUser=null,lastSyncedName=null;let opened=false,tab='friends',me=null,requests=[],blocks=[],invites=[],profiles=new Map(),timer=null,busy=false,previousFocus=null;
 const hideToast=()=>{clearTimeout(toastTimer);toast.classList.remove('visible');setTimeout(()=>{if(!toast.classList.contains('visible')){toast.hidden=true;toastBusy=false;activeToast=null;showNextToast();}},220);};
 const showNextToast=()=>{if(toastBusy||!toastQueue.length)return;toastBusy=true;activeToast=toastQueue.shift();const n=activeToast;const senderName=getName(n.sender);const isParty=n.type==='party';
 toast.innerHTML='<div class="sf-social-toast-head"><span class="sf-social-toast-symbol">'+(isParty?'♛':'♧')+'</span><div class="sf-social-toast-copy"><small>SKYFRONT • '+(isParty?'PARTY INVITE':'FRIEND REQUEST')+'</small><strong>'+esc(senderName)+'</strong><span>'+(isParty?'invited you to their party':'wants to add you as a friend')+'</span></div><button type="button" data-toast-dismiss aria-label="Dismiss notification">×</button></div><div class="sf-social-toast-actions"><button type="button" data-toast-accept>ACCEPT</button><button type="button" data-toast-decline>DECLINE</button></div><div class="sf-social-toast-progress"></div>';
 toast.hidden=false;requestAnimationFrame(()=>toast.classList.add('visible'));notificationSound.currentTime=0;notificationSound.play().catch(()=>{});
 toastTimer=setTimeout(hideToast,8500);
 };
 const queueToast=(n)=>{toastQueue.push(n);showNextToast();};
 toast.addEventListener('click',async e=>{if(e.target.closest('[data-toast-dismiss]')){hideToast();return;}const accept=e.target.closest('[data-toast-accept]'),decline=e.target.closest('[data-toast-decline]');if((!accept&&!decline)||!activeToast||busy)return;
 const n=activeToast;busy=true;toast.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{await rpc(n.type==='party'?(accept?'accept_invite':'decline_invite'):(accept?'accept':'decline'),n.sender);hideToast();await load();}catch(err){notice(err.message,true);hideToast();}finally{busy=false;}
 });
 const closeProfile=()=>{profileOpen=false;profilePopup.hidden=true;};
 profilePopup.querySelector('[data-profile-close]').onclick=closeProfile;
 profilePopup.querySelector('.sf-friend-profile-shade').onclick=closeProfile;
 const timeAgo=value=>{if(!value)return 'unknown';const ms=Date.now()-new Date(value).getTime();if(!Number.isFinite(ms))return 'unknown';const sec=Math.max(0,Math.floor(ms/1000));if(sec<60)return 'just now';const min=Math.floor(sec/60);if(min<60)return min+'m ago';const hours=Math.floor(min/60);if(hours<24)return hours+'h ago';const days=Math.floor(hours/24);return days+'d ago';};
 const lastOnline=id=>isOnline(id)?'ONLINE':'Last online: '+timeAgo(profiles.get(id)?.last_seen_at);
 const isOnline=id=>liveOnline.has(id)||( !presenceReady&&Boolean(profiles.get(id)?.is_online));
 const openProfile=id=>{const p=profiles.get(id);if(!p)return;profileOpen=true;profilePopup.hidden=false;const online=isOnline(id);profilePopup.querySelector('.sf-friend-profile-content').innerHTML='<div class="sf-friend-profile-avatar">'+esc(p.username.slice(0,1).toUpperCase())+'</div><h3>'+esc(p.username)+'</h3><p><i class="sf-presence-dot '+(online?'online':'offline')+'"></i>'+(online?'ONLINE':lastOnline(id))+'</p><div class="sf-friend-profile-details"><span>LEVEL <b>'+esc(p.player_level)+'</b></span><span>COUNTRY <b class="sf-profile-flag" title="'+esc(p.country_code||'')+'">'+flag(p.country_code)+'</b></span></div>';};
 const refreshPresenceUI=()=>{if(opened){render();if(profileOpen&&profilePopup.dataset.user)openProfile(profilePopup.dataset.user);}};
 const updatePresence=()=>{if(!presenceChannel)return;const states=presenceChannel.presenceState();liveOnline=new Set(Object.values(states).flat().filter(v=>v?.user_id&&v.active).map(v=>v.user_id));presenceReady=true;refreshPresenceUI();};
 const trackPresence=async()=>{if(!presenceChannel||!me||presenceUser!==me)return;try{await presenceChannel.track({user_id:me,active:true});}catch(e){console.warn('SKYFRONT presence:',e);}};
 const connectPresence=id=>{
   clearTimeout(presenceRetry);presenceGeneration++;const generation=presenceGeneration;
   if(presenceChannel){void supabase.removeChannel(presenceChannel);presenceChannel=null;}
   liveOnline.clear();presenceReady=false;presenceUser=id;refreshPresenceUI();if(!id)return;
   const ch=supabase.channel('skyfront-online-presence',{config:{presence:{key:id}}});presenceChannel=ch;
   ch.on('presence',{event:'sync'},()=>{if(generation===presenceGeneration)updatePresence();})
     .on('presence',{event:'join'},()=>{if(generation===presenceGeneration)updatePresence();})
     .on('presence',{event:'leave'},()=>{if(generation===presenceGeneration)updatePresence();})
     .subscribe(status=>{
       if(generation!==presenceGeneration)return;
       if(status==='SUBSCRIBED'){updatePresence();void trackPresence();}
       else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
         presenceReady=false;refreshPresenceUI();
         clearTimeout(presenceRetry);presenceRetry=setTimeout(()=>{if(generation===presenceGeneration&&me===id)connectPresence(id);},2500);
       }
     });
 };
 const notice=(msg,error=false)=>{feedback.textContent=msg;feedback.classList.toggle('error',error)};
 const rpc=async(action,target)=>{if(['invite','accept_invite','decline_invite'].includes(action)){const p_action=action==='invite'?'invite':action==='accept_invite'?'accept':'decline';const {error}=await supabase.rpc('sf_party_action',{p_action,p_target:target});if(error)throw error;window.dispatchEvent(new Event('sf:party-changed'));return;}const {error}=await supabase.rpc('sf_social_action',{action,target});if(error)throw error;};
 const blockRpc=async(target,should_block)=>{const {error}=await supabase.rpc('sf_social_block',{target,should_block});if(error)throw error;};
 const getName=id=>profiles.get(id)?.username||'Player';
 const heartbeat=async()=>{if(!me)return;const country=localStorage.getItem('sf-career-flag:'+me)||'NL';await supabase.rpc('sf_social_presence',{p_country:country,p_level:1});};
 const subscribe=userId=>{if(channel){supabase.removeChannel(channel);channel=null;}if(!userId)return;channel=supabase.channel('skyfront-social-'+userId).on('postgres_changes',{event:'*',schema:'public',table:'sf_friend_requests',filter:'receiver=eq.'+userId},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'sf_party_invites',filter:'receiver=eq.'+userId},()=>void load()).subscribe();};
 async function load(){
   const {data:{user}}=await supabase.auth.getUser();me=user?.id||null;
   if(!me){if(presenceUser)connectPresence(null);toastQueue=[];if(toastBusy)hideToast();button.hidden=true;if(opened)close();if(lastSyncedUser){lastSyncedUser=null;knownIncoming=null;subscribe(null);}return;}button.hidden=false;
   if(presenceUser!==me)connectPresence(me);if(lastSyncedUser!==me){knownIncoming=null;toastQueue=[];if(toastBusy)hideToast();subscribe(me);}
   const name=String(user.user_metadata?.username||'Player').replace(/[^a-zA-Z0-9_]/g,'_').slice(0,32);
   if(name.length>=3&&(lastSyncedUser!==me||lastSyncedName!==name)){const {error}=await supabase.rpc('sf_social_action',{action:'sync',target:name});if(error){if(opened)notice('Username: '+error.message,true);}else{lastSyncedUser=me;lastSyncedName=name;}}
   const [req,blk,inv]=await Promise.all([
    supabase.from('sf_friend_requests').select('*').or('sender.eq.'+me+',receiver.eq.'+me),
    supabase.from('sf_blocks').select('*').eq('blocker',me),
    supabase.from('sf_party_invites').select('*').or('sender.eq.'+me+',receiver.eq.'+me).eq('status','pending')
   ]);
   if(req.error||blk.error||inv.error){if(opened)notice((req.error||blk.error||inv.error).message,true);return;}
   requests=req.data||[];blocks=blk.data||[];invites=inv.data||[];
   const ids=[...new Set([...requests.map(r=>uid(r,me)),...blocks.map(b=>b.blocked),...invites.map(i=>uid(i,me))])];
   profiles=new Map();
   if(ids.length){const {data,error}=await supabase.rpc('sf_social_public_profiles',{p_ids:ids});if(error&&opened)notice(error.message,true);for(const p of data||[])profiles.set(p.user_id,p);}
   const incoming=[...requests.filter(r=>r.status==='pending'&&r.receiver===me).map(r=>'friend:'+r.id),...invites.filter(i=>i.receiver===me).map(i=>'party:'+i.id)];
   if(knownIncoming!==null){const fresh=incoming.filter(id=>!knownIncoming.has(id));for(const id of fresh){if(id.startsWith('party:')){const inv=invites.find(i=>'party:'+i.id===id);if(inv)queueToast({type:'party',sender:inv.sender});}else{const req=requests.find(r=>'friend:'+r.id===id);if(req)queueToast({type:'friend',sender:req.sender});}}}
   knownIncoming=new Set(incoming);
   if(opened&&profileOpen){const id=profilePopup.dataset.user;if(id&&profiles.has(id))openProfile(id);}
   const pending=requests.filter(r=>r.status==='pending'&&r.receiver===me).length+invites.filter(i=>i.receiver===me).length;
   button.querySelector('.sf-friends-alert').hidden=pending===0;
   layer.querySelector('#sf-requests-count').textContent=pending||'';
   layer.querySelector('#sf-friend-count').textContent=requests.filter(r=>r.status==='accepted').length;
   if(opened)render();
 }
 function row(id,subtitle,actions){
   const p=profiles.get(id);const status=isOnline(id)?'online':'offline';return '<article class="sf-friend-row"><span class="sf-friend-avatar">'+esc(getName(id).slice(0,1).toUpperCase())+'<i class="sf-presence-dot '+status+'"></i></span><button type="button" class="sf-friend-identity" data-profile="'+esc(id)+'"><strong>'+esc(getName(id))+'</strong><small>'+esc(subtitle)+' · '+lastOnline(id)+'</small></button><div class="sf-friend-actions">'+actions.map(([action,label])=>'<button type="button" data-action="'+action+'" data-user="'+esc(id)+'">'+esc(action==='invite'&&Date.now()-(inviteCooldown.get(id)||0)<INVITE_COOLDOWN_MS?'WAIT '+Math.ceil((INVITE_COOLDOWN_MS-(Date.now()-inviteCooldown.get(id)))/1000)+'S':label)+'</button>').join('')+'</div></article>';
 }
 function render(){
   layer.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
   layer.querySelector('#sf-friend-add').hidden=tab==='blocked';
   let html='';
   if(tab==='friends'){
     html=requests.filter(r=>r.status==='accepted').map(r=>row(uid(r,me),'FRIEND',[['invite','INVITE'],['remove','REMOVE'],['block','BLOCK']])).join('');
     if(!html)html='<div class="sf-friends-empty">NO FRIENDS YET<small>Search a player username to connect.</small></div>';
   }else if(tab==='requests'){
     const partyIncoming=[...new Map(invites.filter(i=>i.receiver===me).map(i=>[i.sender,i])).values()];
     const partyOutgoing=[...new Map(invites.filter(i=>i.sender===me).map(i=>[i.receiver,i])).values()];
     const friendIncoming=requests.filter(r=>r.status==='pending'&&r.receiver===me);
     const friendOutgoing=requests.filter(r=>r.status==='pending'&&r.sender===me);
     html='<div class="sf-social-section-title"><span>PARTY REQUESTS</span><b>'+partyIncoming.length+'</b></div>';
     html+=partyIncoming.map(i=>row(i.sender,'PARTY INVITATION',[['accept_invite','JOIN'],['decline_invite','DECLINE']])).join('');
     html+=partyOutgoing.map(i=>row(i.receiver,'PARTY INVITE SENT',[])).join('');
     if(!partyIncoming.length&&!partyOutgoing.length)html+='<div class="sf-social-section-empty">No party invitations</div>';
     html+='<div class="sf-social-section-title"><span>FRIEND REQUESTS</span><b>'+friendIncoming.length+'</b></div>';
     html+=friendIncoming.map(r=>row(r.sender,'INCOMING FRIEND REQUEST',[['accept','ACCEPT'],['decline','DECLINE'],['block','BLOCK']])).join('');
     html+=friendOutgoing.map(r=>row(r.receiver,'FRIEND REQUEST SENT',[['cancel','CANCEL']])).join('');
     if(!friendIncoming.length&&!friendOutgoing.length)html+='<div class="sf-social-section-empty">No friend requests</div>';
   }else{
     html=blocks.map(b=>row(b.blocked,'BLOCKED',[['unblock','UNBLOCK']])).join('');
     if(!html)html='<div class="sf-friends-empty">NO BLOCKED PLAYERS</div>';
   }
   list.innerHTML=html;
 }
 const open=async()=>{if(opened||button.hidden)return;opened=true;previousFocus=document.activeElement;layer.hidden=false;document.querySelector('.shell')?.setAttribute('inert','');requestAnimationFrame(()=>layer.classList.add('open'));layer.querySelector('[data-close]').focus();await load();};
 const close=()=>{if(!opened)return;closeProfile();opened=false;layer.classList.remove('open');document.querySelector('.shell')?.removeAttribute('inert');setTimeout(()=>{if(!opened)layer.hidden=true;},250);previousFocus?.focus()};
 document.addEventListener('sf:leave-play',()=>{if(opened)close();});
 button.onclick=open;layer.querySelector('[data-close]').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();close();});layer.querySelector('.sf-friends-shade').onclick=close;
 document.addEventListener('keydown',e=>{if(!opened)return;if(e.key==='Escape'){if(profileOpen)closeProfile();else close();return}if(e.key==='Tab'){const els=[...layer.querySelectorAll('button:not([hidden]),input:not([hidden])')].filter(x=>x.offsetParent!==null);if(!els.length)return;const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 layer.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render();});
 layer.querySelector('#sf-friend-add').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const input=e.currentTarget.elements.username;try{await rpc('request',input.value.trim());input.value='';notice('Friend request sent!');await load()}catch(err){notice(err.message,true)}finally{busy=false}};
 list.onclick=async e=>{const profile=e.target.closest('[data-profile]');if(profile){profilePopup.dataset.user=profile.dataset.profile;openProfile(profile.dataset.profile);return;}const b=e.target.closest('[data-action]');if(!b||busy)return;busy=true;b.disabled=true;const action=b.dataset.action,id=b.dataset.user;try{
   if(action==='invite'){
     const remaining=INVITE_COOLDOWN_MS-(Date.now()-(inviteCooldown.get(id)||0));
     if(remaining>0){notice('Wait '+Math.ceil(remaining/1000)+'s before inviting this player again.',true);return;}
   }
   if(action==='block'||action==='unblock')await blockRpc(id,action==='block');
   else await rpc(action,id);
   if(action==='invite'){inviteCooldown.set(id,Date.now());const inviteButton=b;inviteButton.disabled=true;let seconds=10;inviteButton.textContent='WAIT '+seconds+'S';const countdown=setInterval(()=>{seconds=Math.max(0,Math.ceil((INVITE_COOLDOWN_MS-(Date.now()-(inviteCooldown.get(id)||0)))/1000));if(!inviteButton.isConnected){clearInterval(countdown);return;}if(seconds===0){clearInterval(countdown);inviteButton.disabled=false;inviteButton.textContent='INVITE';}else inviteButton.textContent='WAIT '+seconds+'S';},250);}
   notice(action==='invite'?'Party invitation sent!':action==='accept_invite'?'Joined party! Open Party Management in the lobby.':'Updated successfully.');
   await load();
 }catch(err){notice(err.message,true)}finally{busy=false;b.disabled=action==='invite'&&Date.now()-(inviteCooldown.get(id)||0)<INVITE_COOLDOWN_MS}};
 const refresh=()=>{load().catch(()=>{})};refresh();timer=setInterval(refresh,12000);notificationTimer=setInterval(()=>{void heartbeat().catch(()=>{});},25000);
 const visibilityHandler=()=>{if(!document.hidden){void heartbeat().catch(()=>{});refresh();}};
 document.addEventListener('visibilitychange',visibilityHandler);window.addEventListener('focus',visibilityHandler);window.addEventListener('blur',visibilityHandler);
 setTimeout(()=>void heartbeat().catch(()=>{}),1500);
 // The friends button belongs exclusively to the Play lobby, never other pages.
 const pageObserver=new MutationObserver(()=>{if(button.hidden&&opened)close();});
 pageObserver.observe(document.querySelector('#stage')||document.body,{attributes:true,childList:true,subtree:false});
 supabase.auth.onAuthStateChange(()=>setTimeout(refresh,0));
 return ()=>{clearInterval(timer);clearInterval(notificationTimer);clearTimeout(toastTimer);if(channel)supabase.removeChannel(channel);if(presenceChannel)supabase.removeChannel(presenceChannel);clearTimeout(presenceRetry);document.removeEventListener('visibilitychange',visibilityHandler);window.removeEventListener('focus',visibilityHandler);window.removeEventListener('blur',visibilityHandler);pageObserver.disconnect();button.remove();layer.remove();toast.remove()};
}
