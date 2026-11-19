import { supabase } from './community.js';
import { getEquippedSkinArt, getEquippedSkinName } from './locker.js';
import './account-menu.css';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export function installAccountMenu(){
 const top=document.querySelector('.top-right');
 const old=top.querySelector('.user');
 const logout=top.querySelector('#sf-signout');
 old?.remove();logout?.remove();
 const trigger=document.createElement('button');
 trigger.type='button';trigger.className='sf-profile-trigger';trigger.setAttribute('aria-label','Open account menu');
 trigger.innerHTML='<span class="sf-profile-skin"></span><span class="sf-profile-hamburger"><i></i><i></i><i></i></span>';
 top.appendChild(trigger);
 const layer=document.createElement('div');
 layer.className='sf-account-layer';layer.hidden=true;
 layer.innerHTML='<div class="sf-account-shade"></div><aside class="sf-account-drawer" role="dialog" aria-modal="true" aria-label="Account menu"><div class="sf-drawer-head"><span>SKYFRONT / MENU</span><button type="button" data-close aria-label="Close menu">×</button></div><div class="sf-drawer-profile"><div class="sf-drawer-skin"></div><div><strong class="sf-drawer-username">PLAYER</strong><small class="sf-drawer-email"></small></div></div><div class="sf-drawer-links"><button type="button" data-account>◉ <span>ACCOUNT<small>Manage your profile and security</small></span><b>›</b></button><button type="button" data-settings>⚙ <span>SETTINGS<small>Preferences and controls</small></span><b>›</b></button></div><button class="sf-drawer-logout" type="button" data-logout>↪ LOG OUT</button></aside><div class="sf-account-modal-host"></div>';
 document.body.appendChild(layer);
 const shade=layer.querySelector('.sf-account-shade'),drawer=layer.querySelector('.sf-account-drawer'),host=layer.querySelector('.sf-account-modal-host');
 let opened=false,previousFocus=null;
 const updateSkin=()=>{const art=getEquippedSkinArt();for(const el of [trigger.querySelector('.sf-profile-skin'),layer.querySelector('.sf-drawer-skin')])el.innerHTML=art;trigger.title=getEquippedSkinName()+' · Account menu'};
 const updateProfile=async()=>{
  const {data}=await supabase.auth.getUser();const user=data?.user;
  const name=user?.user_metadata?.username||localStorage.getItem('sf-player-name')||user?.email?.split('@')[0]||'PLAYER';
  layer.querySelector('.sf-drawer-username').textContent=name;
  layer.querySelector('.sf-drawer-email').textContent=user?.email||'';
  const header=document.querySelector('#sf-profile-name');
  if(header)header.innerHTML=esc(name)+'<small>LEVEL 1</small>';
 };
 const open=()=>{if(opened)return;opened=true;previousFocus=document.activeElement;layer.hidden=false;document.querySelector('.shell')?.setAttribute('inert','');requestAnimationFrame(()=>layer.classList.add('open'));updateSkin();updateProfile();layer.querySelector('[data-close]').focus()};
 const close=()=>{if(!opened)return;opened=false;layer.classList.remove('open');host.replaceChildren();document.querySelector('.shell')?.removeAttribute('inert');setTimeout(()=>{if(!opened)layer.hidden=true},280);previousFocus?.focus()};
 trigger.onclick=open;shade.onclick=close;layer.querySelector('[data-close]').onclick=close;
 document.addEventListener('keydown',e=>{if(!opened)return;if(e.key==='Escape'){e.preventDefault();if(host.childElementCount)host.replaceChildren();else close();return}if(e.key==='Tab'){const area=host.childElementCount?host:drawer;const items=[...area.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(x=>x.getClientRects().length);if(!items.length)return;const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 function dialog(title,body){
  host.innerHTML='<div class="sf-account-dialog-shade"><section class="sf-account-dialog" role="dialog" aria-modal="true"><header><div><small>SKYFRONT / ACCOUNT</small><h2>'+esc(title)+'</h2></div><button type="button" data-dismiss aria-label="Close">×</button></header>'+body+'</section></div>';
  host.querySelector('[data-dismiss]').onclick=()=>{host.replaceChildren();drawer.querySelector('[data-account]').focus()};
  host.querySelector('.sf-account-dialog-shade').onclick=e=>{if(e.target===e.currentTarget)host.replaceChildren()};
  host.querySelector('input,button')?.focus();
 }
 layer.querySelector('[data-account]').onclick=async()=>{
  const {data}=await supabase.auth.getUser(),user=data?.user;
  if(!user)return;
  const name=user.user_metadata?.username||localStorage.getItem('sf-player-name')||user.email.split('@')[0];
  dialog('MY ACCOUNT',`<div class="sf-account-fields"><form data-form="username"><label>DISPLAY NAME<input name="username" maxlength="24" minlength="3" required value="${esc(name)}" autocomplete="nickname"></label><button type="submit">SAVE USERNAME</button><p role="status"></p></form><form data-form="email"><label>EMAIL ADDRESS<input type="email" name="email" required value="${esc(user.email)}" autocomplete="email"></label><button type="submit">UPDATE EMAIL</button><p role="status"></p></form><form data-form="password"><label>NEW PASSWORD<input type="password" name="password" minlength="8" required autocomplete="new-password" placeholder="At least 8 characters"></label><label>CONFIRM NEW PASSWORD<input type="password" name="confirm" minlength="8" required autocomplete="new-password"></label><button type="submit">CHANGE PASSWORD</button><p role="status"></p></form></div>`);
  for(const form of host.querySelectorAll('form'))form.onsubmit=async e=>{
   e.preventDefault();const button=form.querySelector('button'),msg=form.querySelector('p'),type=form.dataset.form;button.disabled=true;msg.textContent='Saving…';
   try{
    let payload;
    if(type==='username'){const username=form.elements.username.value.trim();if(username.length<3||username.length>24)throw Error('Username must be 3–24 characters.');payload={data:{...user.user_metadata,username}}}
    if(type==='email'){const email=form.elements.email.value.trim();if(email===user.email){msg.textContent='Your email is unchanged.';return}payload={email}}
    if(type==='password'){const password=form.elements.password.value;if(password!==form.elements.confirm.value)throw Error('Passwords do not match.');payload={password}}
    const {error}=await supabase.auth.updateUser(payload);if(error)throw error;
    if(type==='username'){localStorage.setItem('sf-player-name',payload.data.username);window.dispatchEvent(new Event('skyfront:profile-changed'));await updateProfile()}
    if(type==='email')msg.textContent='Check your new email address for a confirmation link.';
    else {msg.textContent='Saved successfully.';if(type==='password')form.reset()}
   }catch(err){msg.textContent=err.message||'Unable to save changes.'}finally{button.disabled=false}
  };
 };
 layer.querySelector('[data-settings]').onclick=()=>dialog('SETTINGS','<div class="sf-settings-placeholder"><h3>SETTINGS COMING SOON</h3><p>Audio, graphics and gameplay preferences will appear here.</p></div>');
 layer.querySelector('[data-logout]').onclick=async e=>{const b=e.currentTarget;b.disabled=true;const {error}=await supabase.auth.signOut();b.disabled=false;if(error){alert(error.message);return}close()};
 window.addEventListener('skyfront:cosmetic-changed',updateSkin);
 window.addEventListener('storage',e=>{if(e.key==='skyfront-locker-v1')updateSkin()});
 supabase.auth.onAuthStateChange(()=>setTimeout(updateProfile,0));
 updateSkin();updateProfile();
}
