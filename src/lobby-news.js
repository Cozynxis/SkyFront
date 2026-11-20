import {supabase} from './community.js';
import {openSupportAdmin,closeSupport} from './support.js';
import './lobby-news.css';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:''}catch{return ''}};
const stamp=v=>new Date(v).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
let entries=[],seconds=8,position=0,rotation=null,refresh=null,modal=null;
let adminOpen=false,editing=null,adminChecked=false,adminAllowed=false;
let adminHost=null;
let adminPage='news',adminDataSignature='';
const fetchNews=async()=>{
 const [a,c]=await Promise.all([
  supabase.from('sf_lobby_announcements').select('id,title,body,image_url,category,published,pinned,lobby_enabled,lobby_order,created_at').order('lobby_order',{ascending:true}).order('created_at',{ascending:false}),
  supabase.from('sf_lobby_news_config').select('rotation_seconds').eq('id',1).maybeSingle()
 ]);
 if(a.error){console.warn('Lobby news:',a.error.message);return}
 entries=a.data||[];seconds=c.data?.rotation_seconds||8;
 renderLobby();schedule();
 if(adminOpen&&adminPage==='news'){
  const signature=JSON.stringify([entries,seconds]);
  if(signature!==adminDataSignature){adminDataSignature=signature;renderAdmin()}
 }
};
const active=()=>entries.filter(e=>e.published&&e.lobby_enabled);
function renderLobby(){
 const card=document.querySelector('#sf-lobby-news');
 if(!card)return;
 const list=active();
 if(!list.length){card.innerHTML='<div class="side-label">LATEST UPDATE <span>00 / 00</span></div><div class="sf-news-empty">SKYFRONT <strong>THE BEGINNING.</strong><small>More updates coming soon.</small></div>';return}
 position%=list.length;
 const item=list[position],url=safeUrl(item.image_url);
 card.innerHTML='<div class="side-label">LATEST UPDATE <span>'+String(position+1).padStart(2,'0')+' / '+String(list.length).padStart(2,'0')+'</span></div><button class="sf-news-tile" type="button" data-news-open="'+esc(item.id)+'"><div class="sf-news-tile-art">'+(url?'<img src="'+esc(url)+'" alt="" loading="lazy">':'<div class="sf-news-default">S</div>')+'</div><div class="sf-news-caption"><span>'+esc(item.title)+'</span><b>↗</b></div></button><div class="sf-news-controls"><button type="button" data-news-prev aria-label="Previous news">‹</button><div class="sf-news-progress"><i style="animation-duration:'+seconds+'s"></i></div><button type="button" data-news-next aria-label="Next news">›</button></div>';
 card.querySelector('[data-news-open]').onclick=()=>openArticle(item);
 card.querySelector('[data-news-prev]').onclick=()=>advance(-1);
 card.querySelector('[data-news-next]').onclick=()=>advance(1);
}
function advance(step=1){const n=active().length;if(n<2)return;position=(position+step+n)%n;renderLobby();schedule()}
function schedule(){clearInterval(rotation);if(active().length>1&&!document.hidden)rotation=setInterval(()=>advance(1),seconds*1000)}
function showModal(html){
 if(!modal){modal=document.createElement('div');modal.className='sf-news-modal-host';document.body.append(modal)}
 modal.innerHTML='<div class="sf-news-modal-shade"><section class="sf-news-modal" role="dialog" aria-modal="true">'+html+'</section></div>';
 modal.querySelector('[data-news-close]')?.addEventListener('click',closeModal);
 modal.querySelector('.sf-news-modal-shade').onclick=e=>{if(e.target===e.currentTarget)closeModal()};
}
function closeModal(){if(modal)modal.replaceChildren()}
function openArticle(item){
 const url=safeUrl(item.image_url);
 showModal('<header><span>SKYFRONT / '+esc(item.category||'NEWS')+'</span><button type="button" data-news-close aria-label="Close">×</button></header>'+(url?'<div class="sf-news-full-art"><img src="'+esc(url)+'" alt=""></div>':'')+'<div class="sf-news-full-copy"><small>'+stamp(item.created_at)+'</small><h2>'+esc(item.title)+'</h2><p>'+esc(item.body).replace(/\n/g,'<br>')+'</p></div>');
}
async function verifyAdmin(){
 const {data:{user}}=await supabase.auth.getUser();
 if(!user){adminAllowed=false;adminChecked=true;return false}
 const {data,error}=await supabase.from('sf_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 adminAllowed=!error&&!!data;adminChecked=true;return adminAllowed;
}
export async function canManageLobbyNews(){return verifyAdmin()}
function renderAdmin(){
 if(!adminHost||!adminOpen)return;
 adminDataSignature=JSON.stringify([entries,seconds]);
 adminHost.innerHTML='<div class="sf-news-admin-shade"><section class="sf-news-admin" role="dialog" aria-modal="true" aria-label="SKYFRONT Admin Panel"><header><div><small>SKYFRONT / ADMINISTRATION</small><h2>ADMIN PANEL</h2><p>Manage news and player support</p></div><button type="button" data-admin-close aria-label="Close">×</button></header><div class="sf-news-admin-main"><nav class="sf-news-admin-pages" aria-label="Admin sections"><button type="button" data-admin-page="news" class="is-active">◈ NEWS & ANNOUNCEMENTS</button><button type="button" data-admin-page="support">✉ SUPPORT TICKETS</button></nav><div data-admin-news><div class="sf-news-admin-toolbar"><button type="button" data-open-support style="background:#ffdf37;color:#16244b;border:0;border-radius:8px;padding:12px 16px;font-weight:900;cursor:pointer">✉ SUPPORT TICKETS</button><label>NEWS ROTATION <select data-news-seconds>'+[3,5,8,10,15,20,30,45,60].map(v=>'<option value="'+v+'" '+(v===seconds?'selected':'')+'>'+v+' SECONDS</option>').join('')+'</select></label><button type="button" data-news-create>+ NEW ARTICLE</button></div><div class="sf-news-admin-list">'+(entries.length?entries.map((e,i)=>'<article class="sf-news-admin-row"><div class="sf-news-admin-thumb">'+(safeUrl(e.image_url)?'<img src="'+esc(safeUrl(e.image_url))+'" alt="">':'S')+'</div><div class="sf-news-admin-info"><strong>'+esc(e.title)+'</strong><small>'+esc(e.category||'NEWS')+' · '+(e.published?'PUBLISHED':'DRAFT')+' · '+(e.lobby_enabled?'IN LOBBY':'HIDDEN FROM LOBBY')+'</small></div><div class="sf-news-admin-actions"><button type="button" data-move="-1" data-id="'+esc(e.id)+'" '+(i===0?'disabled':'')+' title="Move up">↑</button><button type="button" data-move="1" data-id="'+esc(e.id)+'" '+(i===entries.length-1?'disabled':'')+' title="Move down">↓</button><button type="button" data-edit="'+esc(e.id)+'">EDIT</button><button type="button" data-delete="'+esc(e.id)+'" title="Delete">×</button></div></article>').join(''):'<p class="sf-news-admin-empty">No news yet. Create your first announcement.</p>')+'</div></div><div data-admin-support hidden></div></div></section></div>';
 adminHost.querySelector('[data-admin-close]').onclick=closeAdmin;
 const switchAdminPage=async page=>{
  if(!adminOpen||!adminHost)return;
  if(page===adminPage)return;
  adminPage=page;
  const news=adminHost.querySelector('[data-admin-news]');
  const support=adminHost.querySelector('[data-admin-support]');
  if(news)news.hidden=page!=='news';
  if(support)support.hidden=page!=='support';
  adminHost.querySelectorAll('[data-admin-page]').forEach(b=>{
   const active=b.dataset.adminPage===page;
   b.classList.toggle('is-active',active);
   b.setAttribute('aria-selected',String(active));
  });
  if(page==='support')await openSupportAdmin(support);
  else closeSupport();
 };
 adminHost.querySelectorAll('[data-admin-page]').forEach(b=>b.onclick=()=>{void switchAdminPage(b.dataset.adminPage)});
 adminHost.querySelector('[data-open-support]').onclick=()=>{void switchAdminPage('support')};
 adminHost.querySelector('[data-news-create]').onclick=()=>editArticle(null);
 adminHost.querySelector('[data-news-seconds]').onchange=async e=>{
  const value=Number(e.target.value);
  const {error}=await supabase.from('sf_lobby_news_config').update({rotation_seconds:value}).eq('id',1);
  if(error){alert(error.message);return}seconds=value;schedule();renderLobby();
 };
 adminHost.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editArticle(entries.find(e=>e.id===b.dataset.edit)));
 adminHost.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{
  if(!confirm('Delete this announcement permanently?'))return;
  const {error}=await supabase.from('sf_lobby_announcements').delete().eq('id',b.dataset.delete);
  if(error){alert(error.message);return}await fetchNews();
 });
 adminHost.querySelectorAll('[data-move]').forEach(b=>b.onclick=async()=>{
  const idx=entries.findIndex(e=>e.id===b.dataset.id),other=idx+Number(b.dataset.move);
  if(idx<0||other<0||other>=entries.length)return;
  const reordered=[...entries];
  [reordered[idx],reordered[other]]=[reordered[other],reordered[idx]];
  const results=await Promise.all(reordered.map((item,i)=>supabase.from('sf_lobby_announcements').update({lobby_order:(i+1)*10}).eq('id',item.id)));
  const failure=results.find(r=>r.error);
  if(failure){alert(failure.error.message);return}
  await fetchNews();
 });
}
function editArticle(item){
 editing=item?.id||null;
 const form='<header><div><small>SKYFRONT / NEWS EDITOR</small><h2>'+(item?'EDIT ARTICLE':'NEW ARTICLE')+'</h2></div><button type="button" data-news-close aria-label="Close">×</button></header><form class="sf-news-form"><label>TITLE<input name="title" maxlength="100" required value="'+esc(item?.title||'')+'"></label><label>CATEGORY<input name="category" maxlength="40" value="'+esc(item?.category||'NEWS')+'"></label><label>FULL ARTICLE<textarea name="body" rows="6" required>'+esc(item?.body||'')+'</textarea></label><label>IMAGE URL (HTTPS)<input name="image_url" type="url" placeholder="https://..." value="'+esc(item?.image_url||'')+'"></label><div class="sf-news-form-preview"></div><div class="sf-news-form-flags"><label><input type="checkbox" name="published" '+(item?.published!==false?'checked':'')+'> PUBLISHED</label><label><input type="checkbox" name="lobby_enabled" '+(item?.lobby_enabled!==false?'checked':'')+'> SHOW IN LOBBY</label><label><input type="checkbox" name="pinned" '+(item?.pinned?'checked':'')+'> PIN IN COMMUNITY</label></div><p role="status" class="sf-news-form-status"></p><button type="submit" class="sf-news-save">SAVE ARTICLE</button></form>';
 showModal(form);
 const f=modal.querySelector('form'),preview=f.querySelector('.sf-news-form-preview');
 const updatePreview=()=>{const url=safeUrl(f.elements.image_url.value);preview.innerHTML=url?'<img src="'+esc(url)+'" alt="Image preview">':'<span>No image selected — SKYFRONT logo will be shown.</span>'};
 f.elements.image_url.addEventListener('input',updatePreview);updatePreview();
 f.onsubmit=async e=>{
  e.preventDefault();const button=f.querySelector('[type=submit]');button.disabled=true;
  const values={title:f.elements.title.value.trim(),category:f.elements.category.value.trim()||'NEWS',body:f.elements.body.value.trim(),image_url:safeUrl(f.elements.image_url.value)||null,published:f.elements.published.checked,lobby_enabled:f.elements.lobby_enabled.checked,pinned:f.elements.pinned.checked};
  if(f.elements.image_url.value&&!values.image_url){f.querySelector('[role=status]').textContent='Please enter a valid HTTPS image URL.';button.disabled=false;return}
  const query=editing?supabase.from('sf_lobby_announcements').update(values).eq('id',editing):supabase.from('sf_lobby_announcements').insert({...values,lobby_order:entries.length?Math.max(...entries.map(x=>x.lobby_order))+10:10});
  const {error}=await query;
  if(error){f.querySelector('[role=status]').textContent=error.message;button.disabled=false;return}
  closeModal();await fetchNews();
 };
}
export async function openLobbyNewsAdmin(){
 if(!await verifyAdmin())return false;
 if(!adminHost){adminHost=document.createElement('div');adminHost.className='sf-news-admin-host';document.body.append(adminHost)}
 adminOpen=true;adminPage='news';adminHost.style.display='';renderAdmin();return true;
}
function closeAdmin(){adminOpen=false;adminPage='news';closeSupport();if(adminHost){adminHost.style.display='';adminHost.replaceChildren()}}
export function installLobbyNews(){
 window.addEventListener('skyfront:support-admin-closed',()=>{if(adminOpen&&adminHost&&adminPage==='support'){
  adminPage='news';
  const news=adminHost.querySelector('[data-admin-news]');if(news)news.hidden=false;
  const support=adminHost.querySelector('[data-admin-support]');if(support)support.hidden=true;
  adminHost.querySelectorAll('[data-admin-page]').forEach(b=>{const active=b.dataset.adminPage==='news';b.classList.toggle('is-active',active);b.setAttribute('aria-selected',String(active))});
 }});
 fetchNews();refresh=setInterval(fetchNews,20000);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInterval(rotation);else{fetchNews();schedule()}});
 supabase.channel('sf-lobby-news').on('postgres_changes',{event:'*',schema:'public',table:'sf_lobby_announcements'},fetchNews).on('postgres_changes',{event:'*',schema:'public',table:'sf_lobby_news_config'},fetchNews).subscribe();
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(modal?.childElementCount)closeModal();else if(adminOpen)closeAdmin()}});
}
export function refreshLobbyNews(){renderLobby()}
