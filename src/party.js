import {supabase} from './community.js';
import './party.css';
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function installParty(){
 const trigger=document.createElement('button');trigger.type='button';trigger.className='sf-party-trigger';trigger.title='Manage party';trigger.setAttribute('aria-label','Manage party');trigger.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="3"/><path d="M2 20v-2a6 6 0 0 1 12 0v2M17 5l1.2 2.2 2.5.4-1.8 1.8.4 2.5-2.3-1.2-2.3 1.2.4-2.5-1.8-1.8 2.5-.4z"/></svg><span class="sf-party-count">0/4</span>';document.body.append(trigger);
 const layer=document.createElement('div');layer.className='sf-party-layer';layer.hidden=true;layer.innerHTML='<div class="sf-party-shade"></div><aside class="sf-party-panel" role="dialog" aria-modal="true" aria-label="Party management"><header><div><small>SKYFRONT SOCIAL</small><h2>YOUR PARTY</h2></div><button type="button" data-close aria-label="Close">×</button></header><div class="sf-party-body"><p class="sf-party-feedback" role="status"></p><div class="sf-party-members"></div><div class="sf-party-actions"></div></div><footer>YOUR SQUAD. YOUR WAY.</footer></aside>';document.body.append(layer);
 let me=null,rows=[],lastPartySnapshot=null,selectedMember=null,opened=false,working=false,channel=null,poll=null,authPoll=null,focus=null;
 const notice=(s,err=false)=>{const el=layer.querySelector('.sf-party-feedback');el.textContent=s;el.classList.toggle('error',err)};
 const rpc=async(p_action,p_target=null)=>{const {data,error}=await supabase.rpc('sf_party_action',{p_action,p_target});if(error)throw error;return data};
 const ago=v=>{if(!v)return 'Offline';const seconds=Math.max(0,Math.floor((Date.now()-new Date(v))/1000));if(seconds<90)return 'Online';if(seconds<3600)return 'Last online '+Math.floor(seconds/60)+'m ago';if(seconds<86400)return 'Last online '+Math.floor(seconds/3600)+'h ago';return 'Last online '+Math.floor(seconds/86400)+'d ago'};
 const render=()=>{
  const leader=rows[0]?.leader_id,owner=leader===me;trigger.hidden=rows.length===0;
  trigger.querySelector('.sf-party-count').textContent=rows.length+'/4';
  const memberArea=layer.querySelector('.sf-party-members');
  if(!rows.length){trigger.hidden=true;memberArea.innerHTML='<div class="sf-party-empty"><strong>NO ACTIVE PARTY</strong><p>Create a party to invite friends into your lobby.</p></div>';layer.querySelector('.sf-party-actions').innerHTML='<button type="button" data-action="create" class="primary">CREATE PARTY</button>';return;}
  if(selectedMember&&!rows.some(p=>p.user_id===selectedMember))selectedMember=null;
  memberArea.innerHTML=rows.map(p=>'<div class="sf-party-member-wrap"><button type="button" class="sf-party-member '+(selectedMember===p.user_id?'selected':'')+'" data-member="'+p.user_id+'" aria-expanded="'+(selectedMember===p.user_id)+'"><div class="sf-party-avatar">'+safe(p.username?.[0]?.toUpperCase()||'?')+'</div><div class="sf-party-person"><strong>'+safe(p.username)+(p.user_id===me?' <span class="sf-party-you">YOU</span>':'')+'</strong><small>'+(p.user_id===leader?'♛ PARTY LEADER · ':'')+'LVL '+Number(p.player_level||1)+' · '+safe(ago(p.last_seen_at))+'</small></div><span class="sf-party-chevron">'+(selectedMember===p.user_id?'⌃':'⌄')+'</span></button>'+(selectedMember===p.user_id?'<div class="sf-party-submenu"><p>'+safe(p.username)+' · '+(p.user_id===leader?'Party leader':'Party member')+'</p>'+(owner&&p.user_id!==me?'<button type="button" data-action="promote" data-target="'+p.user_id+'">♛ PROMOTE TO LEADER</button><button type="button" class="danger" data-action="kick" data-target="'+p.user_id+'">✕ KICK FROM PARTY</button>':'<span class="sf-party-subnote">'+(p.user_id===me?'Your party profile':'Only the party leader can manage members')+'</span>')+'</div>':'')+'</div>').join('');
  layer.querySelector('.sf-party-actions').innerHTML='<p>'+rows.length+' / 4 PLAYERS</p>'+(owner?'<button type="button" data-action="friends" class="primary">INVITE FRIENDS</button>':'')+'<button type="button" data-action="leave">LEAVE PARTY</button>';
 };
 const load=async()=>{const {data:{user}}=await supabase.auth.getUser();if(user?.id!==me){me=user?.id||null;rows=[];lastPartySnapshot=null;selectedMember=null;}if(!me){render();return;}const {data,error}=await supabase.rpc('sf_party_view');if(error){if(opened)notice(error.message,true);return;}const next=data||[];
 const previous=lastPartySnapshot;
 const nextParty=next[0]?.party_id||next[0]?.leader_id||null;
 if(previous&&previous.party===nextParty&&nextParty){
  const before=new Map(previous.members.map(p=>[p.user_id,p]));
  const after=new Map(next.map(p=>[p.user_id,p]));
  for(const p of next)if(!before.has(p.user_id)&&p.user_id!==me)document.dispatchEvent(new CustomEvent('sf:party-notice',{detail:{kind:'join',username:p.username||'Player'}}));
  for(const p of previous.members)if(!after.has(p.user_id)&&p.user_id!==me)document.dispatchEvent(new CustomEvent('sf:party-notice',{detail:{kind:'leave',username:p.username||'Player'}}));
  if(previous.leader!==next[0]?.leader_id&&next[0]?.leader_id===me)document.dispatchEvent(new CustomEvent('sf:party-notice',{detail:{kind:'leader',username:'You'}}));
 }
 lastPartySnapshot={party:nextParty,members:next.map(p=>({user_id:p.user_id,username:p.username})),leader:next[0]?.leader_id||null};
 rows=next;render();document.dispatchEvent(new CustomEvent('sf:party-update',{detail:{members:rows,leader:rows[0]?.leader_id||null}}));};
 const open=async()=>{if(opened||trigger.hidden)return;opened=true;focus=document.activeElement;layer.hidden=false;requestAnimationFrame(()=>layer.classList.add('open'));layer.querySelector('[data-close]').focus();await load()};
 const close=()=>{if(!opened)return;opened=false;layer.classList.remove('open');setTimeout(()=>{if(!opened)layer.hidden=true},240);focus?.focus()};
 trigger.onclick=open;layer.querySelector('[data-close]').onclick=close;layer.querySelector('.sf-party-shade').onclick=close;
 document.addEventListener('keydown',e=>{if(opened&&e.key==='Escape'){e.preventDefault();close()}});
 document.addEventListener('sf:leave-play',close);
 layer.addEventListener('click',async e=>{const member=e.target.closest('[data-member]');if(member){selectedMember=selectedMember===member.dataset.member?null:member.dataset.member;render();return;}const b=e.target.closest('[data-action]');if(!b||working)return;const action=b.dataset.action;if(action==='friends'){close();document.querySelector('.sf-friends-trigger')?.click();return;}working=true;b.disabled=true;try{await rpc(action,b.dataset.target||null);notice(action==='create'?'Party created!':action==='leave'?'You left the party.':'Party updated!');await load()}catch(err){notice(err.message,true)}finally{working=false;b.disabled=false}});
 const connect=async()=>{const {data:{user}}=await supabase.auth.getUser();const id=user?.id||null;if(id!==me){me=id;rows=[];lastPartySnapshot=null;await load();}if(!channel){channel=supabase.channel('sf-party-live').on('postgres_changes',{event:'*',schema:'public',table:'sf_party_members'},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'sf_parties'},()=>void load()).subscribe();}};
 void connect();poll=setInterval(()=>void load(),5000);authPoll=setInterval(()=>void connect(),10000);
 window.addEventListener('sf:party-changed',()=>void load());
 return ()=>{clearInterval(poll);clearInterval(authPoll);if(channel)void supabase.removeChannel(channel);trigger.remove();layer.remove()};
}
