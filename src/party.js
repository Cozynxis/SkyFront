import {supabase} from './community.js';
import './party.css';
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function installParty(){
 const trigger=document.createElement('button');trigger.type='button';trigger.className='sf-party-trigger';trigger.title='Manage party';trigger.setAttribute('aria-label','Manage party');trigger.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="3"/><path d="M2 20v-2a6 6 0 0 1 12 0v2M17 5l1.2 2.2 2.5.4-1.8 1.8.4 2.5-2.3-1.2-2.3 1.2.4-2.5-1.8-1.8 2.5-.4z"/></svg><span class="sf-party-count">0/4</span>';document.body.append(trigger);
 const layer=document.createElement('div');layer.className='sf-party-layer';layer.hidden=true;layer.innerHTML='<div class="sf-party-shade"></div><aside class="sf-party-panel" role="dialog" aria-modal="true" aria-label="Party management"><header><div><small>SKYFRONT SOCIAL</small><h2>YOUR PARTY</h2></div><button type="button" data-close aria-label="Close">×</button></header><div class="sf-party-body"><p class="sf-party-feedback" role="status"></p><div class="sf-party-members"></div><div class="sf-party-actions"></div></div><footer>YOUR SQUAD. YOUR WAY.</footer></aside><aside class="sf-party-detail" aria-label="Player management" hidden></aside>';document.body.append(layer);
 let me=null,rows=[],lastPartySnapshot=null,selectedMember=null,opened=false,working=false,channel=null,poll=null,authPoll=null,focus=null,loading=false,queued=false,lastRenderedKey='';
 const notice=(s,err=false)=>{const el=layer.querySelector('.sf-party-feedback');el.textContent=s;el.classList.toggle('error',err)};
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const rpc=async(p_action,p_target=null)=>{if(['promote','kick','invite','accept','decline'].includes(p_action)&&!uuid.test(String(p_target??'')))throw new Error('Invalid player ID. Refresh the party and try again.');const {data,error}=await supabase.rpc('sf_party_action',{p_action,p_target});if(error)throw error;return data};
 const ago=v=>{if(!v)return 'Offline';const seconds=Math.max(0,Math.floor((Date.now()-new Date(v))/1000));if(seconds<90)return 'Online';if(seconds<3600)return 'Last online '+Math.floor(seconds/60)+'m ago';if(seconds<86400)return 'Last online '+Math.floor(seconds/3600)+'h ago';return 'Last online '+Math.floor(seconds/86400)+'d ago'};
 const render=()=>{
  const leader=rows.find(p=>p.leader_id)?.leader_id,owner=!!me&&String(leader)===String(me);trigger.hidden=rows.length===0;
  trigger.querySelector('.sf-party-count').textContent=rows.length+'/4';
  const memberArea=layer.querySelector('.sf-party-members');
  if(!rows.length){trigger.hidden=true;layer.querySelector('.sf-party-detail').hidden=true;memberArea.innerHTML='<div class="sf-party-empty"><strong>NO ACTIVE PARTY</strong><p>Create a party to invite friends into your lobby.</p></div>';layer.querySelector('.sf-party-actions').innerHTML='<button type="button" data-action="create" class="primary">CREATE PARTY</button>';return;}
  if(!owner||(selectedMember&&!rows.some(p=>String(p.user_id)===String(selectedMember)&&String(p.user_id)!==String(me))))selectedMember=null;
  memberArea.innerHTML=rows.map(p=>'<div class="sf-party-member-wrap"><button type="button" '+(!owner||String(p.user_id)===String(me)?'disabled aria-disabled="true" ':'')+'class="sf-party-member '+(String(selectedMember)===String(p.user_id)?'selected':'')+'" data-member="'+p.user_id+'" aria-expanded="'+(String(selectedMember)===String(p.user_id))+'"><div class="sf-party-avatar">'+safe(p.username?.[0]?.toUpperCase()||'?')+'</div><div class="sf-party-person"><strong>'+safe(p.username)+(String(p.user_id)===String(leader)?' <span class="sf-party-crown" title="Party Leader" aria-label="Party Leader">👑</span>':'')+(String(p.user_id)===String(me)?' <span class="sf-party-you">YOU</span>':'')+'</strong><small>'+'LVL '+Number(p.player_level||1)+' · '+safe(ago(p.last_seen_at))+'</small></div>'+(owner&&String(p.user_id)!==String(me)?'<span class="sf-party-chevron">›</span>':'')+'</button></div>').join('');
  const detail=layer.querySelector('.sf-party-detail');
  const selected=owner?rows.find(p=>String(p.user_id)===String(selectedMember)&&String(p.user_id)!==String(me)):null;
  detail.hidden=!selected;
  if(selected){
   const online=selected.last_seen_at&&Date.now()-new Date(selected.last_seen_at).getTime()<90000;
   detail.innerHTML='<header><div><small>SKYFRONT · SQUAD CONTROL</small><h2>PLAYER OPTIONS</h2></div><button type="button" data-detail-close aria-label="Close player options">×</button></header>'
    +'<div class="sf-party-detail-body"><div class="sf-party-detail-avatar">'+safe(selected.username?.[0]?.toUpperCase()||'?')+'</div>'
    +'<strong>'+safe(selected.username||'Player')+'</strong><small><span class="sf-party-status-dot '+(online?'online':'')+'"></span> '+safe(ago(selected.last_seen_at))+' · LEVEL '+Number(selected.player_level||1)+'</small>'
    +'<div class="sf-party-detail-stats"><div><span>ROLE</span><b>MEMBER</b></div><div><span>PARTY</span><b>'+rows.length+' / 4</b></div></div>'
    +'<div class="sf-party-detail-actions"><p>LEADER CONTROLS</p><button type="button" data-action="promote" data-target="'+safe(selected.user_id)+'">♛ PROMOTE TO LEADER <span>›</span></button>'
    +'<button type="button" class="danger" data-action="kick" data-target="'+safe(selected.user_id)+'">✕ REMOVE FROM PARTY <span>›</span></button>'
    +'<p>PLAYER TOOLS</p><button type="button" data-action="copy-name" data-target="'+safe(selected.user_id)+'">⧉ COPY USERNAME <span>›</span></button>'
    +'<button type="button" data-action="friends">♧ OPEN FRIENDS LIST <span>›</span></button></div></div>';
  }

  layer.querySelector('.sf-party-actions').innerHTML='<p>'+rows.length+' / 4 PLAYERS</p>'+(owner?'<button type="button" data-action="friends" class="primary">INVITE FRIENDS</button>':'')+'<button type="button" data-action="leave">LEAVE PARTY</button>';
 };
 const load=async()=>{if(loading){queued=true;return;}loading=true;try{const {data:{user}}=await supabase.auth.getUser();if(user?.id!==me){me=user?.id||null;rows=[];lastPartySnapshot=null;selectedMember=null;}if(!me){render();return;}const {data,error}=await supabase.rpc('sf_party_view');if(error){if(opened)notice(error.message,true);return;}const next=(data||[]).map(p=>({...p,user_id:p.member_id??p.user_id}));
 const previous=lastPartySnapshot;
 const nextParty=next[0]?.party_id||null;
 const oldMembers=previous?.members||[];
 const oldIds=new Set(oldMembers.map(p=>String(p.user_id)));
 const newIds=new Set(next.map(p=>String(p.user_id)));
 const notify=(kind,username)=>document.dispatchEvent(new CustomEvent('sf:party-notice',{detail:{kind,username}}));
 if(previous){
  const overlapping=next.some(p=>oldIds.has(String(p.user_id)));
  const sameParty=(!!nextParty&&nextParty===previous.party)||(!nextParty&&!previous.party&&overlapping);
  if(sameParty){
   for(const p of next)if(!oldIds.has(String(p.user_id)))notify(String(p.user_id)===String(me)?'join-self':'join',p.username||'Player');
   for(const p of oldMembers)if(!newIds.has(String(p.user_id)))notify(String(p.user_id)===String(me)?'leave-self':'leave',p.username||'Player');
   const newLeader=next.find(p=>p.leader_id)?.leader_id||null;
   if(String(previous.leader)!==String(newLeader)&&newLeader){
    const promoted=next.find(p=>String(p.user_id)===String(newLeader));
    notify(String(newLeader)===String(me)?'leader':'leader-changed',promoted?.username||'Player');
   }
  }else{
   if(oldIds.has(String(me)))notify('leave-self','You');
   if(newIds.has(String(me)))notify('join-self','You');
  }
 }
 lastPartySnapshot={party:nextParty,members:next.map(p=>({user_id:p.user_id,username:p.username})),leader:next.find(p=>p.leader_id)?.leader_id||null};
 rows=next;const key=JSON.stringify({me,rows:rows.map(p=>[p.party_id,p.user_id,p.leader_id,p.username,p.player_level]),selectedMember});if(key!==lastRenderedKey){lastRenderedKey=key;render();document.dispatchEvent(new CustomEvent('sf:party-update',{detail:{members:rows,leader:rows.find(p=>p.leader_id)?.leader_id||null}}));}}finally{loading=false;if(queued){queued=false;void load();}}};
 const open=async()=>{if(opened||trigger.hidden)return;opened=true;focus=document.activeElement;layer.hidden=false;requestAnimationFrame(()=>layer.classList.add('open'));layer.querySelector('[data-close]').focus();await load()};
 const close=()=>{if(!opened)return;opened=false;layer.classList.remove('open');setTimeout(()=>{if(!opened)layer.hidden=true},240);focus?.focus()};
 trigger.onclick=open;layer.querySelector('[data-close]').onclick=close;layer.querySelector('.sf-party-shade').onclick=close;
 document.addEventListener('keydown',e=>{if(opened&&e.key==='Escape'){e.preventDefault();close()}});
 document.addEventListener('sf:leave-play',close);
 layer.addEventListener('click',async e=>{if(e.target.closest('[data-detail-close]')){selectedMember=null;lastRenderedKey='';render();return;}const member=e.target.closest('[data-member]');if(member){if(!me||!rows.some(p=>String(p.leader_id)===String(me))||member.dataset.member===String(me))return;selectedMember=String(selectedMember)===member.dataset.member?null:member.dataset.member;lastRenderedKey='';render();return;}const b=e.target.closest('[data-action]');if(!b||working)return;const action=b.dataset.action;if((action==='promote'||action==='kick')&&(!me||!rows.some(p=>String(p.leader_id)===String(me))||b.dataset.target===String(me)||!rows.some(p=>String(p.user_id)===b.dataset.target))){notice('Only the party leader can manage other members.',true);return;}if(action==='copy-name'){const target=rows.find(p=>String(p.user_id)===b.dataset.target);if(target){try{await navigator.clipboard.writeText(target.username||'');notice('Username copied!')}catch{notice('Could not copy username.',true)}}return;}if(action==='friends'){close();document.querySelector('.sf-friends-trigger')?.click();return;}working=true;b.disabled=true;try{await rpc(action,b.dataset.target||null);if(action==='promote'||action==='kick'){selectedMember=null;lastRenderedKey='';}notice(action==='create'?'Party created!':action==='leave'?'You left the party.':'Party updated!');await load()}catch(err){notice(err.message,true)}finally{working=false;b.disabled=false}});
 const connect=async()=>{const {data:{user}}=await supabase.auth.getUser();const id=user?.id||null;if(id!==me){me=id;rows=[];lastPartySnapshot=null;await load();}if(!channel){channel=supabase.channel('sf-party-live').on('postgres_changes',{event:'*',schema:'public',table:'sf_party_members'},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'sf_parties'},()=>void load()).subscribe();}};
 void connect();poll=setInterval(()=>void load(),5000);authPoll=setInterval(()=>void connect(),10000);
 window.addEventListener('sf:party-changed',()=>void load());
 return ()=>{clearInterval(poll);clearInterval(authPoll);if(channel)void supabase.removeChannel(channel);trigger.remove();layer.remove()};
}
