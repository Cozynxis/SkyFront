import { createClient } from '@supabase/supabase-js';
import './community.css';

export const supabase = createClient('https://tknnvjwjemwjodolsduh.supabase.co','sb_publishable_FHvReg6qTqKLD1QN2R7JKw_UipWliD6');
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const dateLabel = date => new Date(date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const pollCountdown = end => {
 const ms=Date.parse(end)-Date.now();
 if(!Number.isFinite(ms)||ms<=0)return 'Ended';
 const seconds=Math.ceil(ms/1000);
 if(seconds<60)return '00:'+String(seconds).padStart(2,'0');
 if(seconds<3600)return Math.floor(seconds/60)+'m '+String(seconds%60).padStart(2,'0')+'s';
 return Math.floor(seconds/3600)+'h '+String(Math.floor((seconds%3600)/60)).padStart(2,'0')+'m';
};
const notify = (root,message) => {const n=root.querySelector('.cm-status');if(n){n.textContent=message;n.hidden=!message;}};
export function mountCommunity(){
 const root=document.querySelector('#community-root');
 if(!root)return ()=>{};
 let destroyed=false, user=null, isAdmin=false, section='news', editing=null;
 let articles=[],polls=[],options=[],votes=[],counts={};
 let archiveOpen=false,adminTab='news',adminSearch='',adminFilter='all';
 let channel=null,refreshTimer=null;
 const safeImage=url=> /^https:\/\//i.test(url||'') ? url : '';
 root.innerHTML=`<div class="cm-wrap"><div class="cm-hero"><div><span class="cm-kicker">SKYFRONT / COMMUNITY</span><h1>THE COMMUNITY</h1><p>Updates, announcements and your vote on what's next.</p></div><div class="cm-actions"><button class="cm-admin" hidden type="button">ADMIN STUDIO</button></div></div><div class="cm-tabs"><button data-tab="news" class="active">NEWS & ANNOUNCEMENTS</button><button data-tab="polls">COMMUNITY POLLS</button></div><div class="cm-status" role="status" hidden></div><div class="cm-content"></div></div><div class="cm-modal-host"></div>`;
 const content=root.querySelector('.cm-content'), modalHost=root.querySelector('.cm-modal-host');
 // Keep dialogs outside the animated stage so fixed positioning uses the viewport.
 document.body.appendChild(modalHost);
 const query=(selector)=>root.querySelector(selector);
 function modal(html){
  modalHost.innerHTML=`<div class="cm-modal-backdrop"><section class="cm-modal" role="dialog" aria-modal="true"><button class="cm-close" aria-label="Close dialog" type="button">×</button>${html}</section></div>`;
  modalHost.querySelector('.cm-close').onclick=()=>modalHost.replaceChildren();
  modalHost.querySelector('.cm-modal-backdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)modalHost.replaceChildren()});
 }
 async function checkAccount(){
  const {data}=await supabase.auth.getUser();user=data.user||null;
  isAdmin=false;
  if(user){const {data:admin}=await supabase.from('sf_admins').select('user_id').eq('user_id',user.id).maybeSingle();isAdmin=!!admin;}
  query('.cm-admin').hidden=!isAdmin;

 }
 async function load(){
  const [a,p,o,v]=await Promise.all([
   supabase.from('sf_announcements').select('*').order('pinned',{ascending:false}).order('created_at',{ascending:false}),
   supabase.from('sf_polls').select('*').order('created_at',{ascending:false}),
   supabase.from('sf_poll_options').select('*').order('position'),
   user?supabase.from('sf_poll_votes').select('poll_id,option_id,user_id'):Promise.resolve({data:[]})
  ]);
  if(destroyed)return;
  for(const r of [a,p,o,v])if(r.error){notify(root,'Unable to load Community: '+r.error.message);return;}
  articles=a.data||[];polls=p.data||[];options=o.data||[];votes=v.data||[];
  const results=await Promise.all(polls.map(p=>supabase.rpc('sf_poll_results',{p_poll_id:p.id})));
  counts={};results.forEach((r,i)=>{if(!r.error)(r.data||[]).forEach(x=>counts[x.option_id]=Number(x.votes))});
  render();
 }
 function render(){
  if(section==='news')content.innerHTML=`<div class="cm-section-title"><h2>LATEST NEWS</h2><span>${articles.filter(a=>a.published).length} POSTS</span></div><div class="cm-news-grid">${articles.some(a=>a.published)?articles.filter(a=>a.published).map(a=>`<button class="cm-news-card ${a.pinned?'cm-news-pinned':''}" data-article="${a.id}"><div class="cm-news-art ${safeImage(a.image_url)?'cm-news-art-image':''}">${safeImage(a.image_url)?`<img src="${escapeHTML(a.image_url)}" alt="" loading="lazy">`:'<span class="cm-art-logo">S</span>'}</div><div class="cm-news-body"><span class="cm-category">${escapeHTML(a.category)} ${a.pinned?'✦ PINNED':''}</span><h3>${escapeHTML(a.title)}</h3><p>${escapeHTML(a.body.slice(0,150))}${a.body.length>150?'…':''}</p><small>${dateLabel(a.created_at)}</small></div></button>`).join(''):'<div class="cm-empty">No announcements yet. Check back soon.</div>'}</div>`;
  else if(section==='polls'){
   const now=Date.now(),isOpen=p=>p.active&&(!p.closes_at||Date.parse(p.closes_at)>now);
   const category=p=>{
    if(p.placement&&p.placement!=='auto')return p.placement;
    if(isOpen(p))return 'active';
    const ended=Date.parse(p.ended_at||(p.closes_at&&Date.parse(p.closes_at)<=now?p.closes_at:p.created_at));
    return now-ended<86400000?'recent':'archive';
   };
   const card=p=>{
    const opts=options.filter(o=>o.poll_id===p.id),selected=votes.find(v=>v.poll_id===p.id&&v.user_id===user?.id),total=opts.reduce((n,o)=>n+(counts[o.id]||0),0),open=isOpen(p);
    return `<article class="cm-poll ${open?'':'cm-poll-ended'}"><div class="cm-poll-top"><span>${open?'● LIVE POLL':'✓ ENDED'}</span><small>${open&&p.closes_at?`Ends in <span class="cm-poll-countdown" data-ends-at="${escapeHTML(p.closes_at)}">${pollCountdown(p.closes_at)}</span>`:dateLabel(p.created_at)}</small></div><h3>${escapeHTML(p.question)}</h3><div class="cm-choices">${opts.map(o=>{const pct=total?Math.round((counts[o.id]||0)/total*100):0;return `<button data-vote="${o.id}" data-poll="${p.id}" ${!open?'disabled':''} class="${selected?.option_id===o.id?'chosen':''}"><span>${escapeHTML(o.label)}</span>${selected||!open?`<b>${pct}%</b><i style="width:${pct}%"></i>`:''}</button>`}).join('')}</div><p>${total} votes · ${!open?'Final results':selected?'Vote saved · select another answer to change':'Choose an answer to vote'}</p></article>`;
   };
   const recent=polls.filter(p=>category(p)==='recent'),active=polls.filter(p=>category(p)==='active'),archive=polls.filter(p=>category(p)==='archive');
   content.innerHTML=`<div class="cm-section-title"><h2>COMMUNITY POLLS</h2><span>${active.length} ACTIVE</span></div>
   ${recent.length?`<section class="cm-poll-group cm-recent"><div class="cm-group-heading"><h3>✦ JUST ENDED</h3><p>Recently finished polls</p></div><div class="cm-polls-grid">${recent.map(card).join('')}</div></section>`:''}
   <section class="cm-poll-group"><div class="cm-group-heading"><h3>● ACTIVE POLLS</h3><p>Make your choice · change your vote anytime before a poll ends</p></div><div class="cm-polls-grid">${active.length?active.map(card).join(''):'<div class="cm-empty">No active polls right now.</div>'}</div></section>
   <section class="cm-archive"><button type="button" class="cm-archive-toggle" data-archive-toggle aria-expanded="${archiveOpen}"><span>ENDED POLLS <small>${archive.length} in archive</small></span><span class="cm-archive-arrow">${archiveOpen?'▾':'▸'}</span></button>${archiveOpen?`<div class="cm-polls-grid cm-archive-grid">${archive.length?archive.map(card).join(''):'<div class="cm-empty">No archived polls yet.</div>'}</div>`:''}</section>`;
  }
  query('.cm-tabs [data-tab="news"]').classList.toggle('active',section==='news');
  query('.cm-tabs [data-tab="polls"]').classList.toggle('active',section==='polls');
 }
 query('.cm-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){section=b.dataset.tab;render()}});
 content.addEventListener('click',async e=>{
  const a=e.target.closest('[data-article]');if(a){const post=articles.find(x=>x.id===a.dataset.article);if(!post)return;modal(`<span class="cm-kicker">${escapeHTML(post.category)} / ${dateLabel(post.created_at)}</span><h2>${escapeHTML(post.title)}</h2>${safeImage(post.image_url)?`<div class="cm-modal-image-frame"><img class="cm-modal-image" src="${escapeHTML(post.image_url)}" alt=""></div>`:''}<p class="cm-article-text">${escapeHTML(post.body)}</p>`);return;}
  if(e.target.closest('[data-archive-toggle]')){archiveOpen=!archiveOpen;render();return;}
  const b=e.target.closest('[data-vote]');if(!b)return;
  if(!user){showAuth();return;}
  const existing=votes.find(v=>v.poll_id===b.dataset.poll&&v.user_id===user.id);
  if(existing?.option_id===b.dataset.vote)return;
  b.disabled=true;
  const {error}=existing?await supabase.from('sf_poll_votes').update({option_id:b.dataset.vote}).eq('poll_id',b.dataset.poll).eq('user_id',user.id):await supabase.from('sf_poll_votes').insert({poll_id:b.dataset.poll,option_id:b.dataset.vote,user_id:user.id});
  if(error){b.disabled=false;notify(root,error.message)}else await load();
 });
 function showAuth(){
  modal(`<span class="cm-kicker">SKYFRONT ACCOUNT</span><h2>WELCOME BACK</h2><p>Sign in to vote. New here? Create an account with your email.</p><form class="cm-auth-form"><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="current-password" minlength="6" required></label><div class="cm-form-actions"><button type="submit" data-action="signin">SIGN IN</button><button type="button" data-action="signup">REGISTER</button></div><p class="cm-form-message" role="status"></p></form>`);
  const form=modalHost.querySelector('form');
  async function submit(action){
   const email=form.elements.email.value.trim(),password=form.elements.password.value,msg=form.querySelector('.cm-form-message');
   if(!email||!password){msg.textContent='Enter email and password.';return;}
   const {data,error}=action==='signup'?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});
   if(error){msg.textContent=error.message;return;}
   if(action==='signup'&&!data.session){msg.textContent='Account created. Check your email for the confirmation link.';return;}
   modalHost.replaceChildren();await checkAccount();await load();
  }
  form.addEventListener('submit',e=>{e.preventDefault();submit('signin')});
  form.querySelector('[data-action="signup"]').onclick=()=>submit('signup');
 }
 query('.cm-admin').onclick=()=>showAdmin();
 function showAdmin(){
  if(!isAdmin)return;
  editing=null;
  modal(`<div class="cm-studio-header"><div><span class="cm-kicker">SKYFRONT / CREATOR STUDIO</span><h2>COMMUNITY CONTROL</h2><p>Manage announcements and polls in one place.</p></div><div class="cm-studio-live">● LIVE CONTROL</div></div><div class="cm-studio-stats"><div><small>ANNOUNCEMENTS</small><strong>${articles.length}</strong></div><div><small>PUBLISHED</small><strong>${articles.filter(a=>a.published).length}</strong></div><div><small>ACTIVE POLLS</small><strong>${polls.filter(p=>p.active&&(!p.closes_at||Date.parse(p.closes_at)>Date.now())).length}</strong></div><div><small>TOTAL POLLS</small><strong>${polls.length}</strong></div></div><div class="cm-admin-tabs"><button data-admin="news">✎ ANNOUNCEMENTS</button><button data-admin="polls">◈ POLLS</button></div><div class="cm-admin-area"></div>`);
  const area=modalHost.querySelector('.cm-admin-area');
  function adminSection(type){
   adminTab=type;
   modalHost.querySelectorAll('[data-admin]').forEach(b=>b.classList.toggle('active',b.dataset.admin===type));
   if(type==='news'){
    const filtered=articles.filter(a=>(adminFilter==='all'||(adminFilter==='pinned'&&a.pinned)||(adminFilter==='draft'&&!a.published)||(adminFilter==='published'&&a.published))&&(a.title+' '+a.category).toLowerCase().includes(adminSearch.toLowerCase()));
    area.innerHTML=`<div class="cm-studio-toolbar"><div><h3>ANNOUNCEMENTS</h3><small>Publish, edit, pin and organize your news.</small></div><button type="button" class="cm-studio-new" data-new-news>+ NEW POST</button></div>
    <div class="cm-studio-layout"><div class="cm-studio-library"><div class="cm-studio-filters"><input type="search" data-admin-search placeholder="Search announcements..." value="${escapeHTML(adminSearch)}" aria-label="Search announcements"><select data-admin-filter aria-label="Filter announcements"><option value="all" ${adminFilter==='all'?'selected':''}>ALL POSTS</option><option value="published" ${adminFilter==='published'?'selected':''}>PUBLISHED</option><option value="draft" ${adminFilter==='draft'?'selected':''}>DRAFTS</option><option value="pinned" ${adminFilter==='pinned'?'selected':''}>PINNED</option></select></div><div class="cm-studio-items">${filtered.map(a=>`<article class="cm-studio-item ${editing?.id===a.id?'selected':''}"><div class="cm-studio-thumb">${safeImage(a.image_url)?`<img src="${escapeHTML(a.image_url)}" alt="" loading="lazy">`:'<b>S</b>'}</div><div class="cm-studio-item-body"><strong>${escapeHTML(a.title)}</strong><small>${escapeHTML(a.category)} · ${dateLabel(a.created_at)}</small><div class="cm-studio-tags">${a.pinned?'<span>✦ PINNED</span>':''}<span class="${a.published?'is-live':'is-draft'}">${a.published?'● LIVE':'◌ DRAFT'}</span></div></div><div class="cm-studio-item-actions"><button type="button" data-edit="${a.id}">EDIT</button><button type="button" data-pin="${a.id}">${a.pinned?'UNPIN':'PIN'}</button><button type="button" data-publish="${a.id}">${a.published?'UNPUBLISH':'PUBLISH'}</button><button type="button" data-duplicate="${a.id}">COPY</button><button type="button" data-delete="${a.id}">DELETE</button></div></article>`).join('')||'<p class="cm-studio-empty">No announcements match this filter.</p>'}</div></div>
    <div class="cm-studio-compose"><form class="cm-editor"><div class="cm-studio-compose-head"><h3>${editing?'EDIT POST':'CREATE POST'}</h3><span>${editing?'EDITING':'NEW'}</span></div><label>POST TITLE<input name="title" maxlength="160" required value="${escapeHTML(editing?.title||'')}" placeholder="Give your announcement a title"></label><label>CATEGORY<select name="category">${['News','Updates','Events','Patch Notes'].map(c=>`<option ${editing?.category===c?'selected':''}>${c}</option>`).join('')}</select></label><label>IMAGE URL (OPTIONAL)<input name="image_url" type="url" placeholder="https://" value="${escapeHTML(editing?.image_url||'')}"></label><div class="cm-studio-image-preview" data-image-preview><img alt="Image preview" hidden><span>Image preview appears here · automatically fits</span></div><label>ANNOUNCEMENT CONTENT<textarea name="body" rows="8" required placeholder="Write your update...">${escapeHTML(editing?.body||'')}</textarea></label><div class="cm-studio-checks"><label class="cm-check"><input type="checkbox" name="pinned" ${editing?.pinned?'checked':''}> ✦ Pin to top</label><label class="cm-check"><input type="checkbox" name="published" ${!editing||editing.published?'checked':''}> ● Published</label></div><div class="cm-studio-compose-actions"><button type="submit">${editing?'SAVE CHANGES':'PUBLISH POST'}</button><button type="button" data-clear-editor>CLEAR</button></div><p class="cm-form-message" role="status"></p></form></div></div>`;
    const imageInput=area.querySelector('[name=image_url]'),preview=area.querySelector('[data-image-preview]'),previewImage=preview.querySelector('img');
    const updatePreview=()=>{const url=safeImage(imageInput.value.trim());previewImage.hidden=!url;preview.querySelector('span').hidden=!!url;if(url)previewImage.src=url;else previewImage.removeAttribute('src')};
    imageInput.addEventListener('input',updatePreview);previewImage.onerror=()=>{previewImage.hidden=true;preview.querySelector('span').hidden=false;preview.querySelector('span').textContent='Image could not be loaded · check the URL'};updatePreview();
    area.querySelector('[data-new-news]').onclick=()=>{editing=null;adminSection('news')};
    area.querySelector('[data-clear-editor]').onclick=()=>{editing=null;adminSection('news')};
    area.querySelector('[data-admin-search]').oninput=e=>{const pos=e.target.selectionStart;adminSearch=e.target.value;adminSection('news');const input=area.querySelector('[data-admin-search]');input.focus();input.setSelectionRange(pos,pos)};
    area.querySelector('[data-admin-filter]').onchange=e=>{adminFilter=e.target.value;adminSection('news')};
    const form=area.querySelector('form');
    form.onsubmit=async e=>{e.preventDefault();const f=new FormData(form),payload={title:String(f.get('title')).trim(),body:String(f.get('body')).trim(),category:f.get('category'),image_url:String(f.get('image_url')).trim()||null,pinned:f.has('pinned'),published:f.has('published'),updated_at:new Date().toISOString()};const r=editing?await supabase.from('sf_announcements').update(payload).eq('id',editing.id):await supabase.from('sf_announcements').insert(payload);if(r.error)form.querySelector('.cm-form-message').textContent=r.error.message;else{editing=null;await load();adminSection('news')}};
    area.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editing=articles.find(a=>a.id===b.dataset.edit);adminSection('news')});
    for(const [attr,column] of [['data-pin','pinned'],['data-publish','published']])area.querySelectorAll('['+attr+']').forEach(b=>b.onclick=async()=>{const a=articles.find(x=>x.id===b.getAttribute(attr));if(!a)return;const r=await supabase.from('sf_announcements').update({[column]:!a[column],updated_at:new Date().toISOString()}).eq('id',a.id);if(r.error)alert(r.error.message);else{await load();adminSection('news')}});
    area.querySelectorAll('[data-duplicate]').forEach(b=>b.onclick=()=>{const a=articles.find(x=>x.id===b.dataset.duplicate);if(!a)return;editing=null;adminSection('news');const form=area.querySelector('form');form.elements.title.value=a.title+' (Copy)';form.elements.body.value=a.body;form.elements.category.value=a.category;form.elements.image_url.value=a.image_url||'';form.elements.pinned.checked=false;form.elements.published.checked=false;form.elements.image_url.dispatchEvent(new Event('input'));form.querySelector('[name=title]').focus()});
    area.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this announcement?'))return;const r=await supabase.from('sf_announcements').delete().eq('id',b.dataset.delete);if(r.error)alert(r.error.message);else{await load();adminSection('news')}});
   }else{
    area.innerHTML=`<form class="cm-editor"><h3>${editing?.id?"EDIT":"CREATE"} POLL</h3><label>Question<input name="question" required maxlength="240" value="${escapeHTML(editing?.question||'')}"></label><label>Options (one per line, 2–8)<textarea name="options" rows="6" required>${escapeHTML(editing?.id?options.filter(o=>o.poll_id===editing.id).map(o=>o.label).join("\n"):"")}</textarea></label><label>End date / time<input name="closes_at" type="datetime-local" value="${editing?.closes_at?new Date(Date.parse(editing.closes_at)-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16):''}"></label><div class="cm-poll-presets"><span>QUICK TIMER</span><button type="button" data-poll-duration="1">1 MIN</button><button type="button" data-poll-duration="5">5 MIN</button><button type="button" data-poll-duration="15">15 MIN</button><button type="button" data-poll-duration="60">1 HOUR</button><button type="button" data-poll-duration="1440">24 HOURS</button></div><label>Placement<select name="placement"><option value="auto" ${(editing?.placement||'auto')==='auto'?'selected':''}>Automatic</option><option value="recent" ${(editing?.placement||'auto')==='recent'?'selected':''}>Pinned at top</option><option value="active" ${(editing?.placement||'auto')==='active'?'selected':''}>Active section</option><option value="archive" ${(editing?.placement||'auto')==='archive'?'selected':''}>Ended archive</option></select></label><button type="submit">${editing?.id?"SAVE POLL":"PUBLISH POLL"}</button><p class="cm-form-message"></p></form><div class="cm-admin-list">${polls.map(p=>`<div><span>${escapeHTML(p.question)}</span><button data-edit-poll="${p.id}">EDIT</button><select data-place="${p.id}" aria-label="Move poll"><option value="auto" ${p.placement==="auto"?"selected":""}>AUTO</option><option value="recent" ${p.placement==="recent"?"selected":""}>PIN</option><option value="active" ${p.placement==="active"?"selected":""}>ACTIVE</option><option value="archive" ${p.placement==="archive"?"selected":""}>ARCHIVE</option></select><button data-toggle="${p.id}">${p.active?'CLOSE':'REOPEN'}</button><button data-delete-poll="${p.id}">DELETE</button></div>`).join('')}</div>`;
    area.querySelectorAll('[data-poll-duration]').forEach(b=>b.onclick=()=>{const d=new Date(Date.now()+Number(b.dataset.pollDuration)*60000);const local=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);area.querySelector('[name=closes_at]').value=local;area.querySelectorAll('[data-poll-duration]').forEach(x=>x.classList.toggle('selected',x===b))});
    area.querySelector('form').onsubmit=async e=>{
      e.preventDefault();
      const form=e.currentTarget,f=new FormData(form),msg=form.querySelector('.cm-form-message');
      const opts=String(f.get('options')).split('\n').map(x=>x.trim()).filter(Boolean);
      if(opts.length<2||opts.length>8){msg.textContent='Enter 2–8 options.';return;}
      const payload={question:String(f.get('question')).trim(),placement:f.get('placement'),closes_at:f.get('closes_at')?new Date(f.get('closes_at')).toISOString():null};
      if(editing?.id){
        const old=options.filter(o=>o.poll_id===editing.id);
        const changed=old.length!==opts.length||old.some((o,i)=>o.label!==opts[i]);
        if(changed&&votes.some(v=>v.poll_id===editing.id)){msg.textContent='Options cannot be changed once a poll has votes. Edit the question or placement instead.';return;}
        const r=await supabase.from('sf_polls').update(payload).eq('id',editing.id);
        if(r.error){msg.textContent=r.error.message;return;}
        if(changed){
          const d=await supabase.from('sf_poll_options').delete().eq('poll_id',editing.id);
          if(d.error){msg.textContent=d.error.message;return;}
          const o=await supabase.from('sf_poll_options').insert(opts.map((label,position)=>({poll_id:editing.id,label,position})));
          if(o.error){msg.textContent=o.error.message;return;}
        }
      }else{
        const r=await supabase.from('sf_polls').insert(payload).select('id').single();
        if(r.error){msg.textContent=r.error.message;return;}
        const o=await supabase.from('sf_poll_options').insert(opts.map((label,position)=>({poll_id:r.data.id,label,position})));
        if(o.error){await supabase.from('sf_polls').delete().eq('id',r.data.id);msg.textContent=o.error.message;return;}
      }
      editing=null;await load();adminSection('polls');
    };
    area.querySelectorAll('[data-edit-poll]').forEach(b=>b.onclick=()=>{editing=polls.find(p=>p.id===b.dataset.editPoll);adminSection('polls')});
    area.querySelectorAll('[data-place]').forEach(b=>b.onchange=async()=>{const r=await supabase.from('sf_polls').update({placement:b.value}).eq('id',b.dataset.place);if(r.error)alert(r.error.message);else{await load();adminSection('polls')}});
    area.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{const p=polls.find(x=>x.id===b.dataset.toggle);const r=await supabase.from('sf_polls').update({active:!p.active}).eq('id',p.id);if(r.error)alert(r.error.message);else{await load();adminSection('polls')}});
    area.querySelectorAll('[data-delete-poll]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this poll and its votes?'))return;const r=await supabase.from('sf_polls').delete().eq('id',b.dataset.deletePoll);if(r.error)alert(r.error.message);else{await load();adminSection('polls')}});
   }
  }
  modalHost.querySelectorAll('[data-admin]').forEach(b=>b.onclick=()=>{editing=null;adminTab=b.dataset.admin;adminSection(adminTab)});
  adminSection(adminTab);
 }
 const lifecycleTimer=setInterval(()=>{
  if(destroyed||section!=='polls')return;
  let expired=false;
  content.querySelectorAll('[data-ends-at]').forEach(el=>{
   const left=Date.parse(el.dataset.endsAt)-Date.now();
   if(left<=0){expired=true;return;}
   el.textContent=pollCountdown(el.dataset.endsAt);
  });
  if(expired)render();
 },1000);
 const refresh=()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(!destroyed)load()},350)};
 channel=supabase.channel('skyfront-community-live').on('postgres_changes',{event:'*',schema:'public',table:'sf_announcements'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'sf_polls'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'sf_poll_options'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'sf_poll_votes'},refresh).subscribe();
 const authListener=supabase.auth.onAuthStateChange(()=>{if(!destroyed)setTimeout(async()=>{if(!destroyed){await checkAccount();await load()}},0)});
 checkAccount().then(load);
 return ()=>{destroyed=true;clearInterval(lifecycleTimer);clearTimeout(refreshTimer);supabase.removeChannel(channel);authListener.data.subscription.unsubscribe();modalHost.remove()};
}
