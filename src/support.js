import {supabase} from './community.js';
import './support.css';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories={
 account:{title:'ACCOUNT HELP',icon:'◉',desc:'Login, security or account access',fields:[['issue','WHAT DO YOU NEED HELP WITH?','select',['Login problem','Email change','Account access','Other account issue']],['platform','PLATFORM','select',['PC / Browser','Mobile','Other']]]},
 bug:{title:'REPORT A BUG',icon:'⚒',desc:'Something not working as expected',fields:[['area','WHERE DOES IT HAPPEN?','select',['Lobby','Locker','Shop','Gameplay','Party / Friends','Other']],['steps','STEPS TO REPRODUCE','textarea']]},
 suggestion:{title:'SUGGESTION',icon:'✦',desc:'Share an idea for SKYFRONT',fields:[['area','FEATURE AREA','select',['Gameplay','UI / Design','Cosmetics','Social / Party','Other']],['benefit','WHY WOULD THIS HELP?','textarea']]},
 other:{title:'OTHER',icon:'☰',desc:'Anything else you need help with',fields:[['topic','TOPIC','input']]}
};
let overlay=null,view='home',selectedTicket=null,adminMode=false,records=[],messages=[],admin=false,refreshTimer=null,channel=null;
let requestVersion=0,adminFilter='active',searchTerm='',lastSignature='',busy=false;
const date=v=>new Date(v).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});
function status(s){return ({open:'OPEN',in_progress:'IN PROGRESS',waiting:'WAITING FOR PLAYER',closed:'CLOSED'})[s]||s}
function shell(){
 if(!overlay){overlay=document.createElement('div');overlay.className='sf-support-overlay';overlay.hidden=true;document.body.append(overlay)}
 overlay.innerHTML='<div class="sf-support-backdrop" data-backdrop></div><section class="sf-support-dialog" role="dialog" aria-modal="true" aria-label="Support portal"><header><div><small>SKYFRONT / '+(adminMode?'ADMINISTRATION':'PLAYER SUPPORT')+'</small><h2>'+(adminMode?'SUPPORT MANAGEMENT':'SUPPORT PORTAL')+'</h2></div><button type="button" data-close aria-label="Close support">×</button></header><div class="sf-support-body"></div></section>';
 overlay.hidden=false;requestAnimationFrame(()=>overlay.classList.add('visible'));
 overlay.querySelector('[data-close]').onclick=closeSupport;
 overlay.querySelector('[data-backdrop]').onclick=closeSupport;
}
export function closeSupport(){requestVersion++;if(!overlay)return;overlay.classList.remove('visible');overlay.hidden=true;clearInterval(refreshTimer);refreshTimer=null;if(channel){void supabase.removeChannel(channel);channel=null}}
async function load({force=false}={}){
 const version=++requestVersion;
 // Never replace a form while somebody is typing or choosing an option.
 const focused=document.activeElement;
 const typing=overlay?.contains(focused)&&!!focused?.closest('input,textarea,select,[contenteditable="true"]');
 if(!force&&(typing||busy))return;
 const {data:{user}}=await supabase.auth.getUser();
 if(version!==requestVersion||overlay?.hidden)return;
 if(!user){renderError('Sign in to access your support tickets.');return}
 const a=await supabase.from('sf_admins').select('user_id').eq('user_id',user.id).maybeSingle();admin=!!a.data&&!a.error;
 if(adminMode&&!admin){renderError('You do not have permission to manage support.');return}
 const query=supabase.from('sf_support_tickets').select('*').order('updated_at',{ascending:false});
 const {data,error}=await query;
 if(version!==requestVersion||overlay?.hidden)return;
 if(error){renderError(error.message);return}
 records=data||[];
 if(selectedTicket){
  const found=records.find(t=>t.id===selectedTicket);
  if(!found){selectedTicket=null;view='tickets'}
  else{
   const r=await supabase.from('sf_support_messages').select('*').eq('ticket_id',selectedTicket).order('created_at');
   if(version!==requestVersion||overlay?.hidden)return;
   if(r.error){renderError(r.error.message);return}
   messages=r.data||[];
  }
 }
 const signature=JSON.stringify([view,selectedTicket,records,messages]);
 if(!force&&signature===lastSignature)return;
 lastSignature=signature;
 render();
}
function renderError(message){const body=overlay?.querySelector('.sf-support-body');if(body)body.innerHTML='<div class="sf-support-notice">'+esc(message)+'</div>'}
function button(label,action,extra=''){return '<button type="button" data-action="'+action+'" '+extra+'>'+label+'</button>'}
function render(){
 const body=overlay?.querySelector('.sf-support-body');if(!body||overlay.hidden)return;
 if(view==='home'&&!adminMode){
  body.innerHTML='<div class="sf-support-intro"><strong>HOW CAN WE HELP?</strong><p>Choose a category to contact the SKYFRONT team.</p></div><div class="sf-support-grid">'+Object.entries(categories).map(([key,c])=>'<button class="sf-support-category" data-category="'+key+'"><b>'+c.icon+'</b><strong>'+c.title+'</strong><small>'+c.desc+'</small><span>›</span></button>').join('')+'</div><div class="sf-support-bottom">'+button('YOUR TICKETS ('+records.filter(t=>t.status!=='closed').length+')','tickets')+'</div>';
  body.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{view=b.dataset.category;render()});
 }else if(categories[view]&&!adminMode){
  const c=categories[view];
  body.innerHTML='<div class="sf-support-toolbar">'+button('← BACK','home')+'</div><div class="sf-support-intro"><strong>'+c.title+'</strong><p>'+c.desc+'</p></div><form class="sf-support-form"><label>SUBJECT<input name="subject" minlength="5" maxlength="120" placeholder="Briefly describe your request" required></label>'+c.fields.map(([key,label,type,opts])=>'<label>'+label+(type==='select'?'<select name="'+key+'">'+opts.map(o=>'<option>'+esc(o)+'</option>').join('')+'</select>':type==='textarea'?'<textarea name="'+key+'" rows="3" maxlength="1500" required></textarea>':'<input name="'+key+'" maxlength="150" required>')+'</label>').join('')+'<label>DESCRIPTION<textarea name="description" minlength="10" maxlength="6000" rows="5" placeholder="Tell us what happened or what you would like to see..." required></textarea></label><p class="sf-support-notice" role="status"></p><button class="sf-support-primary" type="submit">SUBMIT TICKET</button></form>';
  const form=body.querySelector('form');
  form.onsubmit=async e=>{
   busy=true;
   e.preventDefault();const submit=form.querySelector('[type=submit]'),note=form.querySelector('[role=status]');submit.disabled=true;note.textContent='Sending…';
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){note.textContent='Please sign in first.';submit.disabled=false;busy=false;return}
   const data=new FormData(form),details={};for(const [key] of c.fields)details[key]=String(data.get(key)||'').trim();
   const payload={user_id:user.id,username:String(user.user_metadata?.username||user.email?.split('@')[0]||'PLAYER').slice(0,60),category:view,subject:String(data.get('subject')).trim(),description:String(data.get('description')).trim(),details};
   const result=await supabase.from('sf_support_tickets').insert(payload).select('id').single();
   if(result.error){note.textContent=result.error.message;submit.disabled=false;busy=false;return}
   selectedTicket=result.data.id;view='detail';busy=false;await load({force:true});
  };
 }else if(view==='tickets'){
  const list=records.filter(t=>adminMode||t.status!=='closed');
  body.innerHTML='<div class="sf-support-toolbar">'+button('← BACK',adminMode?'admin-home':'home')+'</div><div class="sf-support-intro"><strong>'+(adminMode?'ALL SUPPORT TICKETS':'YOUR TICKETS')+'</strong><p>'+(adminMode?'Review, respond and resolve player requests.':'View replies and track the progress of your requests.')+'</p></div><div class="sf-support-filters">'+(adminMode?'<select data-filter><option value="active" '+(adminFilter==='active'?'selected':'')+'>ACTIVE TICKETS</option><option value="all" '+(adminFilter==='all'?'selected':'')+'>ALL TICKETS</option><option value="closed" '+(adminFilter==='closed'?'selected':'')+'>CLOSED</option></select>':'')+'<input data-search placeholder="Search tickets by subject or category…" value="'+esc(searchTerm)+'" aria-label="Search tickets"></div><div class="sf-support-list"></div>';
  const listHost=body.querySelector('.sf-support-list');
  const draw=()=>{const filter=adminMode?adminFilter:'all';const filtered=list.filter(t=>(filter==='all'||filter==='active'&&t.status!=='closed'||filter==='closed'&&t.status==='closed')&&[t.subject,t.username,t.category,t.description].some(v=>String(v||'').toLowerCase().includes(searchTerm.toLowerCase())));listHost.innerHTML=filtered.length?filtered.map(t=>'<button class="sf-support-ticket" data-ticket="'+esc(t.id)+'"><span><strong>'+esc(t.subject)+'</strong><small>'+esc(categories[t.category]?.title||t.category)+' · '+(adminMode?esc(t.username)+' · ':'')+date(t.created_at)+'</small></span><b class="sf-support-status" data-status="'+esc(t.status)+'">'+status(t.status)+'</b><i>›</i></button>').join(''):'<p class="sf-support-empty">No tickets found.</p>';listHost.querySelectorAll('[data-ticket]').forEach(b=>b.onclick=async()=>{selectedTicket=b.dataset.ticket;view='detail';await load()})};
  body.querySelector('[data-filter]')?.addEventListener('change',e=>{adminFilter=e.target.value;draw()});
  body.querySelector('[data-search]')?.addEventListener('input',e=>{searchTerm=e.target.value;draw()});draw();
 }else if(view==='detail'){
  const t=records.find(t=>t.id===selectedTicket);if(!t){view='tickets';render();return}
  body.innerHTML='<div class="sf-support-toolbar">'+button('← ALL TICKETS','tickets')+'<span class="sf-support-status" data-status="'+esc(t.status)+'">'+status(t.status)+'</span></div><div class="sf-support-intro"><small>'+esc(categories[t.category]?.title||t.category)+' · '+date(t.created_at)+'</small><strong>'+esc(t.subject)+'</strong>'+(adminMode?'<p>FROM '+esc(t.username)+'</p>':'')+'</div><div class="sf-support-thread"><article class="sf-support-message"><small>'+esc(t.username)+' · ORIGINAL REQUEST</small><p>'+esc(t.description)+'</p>'+Object.entries(t.details||{}).map(([k,v])=>'<div class="sf-support-detail"><b>'+esc(k.replaceAll('_',' '))+'</b> '+esc(v)+'</div>').join('')+'</article>'+messages.map(m=>'<article class="sf-support-message '+(m.sender_id===t.user_id?'':'is-staff')+'"><small>'+(m.sender_id===t.user_id?esc(t.username):'SKYFRONT SUPPORT')+' · '+date(m.created_at)+'</small><p>'+esc(m.body)+'</p></article>').join('')+'</div>'+(adminMode?'<div class="sf-support-admin-actions"><label>STATUS<select data-status-select>'+[['open','OPEN'],['in_progress','IN PROGRESS'],['waiting','WAITING FOR PLAYER'],['closed','CLOSED']].map(([v,l])=>'<option value="'+v+'" '+(t.status===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label>'+button('CLOSE TICKET','close-ticket','class="sf-support-danger" '+(t.status==='closed'?'disabled':''))+'</div>':'')+(t.status!=='closed'?'<form class="sf-support-reply"><label>'+(adminMode?'REPLY TO PLAYER':'SEND A REPLY')+'<textarea name="reply" maxlength="6000" rows="3" placeholder="Write your message..." required></textarea></label><p role="status"></p><button class="sf-support-primary" type="submit">SEND REPLY</button></form>':'<p class="sf-support-closed">This ticket is closed. The conversation is archived.</p>');
  const form=body.querySelector('form');
  if(form)form.onsubmit=async e=>{e.preventDefault();busy=true;const btn=form.querySelector('button'),msg=form.querySelector('[role=status]');btn.disabled=true;const {data:{user}}=await supabase.auth.getUser();const r=await supabase.from('sf_support_messages').insert({ticket_id:t.id,sender_id:user.id,body:form.elements.reply.value.trim()});if(r.error){msg.textContent=r.error.message;btn.disabled=false;busy=false;return}if(adminMode){await supabase.from('sf_support_tickets').update({status:'waiting',updated_at:new Date().toISOString()}).eq('id',t.id)}busy=false;await load({force:true})};
  body.querySelector('[data-status-select]')?.addEventListener('change',async e=>{const v=e.target.value;const r=await supabase.from('sf_support_tickets').update({status:v,closed_at:v==='closed'?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',t.id);if(r.error){renderError(r.error.message);return}await load({force:true})});
 }else if(view==='admin-home'){
  const open=records.filter(t=>t.status!=='closed').length;
  body.innerHTML='<div class="sf-support-intro"><strong>SUPPORT INBOX</strong><p>Manage incoming requests, conversations and resolutions.</p></div><div class="sf-support-admin-summary"><div><small>ACTIVE</small><strong>'+open+'</strong></div><div><small>CLOSED</small><strong>'+records.filter(t=>t.status==='closed').length+'</strong></div><div><small>TOTAL</small><strong>'+records.length+'</strong></div></div>'+button('VIEW ALL TICKETS','tickets','class="sf-support-primary"');
 }
 body.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{
  const action=b.dataset.action;
  if(action==='close-ticket'){if(!confirm('Close this ticket? It will disappear from the player’s ticket list.'))return;const r=await supabase.from('sf_support_tickets').update({status:'closed',closed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',selectedTicket);if(r.error){renderError(r.error.message);return}await load({force:true});return}
  view=action;selectedTicket=null;await load({force:true});
 });
}
async function open(isAdmin){
 closeSupport();
 adminMode=isAdmin;view=isAdmin?'admin-home':'home';selectedTicket=null;messages=[];searchTerm='';adminFilter='active';lastSignature='';busy=false;shell();await load({force:true});
 refreshTimer=setInterval(()=>{if(!overlay?.hidden)void load()},12000);
 channel=supabase.channel('sf-support-'+(isAdmin?'admin':'player')).on('postgres_changes',{event:'*',schema:'public',table:'sf_support_tickets'},()=>{if(!overlay.hidden)void load()}).on('postgres_changes',{event:'*',schema:'public',table:'sf_support_messages'},()=>{if(!overlay.hidden)void load()}).subscribe();
}
export function openSupportPortal(){return open(false)}
export function openSupportAdmin(){return open(true)}
