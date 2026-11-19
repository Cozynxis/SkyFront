import { supabase } from './community.js';
import './friends.css';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const uid=(r,me)=>r.sender===me?r.receiver:r.sender;
export function installFriends(){
 const button=document.createElement('button');button.type='button';button.className='sf-friends-trigger';button.setAttribute('aria-label','Open friends');button.innerHTML='<span class="sf-friends-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 11a3 3 0 1 0-1-5M17 15a5 5 0 0 1 4 5"/></svg></span><b class="sf-friends-alert" hidden>!</b>';document.body.append(button);
 const layer=document.createElement('div');layer.className='sf-friends-layer';layer.hidden=true;
 layer.innerHTML='<div class="sf-friends-shade"></div><aside class="sf-friends-drawer" role="dialog" aria-modal="true" aria-label="Friends"><header><div><small>SKYFRONT SOCIAL</small><h2>FRIENDS <span id="sf-friend-count">0</span></h2></div><button data-close aria-label="Close">×</button></header><div class="sf-friends-body"><div class="sf-friends-tabs"><button data-tab="friends" class="active">FRIENDS</button><button data-tab="requests">REQUESTS <b id="sf-requests-count"></b></button><button data-tab="blocked">BLOCKED</button></div><form id="sf-friend-add"><input name="username" maxlength="32" placeholder="Enter exact username..." aria-label="Username" required><button type="submit">ADD +</button></form><p class="sf-friends-feedback" role="status"></p><div id="sf-friends-list"></div></div><footer>YOUR SQUAD. YOUR WAY.</footer></aside>';document.body.append(layer);
 const list=layer.querySelector('#sf-friends-list'),feedback=layer.querySelector('.sf-friends-feedback');
 let lastSyncedUser=null,lastSyncedName=null;let opened=false,tab='friends',me=null,requests=[],blocks=[],invites=[],profiles=new Map(),timer=null,busy=false,previousFocus=null;
 const notice=(msg,error=false)=>{feedback.textContent=msg;feedback.classList.toggle('error',error)};
 const rpc=async(action,target)=>{const {error}=await supabase.rpc('sf_social_action',{action,target});if(error)throw error;};
 const blockRpc=async(target,should_block)=>{const {error}=await supabase.rpc('sf_social_block',{target,should_block});if(error)throw error;};
 const getName=id=>profiles.get(id)||'Player';
 async function load(){
   const {data:{user}}=await supabase.auth.getUser();me=user?.id||null;
   if(!me){button.hidden=true;if(opened)close();return;}button.hidden=false;
   const name=String(user.user_metadata?.username||localStorage.getItem('sf-player-name')||user.email?.split('@')[0]||'Player').replace(/[^a-zA-Z0-9_]/g,'_').slice(0,32);
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
   if(ids.length){const {data}=await supabase.from('sf_social_profiles').select('user_id,username').in('user_id',ids);for(const p of data||[])profiles.set(p.user_id,p.username);}
   const pending=requests.filter(r=>r.status==='pending'&&r.receiver===me).length+invites.filter(i=>i.receiver===me).length;
   button.querySelector('.sf-friends-alert').hidden=pending===0;
   layer.querySelector('#sf-requests-count').textContent=pending||'';
   layer.querySelector('#sf-friend-count').textContent=requests.filter(r=>r.status==='accepted').length;
   if(opened)render();
 }
 function row(id,subtitle,actions){
   return '<article class="sf-friend-row"><span class="sf-friend-avatar">'+esc(getName(id).slice(0,1).toUpperCase())+'</span><div><strong>'+esc(getName(id))+'</strong><small>'+esc(subtitle)+'</small></div><div class="sf-friend-actions">'+actions.map(([action,label])=>'<button type="button" data-action="'+action+'" data-user="'+esc(id)+'">'+esc(label)+'</button>').join('')+'</div></article>';
 }
 function render(){
   layer.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
   layer.querySelector('#sf-friend-add').hidden=tab==='blocked';
   let html='';
   if(tab==='friends'){
     html=requests.filter(r=>r.status==='accepted').map(r=>row(uid(r,me),'FRIEND',[['invite','INVITE'],['remove','REMOVE'],['block','BLOCK']])).join('');
     if(!html)html='<div class="sf-friends-empty">NO FRIENDS YET<small>Search a player username to connect.</small></div>';
   }else if(tab==='requests'){
     html=requests.filter(r=>r.status==='pending').map(r=>r.receiver===me?row(r.sender,'INCOMING FRIEND REQUEST',[['accept','ACCEPT'],['decline','DECLINE'],['block','BLOCK']]):row(r.receiver,'REQUEST SENT',[['cancel','CANCEL']])).join('');
     html+=invites.filter(i=>i.receiver===me).map(i=>row(i.sender,'PARTY INVITATION',[['accept_invite','JOIN'],['decline_invite','DECLINE']])).join('');
     if(!html)html='<div class="sf-friends-empty">ALL CAUGHT UP<small>No pending requests.</small></div>';
   }else{
     html=blocks.map(b=>row(b.blocked,'BLOCKED',[['unblock','UNBLOCK']])).join('');
     if(!html)html='<div class="sf-friends-empty">NO BLOCKED PLAYERS</div>';
   }
   list.innerHTML=html;
 }
 const open=async()=>{if(opened||button.hidden)return;opened=true;previousFocus=document.activeElement;layer.hidden=false;document.querySelector('.shell')?.setAttribute('inert','');requestAnimationFrame(()=>layer.classList.add('open'));layer.querySelector('[data-close]').focus();await load();};
 const close=()=>{if(!opened)return;opened=false;layer.classList.remove('open');document.querySelector('.shell')?.removeAttribute('inert');setTimeout(()=>{if(!opened)layer.hidden=true;},250);previousFocus?.focus()};
 document.addEventListener('sf:leave-play',()=>{if(opened)close();});
 button.onclick=open;layer.querySelector('[data-close]').onclick=close;layer.querySelector('.sf-friends-shade').onclick=close;
 document.addEventListener('keydown',e=>{if(!opened)return;if(e.key==='Escape'){close();return}if(e.key==='Tab'){const els=[...layer.querySelectorAll('button:not([hidden]),input:not([hidden])')].filter(x=>x.offsetParent!==null);if(!els.length)return;const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 layer.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render();});
 layer.querySelector('#sf-friend-add').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const input=e.currentTarget.elements.username;try{await rpc('request',input.value.trim());input.value='';notice('Friend request sent!');await load()}catch(err){notice(err.message,true)}finally{busy=false}};
 list.onclick=async e=>{const b=e.target.closest('[data-action]');if(!b||busy)return;busy=true;b.disabled=true;const action=b.dataset.action,id=b.dataset.user;try{
   if(action==='block'||action==='unblock')await blockRpc(id,action==='block');
   else await rpc(action,id);
   notice(action==='invite'?'Party invitation sent!':action==='accept_invite'?'Invitation accepted. Party matchmaking will be available when multiplayer launches.':'Updated successfully.');
   await load();
 }catch(err){notice(err.message,true)}finally{busy=false;b.disabled=false}};
 const refresh=()=>{load().catch(()=>{})};refresh();timer=setInterval(refresh,12000);
 // The friends button belongs exclusively to the Play lobby, never other pages.
 const pageObserver=new MutationObserver(()=>{if(button.hidden&&opened)close();});
 pageObserver.observe(document.querySelector('#stage')||document.body,{attributes:true,childList:true,subtree:false});
 supabase.auth.onAuthStateChange(()=>setTimeout(refresh,0));
 return ()=>{clearInterval(timer);pageObserver.disconnect();button.remove();layer.remove()};
}
