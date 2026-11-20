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
let requestVersion=0,adminFilter='active',categoryFilter='all',searchTerm='',lastSignature='',busy=false;
let embeddedHost=null,priorityFilter='all',notificationTimer=null,seenNotifications=new Set(),toast=null;
const BUCKET='sf-support-attachments';
const PRIORITIES=['low','normal','high','urgent'];
const allowedTypes=new Set(['image/png','image/jpeg','image/webp','image/gif','application/pdf']);
const safeFileName=name=>String(name||'attachment').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,90);
const attachmentsInput='<label class="sf-support-file-label">ATTACH FILES <small>Images or PDF · max 5 MB each · up to 3 files</small><input type="file" name="attachments" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" multiple></label>';
function checkFiles(files){
 if(files.length>3)throw Error('Maximum 3 attachments per message.');
 for(const file of files)if(!allowedTypes.has(file.type)||file.size>5*1024*1024)throw Error('Only images or PDF files up to 5 MB are allowed.');
}
async function uploadFiles(files,userId,ticketId){
 checkFiles(files);
 const uploaded=[];
 try{
  for(const file of files){
   const path=userId+'/'+ticketId+'/'+crypto.randomUUID()+'-'+safeFileName(file.name);
   const result=await supabase.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
   if(result.error)throw result.error;
   uploaded.push({path,name:file.name,type:file.type});
  }
  return uploaded;
 }catch(error){
  await Promise.all(uploaded.map(file=>supabase.storage.from(BUCKET).remove([file.path])));
  throw error;
 }
}
async function renderAttachments(host,files){
 for(const file of Array.isArray(files)?files:[]){
  if(!file.path||!file.name)continue;
  const {data,error}=await supabase.storage.from(BUCKET).createSignedUrl(file.path,180);
  if(error||!data?.signedUrl)continue;
  const button=document.createElement('button');button.type='button';button.className='sf-support-attachment';
  const image=String(file.type).startsWith('image/');
  if(image){const img=document.createElement('img');img.src=data.signedUrl;img.alt=file.name;img.loading='lazy';button.append(img)}
  else button.textContent='📄 '+file.name;
  button.title='Open '+file.name;
  button.onclick=()=>{if(image)showAttachment(data.signedUrl,file.name);else window.open(data.signedUrl,'_blank','noopener,noreferrer')};
  host.append(button);
 }
}
function showAttachment(url,name){
 const viewer=document.createElement('div');viewer.className='sf-support-lightbox';
 const img=document.createElement('img');img.src=url;img.alt=name;
 const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close image');
 viewer.append(img,close);close.onclick=()=>viewer.remove();viewer.onclick=e=>{if(e.target===viewer)viewer.remove()};
 document.body.append(viewer);
}
async function hydrateAttachments(){
 if(!overlay||overlay.hidden)return;
 const t=records.find(t=>t.id===selectedTicket);
 if(!t)return;
 const nodes=overlay.querySelectorAll('[data-attachment-source]');
 for(const node of nodes){
  const id=node.dataset.attachmentSource;
  const files=id==='original'?t.attachments:messages.find(m=>m.id===id)?.attachments;
  await renderAttachments(node,files);
 }
}
function supportToast(ticketId,subject){
 if(!toast){toast=document.createElement('div');toast.className='sf-social-toast sf-support-toast';toast.hidden=true;document.body.append(toast)}
 toast.innerHTML='<div class="sf-social-toast-head"><span class="sf-social-toast-symbol">✉</span><div class="sf-social-toast-copy"><small>SKYFRONT • SUPPORT REPLY</small><strong>'+esc(subject)+'</strong><span>Support has replied to your ticket</span></div><button type="button" data-dismiss aria-label="Dismiss">×</button></div><div class="sf-social-toast-actions"><button type="button" data-open-ticket>VIEW TICKET</button></div><div class="sf-social-toast-progress"></div>';
 toast.hidden=false;requestAnimationFrame(()=>toast.classList.add('visible'));
 const sound=new Audio(import.meta.env.BASE_URL+'audio/Notification.mp3');sound.volume=.55;sound.play().catch(()=>{});
 const dismiss=()=>{toast.classList.remove('visible');setTimeout(()=>{toast.hidden=true},220)};
 toast.querySelector('[data-dismiss]').onclick=dismiss;
 toast.querySelector('[data-open-ticket]').onclick=()=>{dismiss();void openSupportTicket(ticketId)};
 setTimeout(dismiss,9500);
}
async function pollNotifications(){
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return;
 const {data,error}=await supabase.from('sf_support_notifications').select('id,ticket_id,created_at,sf_support_tickets(subject)').eq('user_id',user.id).is('read_at',null).order('created_at',{ascending:true}).limit(10);
 if(error)return;
 for(const n of data||[]){
  if(seenNotifications.has(n.id))continue;
  seenNotifications.add(n.id);
  supportToast(n.ticket_id,n.sf_support_tickets?.subject||'Your support ticket');
  await supabase.from('sf_support_notifications').update({read_at:new Date().toISOString()}).eq('id',n.id);
 }
}
export function installSupportNotifications(){
 if(notificationTimer)return;
 void pollNotifications();
 notificationTimer=setInterval(()=>{void pollNotifications()},12000);
}
export async function openSupportTicket(ticketId){
 await open(false);
 if(!overlay||overlay.hidden)return;
 const t=records.find(item=>item.id===ticketId&&item.status!=='closed');
 if(t){selectedTicket=t.id;view='detail';await load({force:true})}
 else{view='tickets';await load({force:true})}
}
const date=v=>new Date(v).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});
function status(s){return ({open:'OPEN',in_progress:'IN PROGRESS',waiting:'WAITING FOR PLAYER',closed:'CLOSED'})[s]||s}
function shell(){
 if(!overlay){overlay=document.createElement('div');overlay.className='sf-support-overlay';overlay.hidden=true}
 (embeddedHost||document.body).append(overlay);
 overlay.classList.toggle('sf-support-embedded',!!embeddedHost);
 overlay.innerHTML='<div class="sf-support-backdrop" data-backdrop></div><section class="sf-support-dialog" role="dialog" aria-modal="true" aria-label="Support portal"><header><div><small>SKYFRONT / '+(adminMode?'ADMINISTRATION':'PLAYER SUPPORT')+'</small><h2>'+(adminMode?'SUPPORT MANAGEMENT':'SUPPORT PORTAL')+'</h2></div><button type="button" data-close aria-label="Close support">×</button></header><div class="sf-support-body"></div></section>';
 overlay.hidden=false;requestAnimationFrame(()=>overlay.classList.add('visible'));
 overlay.querySelector('[data-close]').onclick=closeSupport;
 overlay.querySelector('[data-backdrop]').onclick=closeSupport;
}
export function closeSupport(){
 requestVersion++;if(!overlay)return;
 const wasEmbedded=!!embeddedHost;
 overlay.classList.remove('visible');overlay.hidden=true;
 clearInterval(refreshTimer);refreshTimer=null;
 if(channel){void supabase.removeChannel(channel);channel=null}
 if(wasEmbedded){embeddedHost=null;window.dispatchEvent(new CustomEvent('skyfront:support-admin-closed'))}
}
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
 if(view==='detail')void hydrateAttachments();
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
   let files=[];
   try{files=Array.from(form.elements.attachments?.files||[]);checkFiles(files)}catch(error){note.textContent=error.message;submit.disabled=false;busy=false;return}
   const result=await supabase.from('sf_support_tickets').insert(payload).select('id').single();
   if(result.error){note.textContent=result.error.message;submit.disabled=false;busy=false;return}
   if(files.length){try{const attachments=await uploadFiles(files,user.id,result.data.id);const saved=await supabase.from('sf_support_tickets').update({attachments}).eq('id',result.data.id);if(saved.error)throw saved.error}catch(error){note.textContent='Ticket created, but attachments failed: '+error.message;submit.disabled=false;busy=false;return}}
   selectedTicket=result.data.id;view='detail';busy=false;await load({force:true});
  };
 }else if(view==='tickets'){
  const list=records.filter(t=>adminMode||t.status!=='closed');
  body.innerHTML='<div class="sf-support-toolbar">'+button('← BACK',adminMode?'admin-home':'home')+'</div><div class="sf-support-intro"><strong>'+(adminMode?'ALL SUPPORT TICKETS':'YOUR TICKETS')+'</strong><p>'+(adminMode?'Review, respond and resolve player requests.':'View replies and track the progress of your requests.')+'</p></div><div class="sf-support-filters">'+(adminMode?'<select data-filter><option value="active" '+(adminFilter==='active'?'selected':'')+'>ACTIVE TICKETS</option><option value="all" '+(adminFilter==='all'?'selected':'')+'>ALL TICKETS</option><option value="closed" '+(adminFilter==='closed'?'selected':'')+'>CLOSED</option></select><select data-category-filter aria-label="Filter tickets by category"><option value="all">ALL CATEGORIES</option>'+Object.entries(categories).map(([key,c])=>'<option value="'+key+'" '+(categoryFilter===key?'selected':'')+'>'+c.title+'</option>').join('')+'</select><select data-priority-filter aria-label="Filter tickets by priority"><option value="all">ALL PRIORITIES</option>'+PRIORITIES.map(p=>'<option value="'+p+'" '+(priorityFilter===p?'selected':'')+'>'+p.toUpperCase()+'</option>').join('')+'</select>':'')+'<input data-search placeholder="Search tickets by subject or category…" value="'+esc(searchTerm)+'" aria-label="Search tickets"></div><div class="sf-support-list"></div>';
  const listHost=body.querySelector('.sf-support-list');
  const draw=()=>{const filter=adminMode?adminFilter:'all';const filtered=list.filter(t=>(filter==='all'||filter==='active'&&t.status!=='closed'||filter==='closed'&&t.status==='closed')&&(!adminMode||categoryFilter==='all'||t.category===categoryFilter)&&(!adminMode||priorityFilter==='all'||t.priority===priorityFilter)&&[t.subject,t.username,t.category,t.description].some(v=>String(v||'').toLowerCase().includes(searchTerm.toLowerCase())));listHost.innerHTML=filtered.length?filtered.map(t=>'<button class="sf-support-ticket" data-ticket="'+esc(t.id)+'"><span><strong>'+esc(t.subject)+'</strong><small>'+esc(categories[t.category]?.title||t.category)+' · '+(adminMode?esc(t.username)+' · ':'')+date(t.created_at)+'</small></span><b class="sf-support-status" data-status="'+esc(t.status)+'">'+status(t.status)+'</b><i>›</i></button>').join(''):'<p class="sf-support-empty">No tickets found.</p>';listHost.querySelectorAll('[data-ticket]').forEach(b=>b.onclick=async()=>{selectedTicket=b.dataset.ticket;view='detail';await load()})};
  body.querySelector('[data-filter]')?.addEventListener('change',e=>{adminFilter=e.target.value;draw()});
  body.querySelector('[data-category-filter]')?.addEventListener('change',e=>{categoryFilter=e.target.value;draw()});
  body.querySelector('[data-priority-filter]')?.addEventListener('change',e=>{priorityFilter=e.target.value;draw()});
  body.querySelector('[data-search]')?.addEventListener('input',e=>{searchTerm=e.target.value;draw()});draw();
 }else if(view==='detail'){
  const t=records.find(t=>t.id===selectedTicket);if(!t){view='tickets';render();return}
  body.innerHTML='<div class="sf-support-toolbar">'+button('← ALL TICKETS','tickets')+'<span class="sf-support-status" data-status="'+esc(t.status)+'">'+status(t.status)+'</span></div><div class="sf-support-intro"><small>'+esc(categories[t.category]?.title||t.category)+' · '+date(t.created_at)+'</small><strong>'+esc(t.subject)+'</strong>'+(adminMode?'<p>FROM '+esc(t.username)+'</p>':'')+'</div><div class="sf-support-thread"><article class="sf-support-message"><small>'+esc(t.username)+' · ORIGINAL REQUEST</small><p>'+esc(t.description)+'</p><div class="sf-support-attachments" data-attachment-source="original"></div>'+Object.entries(t.details||{}).map(([k,v])=>'<div class="sf-support-detail"><b>'+esc(k.replaceAll('_',' '))+'</b> '+esc(v)+'</div>').join('')+'</article>'+messages.map(m=>'<article class="sf-support-message '+(m.sender_id===t.user_id?'':'is-staff')+'"><small>'+(m.sender_id===t.user_id?esc(t.username):'SKYFRONT SUPPORT')+' · '+date(m.created_at)+'</small><p>'+esc(m.body)+'</p><div class="sf-support-attachments" data-attachment-source="'+esc(m.id)+'"></div></article>').join('')+'</div>'+(adminMode?'<div class="sf-support-admin-actions"><label>PRIORITY<select data-priority-select>'+PRIORITIES.map(p=>'<option value="'+p+'" '+(t.priority===p?'selected':'')+'>'+p.toUpperCase()+'</option>').join('')+'</select></label><label>STATUS<select data-status-select>'+[['open','OPEN'],['in_progress','IN PROGRESS'],['waiting','WAITING FOR PLAYER'],['closed','CLOSED']].map(([v,l])=>'<option value="'+v+'" '+(t.status===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label>'+button('CLOSE TICKET','close-ticket','class="sf-support-danger" '+(t.status==='closed'?'disabled':''))+'</div>':'')+(!adminMode&&t.status==='closed'?'<div class="sf-support-rating"><strong>RATE YOUR SUPPORT EXPERIENCE</strong><p>'+(t.rating?'You rated this ticket '+t.rating+' / 5 stars.':'How helpful was our support?')+'</p>'+(t.rating?'':'<div class="sf-support-stars">'+[1,2,3,4,5].map(n=>'<button type="button" data-rate="'+n+'" aria-label="Rate '+n+' stars">★</button>').join('')+'</div>')+'</div>':'')+(t.status!=='closed'?'<form class="sf-support-reply"><label>'+(adminMode?'REPLY TO PLAYER':'SEND A REPLY')+'<textarea name="reply" maxlength="6000" rows="3" placeholder="Write your message..."></textarea></label>'+attachmentsInput+'<p role="status"></p><button class="sf-support-primary" type="submit">SEND REPLY</button></form>':'<p class="sf-support-closed">This ticket is closed. The conversation is archived.</p>');
  body.querySelectorAll('[data-rate]').forEach(b=>b.onclick=async()=>{const rating=Number(b.dataset.rate);const r=await supabase.from('sf_support_tickets').update({rating}).eq('id',t.id);if(r.error){renderError(r.error.message);return}await load({force:true})});
  const form=body.querySelector('form');
  if(form)form.onsubmit=async e=>{e.preventDefault();busy=true;const btn=form.querySelector('button'),msg=form.querySelector('[role=status]');btn.disabled=true;const {data:{user}}=await supabase.auth.getUser();let attachments=[];try{attachments=await uploadFiles(Array.from(form.elements.attachments?.files||[]),user.id,t.id)}catch(error){msg.textContent=error.message;btn.disabled=false;busy=false;return}const bodyText=form.elements.reply.value.trim();if(!bodyText&&!attachments.length){msg.textContent='Write a reply or attach a file.';btn.disabled=false;busy=false;return}const r=await supabase.from('sf_support_messages').insert({ticket_id:t.id,sender_id:user.id,body:bodyText||'Attachment',attachments});if(r.error){msg.textContent=r.error.message;btn.disabled=false;busy=false;return}if(adminMode){await supabase.from('sf_support_tickets').update({status:'waiting',updated_at:new Date().toISOString()}).eq('id',t.id)}busy=false;await load({force:true})};
  body.querySelector('[data-priority-select]')?.addEventListener('change',async e=>{const r=await supabase.from('sf_support_tickets').update({priority:e.target.value,updated_at:new Date().toISOString()}).eq('id',t.id);if(r.error){renderError(r.error.message);return}await load({force:true})});
  body.querySelector('[data-status-select]')?.addEventListener('change',async e=>{const v=e.target.value;const r=await supabase.from('sf_support_tickets').update({status:v,closed_at:v==='closed'?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',t.id);if(r.error){renderError(r.error.message);return}await load({force:true})});
 }else if(view==='admin-home'){
  const open=records.filter(t=>t.status!=='closed').length;
  const rated=records.filter(t=>t.rating!=null),avg=rated.length?(rated.reduce((sum,t)=>sum+Number(t.rating),0)/rated.length).toFixed(1):'—';
  body.innerHTML='<div class="sf-support-intro"><strong>SUPPORT DASHBOARD</strong><p>Incoming tickets, priority workload and player feedback.</p></div><div class="sf-support-admin-summary"><div><small>ACTIVE</small><strong>'+open+'</strong></div><div><small>CLOSED</small><strong>'+records.filter(t=>t.status==='closed').length+'</strong></div><div><small>URGENT / HIGH</small><strong>'+records.filter(t=>t.status!=='closed'&&['urgent','high'].includes(t.priority)).length+'</strong></div><div><small>AVG RATING</small><strong>'+avg+' ★</strong></div></div><div class="sf-support-dashboard-section"><h3>PLAYER SUPPORT RATINGS</h3><p>'+rated.length+' rated ticket(s)</p><div class="sf-support-rating-bars">'+[5,4,3,2,1].map(stars=>'<div><span>'+stars+' ★</span><meter min="0" max="'+Math.max(1,rated.length)+'" value="'+rated.filter(t=>t.rating===stars).length+'"></meter><b>'+rated.filter(t=>t.rating===stars).length+'</b></div>').join('')+'</div></div><div class="sf-support-dashboard-section"><h3>PRIORITY OVERVIEW</h3><div class="sf-support-priority-overview">'+PRIORITIES.map(p=>'<div><span>'+p.toUpperCase()+'</span><strong>'+records.filter(t=>t.status!=='closed'&&t.priority===p).length+'</strong></div>').join('')+'</div></div>'+button('VIEW ALL TICKETS','tickets','class="sf-support-primary"');
 }
 body.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{
  const action=b.dataset.action;
  if(action==='close-ticket'){if(!confirm('Close this ticket? It will disappear from the player’s ticket list.'))return;const r=await supabase.from('sf_support_tickets').update({status:'closed',closed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',selectedTicket);if(r.error){renderError(r.error.message);return}await load({force:true});return}
  view=action;selectedTicket=null;await load({force:true});
 });
}
async function open(isAdmin,host=null){
 closeSupport();
 embeddedHost=host;
 adminMode=isAdmin;view=isAdmin?'admin-home':'home';selectedTicket=null;messages=[];searchTerm='';adminFilter='active';categoryFilter='all';priorityFilter='all';lastSignature='';busy=false;shell();await load({force:true});
 refreshTimer=setInterval(()=>{if(!overlay?.hidden)void load()},12000);
 channel=supabase.channel('sf-support-'+(isAdmin?'admin':'player')).on('postgres_changes',{event:'*',schema:'public',table:'sf_support_tickets'},()=>{if(!overlay.hidden)void load()}).on('postgres_changes',{event:'*',schema:'public',table:'sf_support_messages'},()=>{if(!overlay.hidden)void load()}).subscribe();
}
export function openSupportPortal(){return open(false)}
export function openSupportAdmin(host=null){return open(true,host)}
