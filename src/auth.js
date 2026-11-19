import { supabase } from './community.js';
import './auth.css';

const randomUsername = () => 'Sky' + Array.from(crypto.getRandomValues(new Uint8Array(7)), byte => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[byte % 32]).join('');
const escapeText = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function installAuthGate() {
  const gate=document.createElement('div');
  gate.id='sf-auth-gate';
  gate.className='sf-auth-gate';
  gate.setAttribute('aria-label','SKYFRONT account sign in');
  gate.innerHTML=`<div class="sf-auth-scene"><div class="sf-auth-glow"></div><div class="sf-auth-orbit"></div></div><section class="sf-auth-card" aria-labelledby="sf-auth-title"><div class="sf-auth-mark">S</div><span class="sf-auth-eyebrow">SKYFRONT / ALPHA V1.0.0</span><h1 id="sf-auth-title">WELCOME TO<br><em>SKYFRONT</em></h1><p class="sf-auth-intro">Sign in to continue your journey. Your account stays signed in on this device.</p><div class="sf-auth-switch"><button type="button" data-mode="login" class="active">SIGN IN</button><button type="button" data-mode="register">CREATE ACCOUNT</button></div><form class="sf-auth-form"><label>EMAIL ADDRESS<input type="email" name="email" autocomplete="email" placeholder="you@example.com" required></label><label>PASSWORD<input type="password" name="password" autocomplete="current-password" minlength="6" required></label><button class="sf-auth-submit" type="submit">ENTER SKYFRONT <span>→</span></button><p class="sf-auth-feedback" role="status" aria-live="polite"></p></form><button type="button" class="sf-auth-reset">Forgot password?</button><div class="sf-auth-bottom">YOUR GAME. YOUR JOURNEY.</div></section>`;
  document.body.appendChild(gate);
  const form=gate.querySelector('form');
  const feedback=gate.querySelector('.sf-auth-feedback');
  const submit=gate.querySelector('.sf-auth-submit');
  const password=form.elements.password;
  let mode='login',requestPending=false,authReady=false;
  function message(text,isError=false){feedback.textContent=text;feedback.classList.toggle('error',isError)}
  function setMode(next){
    mode=next;
    gate.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    password.autocomplete=mode==='register'?'new-password':'current-password';
    submit.innerHTML=mode==='register'?'CREATE ACCOUNT <span>→</span>':'ENTER SKYFRONT <span>→</span>';
    gate.querySelector('.sf-auth-reset').hidden=mode==='register';
    message('');
  }
  function showGate(show){
    gate.classList.toggle('is-hidden',!show);
    gate.setAttribute('aria-hidden',String(!show));
    if('inert' in gate)gate.inert=!show;
    document.body.classList.toggle('sf-login-required',show);
    const shell=document.querySelector('.shell');
    if(shell){shell.inert=show;shell.setAttribute('aria-hidden',String(show));}
    if(show)gate.querySelector('input[name=email]').focus({preventScroll:true});
  }
  gate.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>setMode(button.dataset.mode));
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(requestPending)return;
    const email=form.elements.email.value.trim(),pass=password.value;
    requestPending=true;submit.disabled=true;message(mode==='register'?'Creating your account…':'Signing in…');
    try {
      const result=mode==='register'
        ?await supabase.auth.signUp({email,password:pass,options:{data:{username:randomUsername()}}})
        :await supabase.auth.signInWithPassword({email,password:pass});
      if(result.error){message(result.error.message,true);return;}
      if(mode==='register'&&!result.data.session){
        message('Check your email to verify your account, then sign in.');
        setMode('login');
        message('Account created. Verify your email, then sign in.');
      } else {
        password.value='';
        showGate(false);
      }
    }catch(error){message(error?.message||'Unable to connect. Please try again.',true)}
    finally{requestPending=false;submit.disabled=false;}
  });
  gate.querySelector('.sf-auth-reset').onclick=async()=>{
    const email=form.elements.email.value.trim();
    if(!email){message('Enter your email address first.',true);return;}
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    message(error?error.message:'If this account exists, a password reset email has been sent.',!!error);
  };
  // Each tab has its own Supabase session in sessionStorage.
  // Validate the restored session before revealing the game.
  const listener=supabase.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT'){showGate(true);setMode('login');return;}
    if(authReady&&(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')&&session?.user){showGate(false);}
  });
  (async()=>{
    try{
      const {data,error}=await supabase.auth.getUser();
      authReady=true;
      showGate(!!error||!data.user);
    }catch{authReady=true;showGate(true);message('Could not verify your session. Please sign in.',true)}
  })();
  return ()=>{listener.data.subscription.unsubscribe();gate.remove();document.body.classList.remove('sf-login-required');const shell=document.querySelector('.shell');if(shell){shell.inert=false;shell.removeAttribute('aria-hidden')}};
}
