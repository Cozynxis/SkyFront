import { createClient } from '@supabase/supabase-js';
import './community.css';

export const supabase = createClient('https://tknnvjwjemwjodolsduh.supabase.co','sb_publishable_FHvReg6qTqKLD1QN2R7JKw_UipWliD6');
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const dateLabel = date => new Date(date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const notify = (root,message) => {const n=root.querySelector('.cm-status');if(n){n.textContent=message;n.hidden=!message;}};
export function mountCommunity(){
 const root=document.querySelector('#community-root');
 if(!root)return ()=>{};
 let destroyed=false, user=null, isAdmin=false, section='news', editing=null;
 let articles=[],polls=[],options=[],votes=[],counts={};
 let channel=null,refreshTimer=null;
 const safeImage=url=> /^https:\/\//i.test(url||'') ? url : '';
 root.innerHTML=`<div class="cm-wrap"><div class="cm-hero"><div><span class="cm-kicker">SKYFRONT / COMMUNITY</span><h1>THE COMMUNITY</h1><p>Updates, announcements and your vote on what's next.</p></div><div class="cm-actions"><button class="cm-admin" hidden type="button">ADMIN STUDIO</button><button class="cm-account" type="button">SIGN IN</button></div></div><div class="cm-tabs"><button data-tab="news" class="active">NEWS & ANNOUNCEMENTS</button><button data-tab="polls">COMMUNITY POLLS</button></div><div class="cm-status" role="status" hidden></div><div class="cm-content"></div></div><div class="cm-modal-host"></div>`;
 const content=root.querySelector('.cm-content'), modalHost=root.querySelector('.cm-modal-host');
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
  query('.cm-account').textContent=user?'ACCOUNT / SIGN OUT':'SIGN IN / REGISTER';
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
  if(section==='news')content.innerHTML=`<div class="cm-section-title"><h2>LATEST NEWS</h2><span>${articles.length} POSTS</span></div><div class="cm-news-grid">${articles.length?articles.map(a=>`<button class="cm-news-card" data-article="${a.id}"><div class="cm-news-art">${safeImage(a.image_url)?`<img src="${escapeHTML(a.image_url)}" alt="" loading="lazy">`:'<span class="cm-art-logo">S</span>'}</div><div class="cm-news-body"><span class="cm-category">${escapeHTML(a.category)} ${a.pinned?'✦ PINNED':''}</span><h3>${escapeHTML(a.title)}</h3><p>${escapeHTML(a.body.slice(0,150))}${a.body.length>150?'…':''}</p><small>${dateLabel(a.created_at)}</small></div></button>`).join(''):'<div class="cm-empty">No announcements yet. Check back soon.</div>'}</div>`;
  else if(section==='polls')content.innerHTML=`<div class="cm-section-title"><h2>HAVE YOUR SAY</h2><span>${polls.length} POLLS</span></div><div class="cm-polls-grid">${polls.length?polls.map(p=>{
   const opts=options.filter(o=>o.poll_id===p.id),selected=votes.find(v=>v.poll_id===p.id&&v.user_id===user?.id),total=opts.reduce((s,o)=>s+(counts[o.id]||0),0),open=p.active&&(!p.closes_at||new Date(p.closes_at)>new Date());
   return `<article class="cm-poll"><div class="cm-poll-top"><span>${open?'● LIVE POLL':'CLOSED'}</span><small>${dateLabel(p.created_at)}</small></div><h3>${escapeHTML(p.question)}</h3><div class="cm-choices">${opts.map(o=>`<button data-vote="${o.id}" data-poll="${p.id}" ${(!open||!!selected)?'disabled':''} class="${selected?.option_id===o.id?'chosen':''}"><span>${escapeHTML(o.label)}</span>${selected||!open?`<b>${total?Math.round((counts[o.id]||0)/total*100):0}%</b><i style="width:${total?Math.round((counts[o.id]||0)/total*100):0}%"></i>`:''}</button>`).join('')}</div><p>${total} votes · ${selected?'Your vote is recorded':open?'Choose an answer to vote':'Voting ended'}</p></article>`;
  }).join(''):'<div class="cm-empty">No polls yet. Stay tuned.</div>'}</div>`;
  query('.cm-tabs [data-tab="news"]').classList.toggle('active',section==='news');
  query('.cm-tabs [data-tab="polls"]').classList.toggle('active',section==='polls');
 }
 query('.cm-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){section=b.dataset.tab;render()}});
 content.addEventListener('click',async e=>{
  const a=e.target.closest('[data-article]');if(a){const post=articles.find(x=>x.id===a.dataset.article);if(!post)return;modal(`<span class="cm-kicker">${escapeHTML(post.category)} / ${dateLabel(post.created_at)}</span><h2>${escapeHTML(post.title)}</h2>${safeImage(post.image_url)?`<img class="cm-modal-image" src="${escapeHTML(post.image_url)}" alt="">`:''}<p class="cm-article-text">${escapeHTML(post.body)}</p>`);return;}
  const b=e.target.closest('[data-vote]');if(!b)return;
  if(!user){showAuth();return;}
  const {error}=await supabase.from('sf_poll_votes').insert({poll_id:b.dataset.poll,option_id:b.dataset.vote,user_id:user.id});
  if(error)notify(root,error.message);else await load();
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
 query('.cm-account').onclick=async()=>{if(user){await supabase.auth.signOut();await checkAccount();await load();notify(root,'Signed out.')}else showAuth()};
 query('.cm-admin').onclick=()=>showAdmin();
 function showAdmin(){
  if(!isAdmin)return;
  modal(`<span class="cm-kicker">SKYFRONT / ADMIN STUDIO</span><h2>COMMUNITY CONTROL</h2><div class="cm-admin-tabs"><button data-admin="news">ANNOUNCEMENTS</button><button data-admin="polls">POLLS</button></div><div class="cm-admin-area"></div>`);
  const area=modalHost.querySelector('.cm-admin-area');
  function adminSection(type){
   if(type==='news'){
    area.innerHTML=`<form class="cm-editor"><h3>${editing?'EDIT':'NEW'} ANNOUNCEMENT</h3><label>Title<input name="title" maxlength="160" required value="${escapeHTML(editing?.title||'')}"></label><label>Category<select name="category">${['News','Updates','Events','Patch Notes'].map(c=>`<option ${editing?.category===c?'selected':''}>${c}</option>`).join('')}</select></label><label>Image URL (optional)<input name="image_url" type="url" placeholder="https://" value="${escapeHTML(editing?.image_url||'')}"></label><label>Full announcement<textarea name="body" rows="6" required>${escapeHTML(editing?.body||'')}</textarea></label><label class="cm-check"><input type="checkbox" name="pinned" ${editing?.pinned?'checked':''}> Pin to top</label><label class="cm-check"><input type="checkbox" name="published" ${!editing||editing.published?'checked':''}> Published</label><button type="submit">SAVE ANNOUNCEMENT</button><p class="cm-form-message"></p></form><div class="cm-admin-list">${articles.map(a=>`<div><span>${escapeHTML(a.title)}</span><button data-edit="${a.id}">EDIT</button><button data-delete="${a.id}">DELETE</button></div>`).join('')}</div>`;
    const form=area.querySelector('form');
    form.onsubmit=async e=>{e.preventDefault();const f=new FormData(form),payload={title:String(f.get('title')).trim(),body:String(f.get('body')).trim(),category:f.get('category'),image_url:String(f.get('image_url')).trim()||null,pinned:f.has('pinned'),published:f.has('published'),updated_at:new Date().toISOString()};const r=editing?await supabase.from('sf_announcements').update(payload).eq('id',editing.id):await supabase.from('sf_announcements').insert(payload);if(r.error)form.querySelector('.cm-form-message').textContent=r.error.message;else{editing=null;await load();adminSection('news')}};
    area.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editing=articles.find(a=>a.id===b.dataset.edit);adminSection('news')});
    area.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this announcement?'))return;const r=await supabase.from('sf_announcements').delete().eq('id',b.dataset.delete);if(r.error)alert(r.error.message);else{await load();adminSection('news')}});
   }else{
    area.innerHTML=`<form class="cm-editor"><h3>CREATE POLL</h3><label>Question<input name="question" required maxlength="240"></label><label>Options (one per line, 2–8)<textarea name="options" rows="6" placeholder="Option A&#10;Option B" required></textarea></label><button type="submit">PUBLISH POLL</button><p class="cm-form-message"></p></form><div class="cm-admin-list">${polls.map(p=>`<div><span>${escapeHTML(p.question)}</span><button data-toggle="${p.id}">${p.active?'CLOSE':'REOPEN'}</button><button data-delete-poll="${p.id}">DELETE</button></div>`).join('')}</div>`;
    area.querySelector('form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form),opts=String(f.get('options')).split('\n').map(x=>x.trim()).filter(Boolean);if(opts.length<2||opts.length>8){form.querySelector('.cm-form-message').textContent='Enter 2–8 options.';return;}const r=await supabase.from('sf_polls').insert({question:String(f.get('question')).trim()}).select('id').single();if(r.error){form.querySelector('.cm-form-message').textContent=r.error.message;return;}const s=await supabase.from('sf_poll_options').insert(opts.map((label,position)=>({poll_id:r.data.id,label,position})));if(s.error){await supabase.from('sf_polls').delete().eq('id',r.data.id);form.querySelector('.cm-form-message').textContent=s.error.message;return;}await load();adminSection('polls')};
    area.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{const p=polls.find(x=>x.id===b.dataset.toggle);const r=await supabase.from('sf_polls').update({active:!p.active}).eq('id',p.id);if(r.error)alert(r.error.message);else{await load();adminSection('polls')}});
    area.querySelectorAll('[data-delete-poll]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this poll and its votes?'))return;const r=await supabase.from('sf_polls').delete().eq('id',b.dataset.deletePoll);if(r.error)alert(r.error.message);else{await load();adminSection('polls')}});
   }
  }
  modalHost.querySelectorAll('[data-admin]').forEach(b=>b.onclick=()=>{editing=null;adminSection(b.dataset.admin)});
  adminSection('news');
 }
 const refresh=()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(!destroyed)load()},350)};
 channel=supabase.channel('skyfront-community-live').on('postgres_changes',{event:'*',schema:'public',table:'sf_announcements'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'sf_polls'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'sf_poll_options'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'sf_poll_votes'},refresh).subscribe();
 const authListener=supabase.auth.onAuthStateChange(()=>{if(!destroyed)setTimeout(async()=>{if(!destroyed){await checkAccount();await load()}},0)});
 checkAccount().then(load);
 return ()=>{destroyed=true;clearTimeout(refreshTimer);supabase.removeChannel(channel);authListener.data.subscription.unsubscribe();modalHost.replaceChildren()};
}
