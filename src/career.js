import './career.css';

const FLAGS = [
 ['NL','🇳🇱','Netherlands'],['BE','🇧🇪','Belgium'],['DE','🇩🇪','Germany'],['FR','🇫🇷','France'],
 ['GB','🇬🇧','United Kingdom'],['US','🇺🇸','United States'],['CA','🇨🇦','Canada'],['ES','🇪🇸','Spain'],
 ['IT','🇮🇹','Italy'],['PT','🇵🇹','Portugal'],['PL','🇵🇱','Poland'],['SE','🇸🇪','Sweden'],
 ['NO','🇳🇴','Norway'],['DK','🇩🇰','Denmark'],['FI','🇫🇮','Finland'],['TR','🇹🇷','Türkiye'],
 ['BR','🇧🇷','Brazil'],['JP','🇯🇵','Japan'],['KR','🇰🇷','South Korea'],['AU','🇦🇺','Australia'],
 ['IN','🇮🇳','India'],['MX','🇲🇽','Mexico'],['UA','🇺🇦','Ukraine'],['CH','🇨🇭','Switzerland']
];
const MODES = [['br-solo','Battle Royale · Solo'],['br-duo','Battle Royale · Duo'],['br-squad','Battle Royale · Squad']];
const WINDOWS = [['all','ALL TIME'],['7d','LAST 7 DAYS'],['1d','LAST 24 HOURS']];
const safeNumber = v => Number.isFinite(Number(v)) ? Math.max(0,Number(v)) : 0;
const fmt = n => Math.round(n).toLocaleString('en-US');
const escapeHtml = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function history(){
  try {
    const data=JSON.parse(localStorage.getItem('sf-match-history')||'[]');
    return Array.isArray(data)?data.filter(m=>m&&typeof m==='object'):[];
  }catch{return [];}
}
function aggregate(mode,range){
  const cutoff=range==='all'?0:Date.now()-(range==='7d'?7:1)*86400000;
  const matches=history().filter(m=>m.mode===mode && Number(m.timestamp||m.date||0)>=cutoff);
  const totals=matches.reduce((a,m)=>{
    a.kills+=safeNumber(m.kills);a.assists+=safeNumber(m.assists);
    a.damage+=safeNumber(m.damage);a.wins+=m.win===true?1:0;
    a.placements+=safeNumber(m.placement);
    return a;
  },{kills:0,assists:0,damage:0,wins:0,placements:0});
  const played=matches.length;
  const deaths=matches.filter(m=>m.died===true).length;
  return {...totals,played,deaths,winRate:played?totals.wins/played*100:0,kd:deaths?totals.kills/deaths:totals.kills,avgKills:played?totals.kills/played:0,avgPlace:played?totals.placements/played:0};
}
export function mountCareer(){
 const root=document.querySelector('#career-root');
 if(!root)return ()=>{};
 let mode='br-solo',range='all',flag=localStorage.getItem('sf-career-flag')||'NL';
 if(!FLAGS.some(f=>f[0]===flag))flag='NL';
 let modal=false,search='';
 const logo=import.meta.env.BASE_URL+'images/skyfront-logo.png';
 const name=localStorage.getItem('sf-player-name')||'PLAYER ONE';
 const flagItem=()=>FLAGS.find(f=>f[0]===flag)||FLAGS[0];
 const stat=(label,value,icon)=>`<div class="career-stat"><div class="career-stat-label"><span>${icon}</span>${label}</div><strong>${value}</strong></div>`;
 const render=()=>{
  const s=aggregate(mode,range);
  const f=flagItem();
  root.innerHTML=`<section class="career-page">
    <div class="career-head"><div><div class="career-kicker">SKYFRONT / PLAYER PROFILE</div><h1>YOUR <span>CAREER.</span></h1><p>Your journey. Your records. Your story.</p></div><span class="career-season">✦ SEASON ONE</span></div>
    <div class="career-layout">
      <aside class="career-profile">
        <div class="career-profile-top"><div class="career-profile-avatar"><img src="${logo}" alt=""></div><span class="career-level">LVL 1</span></div>
        <div class="career-profile-label">PLAYER PROFILE</div>
        <h2>${escapeHtml(name)}</h2>
        <button class="career-flag" type="button" data-action="flag" aria-label="Change country flag"><span class="career-flag-emoji">${f[1]}</span><span><strong>${f[2]}</strong><small>PLAYER FLAG</small></span><span class="career-pencil">✎</span></button>
        <div class="career-profile-divider"></div>
        <div class="career-profile-caption">PROFILE OVERVIEW</div>
        <div class="career-profile-row"><span>Season</span><strong>01</strong></div>
        <div class="career-profile-row"><span>Account level</span><strong>1</strong></div>
        <div class="career-profile-row"><span>Career status</span><strong>PRE-ALPHA</strong></div>
        <div class="career-profile-note">Your chosen flag is saved on this device.</div>
      </aside>
      <div class="career-content">
        <div class="career-controls"><label>GAME MODE<select id="career-mode">${MODES.map(m=>`<option value="${m[0]}" ${mode===m[0]?'selected':''}>${m[1]}</option>`).join('')}</select></label>
        <label>TIME PERIOD<select id="career-range">${WINDOWS.map(w=>`<option value="${w[0]}" ${range===w[0]?'selected':''}>${w[1]}</option>`).join('')}</select></label></div>
        <div class="career-section-title"><h2>OVERVIEW</h2><span>${WINDOWS.find(w=>w[0]===range)[1]} · ${MODES.find(m=>m[0]===mode)[1].toUpperCase()}</span></div>
        <div class="career-stats">
          ${stat('VICTORY ROYALES',fmt(s.wins),'♛')}
          ${stat('ELIMINATIONS',fmt(s.kills),'✦')}
          ${stat('MATCHES PLAYED',fmt(s.played),'▣')}
          ${stat('WIN RATE',s.winRate.toFixed(1)+'%','◈')}
          ${stat('K/D RATIO',s.kd.toFixed(2),'⌁')}
          ${stat('AVERAGE ELIMS',s.avgKills.toFixed(2),'◎')}
          ${stat('ASSISTS',fmt(s.assists),'✚')}
          ${stat('TOTAL DAMAGE',fmt(s.damage),'⚡')}
        </div>
        <div class="career-lower"><div class="career-insight"><div><small>PERFORMANCE</small><h3>VICTORY RATE</h3></div><div class="career-progress"><div style="width:${Math.min(100,s.winRate)}%"></div></div><strong>${s.winRate.toFixed(1)}%</strong></div><div class="career-history"><small>RECENT MATCHES</small><h3>${s.played?'MATCH DATA RECORDED':'NO MATCHES YET'}</h3><p>${s.played?'Your statistics reflect saved match results for this mode and time period.':'Once matches are implemented and recorded, your results will appear here automatically.'}</p></div></div>
        <p class="career-data-note">Statistics use recorded match history only. No simulated wins or kills.</p>
      </div>
    </div>
    ${modal?`<div class="career-modal-wrap"><button class="career-modal-backdrop" data-action="close" aria-label="Close flag selection"></button><section class="career-modal" role="dialog" aria-modal="true" aria-label="Choose your flag"><div class="career-modal-heading"><div><small>PLAYER CUSTOMIZATION</small><h2>CHOOSE YOUR FLAG</h2></div><button data-action="close" aria-label="Close" class="career-close">×</button></div><input id="career-flag-search" placeholder="Search countries..." value="${escapeHtml(search)}" aria-label="Search countries"><div class="career-flag-grid">${FLAGS.filter(f=>f[2].toLowerCase().includes(search.toLowerCase())||f[0].toLowerCase().includes(search.toLowerCase())).map(f=>`<button class="${flag===f[0]?'chosen':''}" data-flag="${f[0]}" type="button"><span>${f[1]}</span><small>${f[2]}</small></button>`).join('')||'<p>No countries found.</p>'}</div><p>Your selection saves automatically.</p></section></div>`:''}
  </section>`;
  root.querySelector('#career-mode').addEventListener('change',e=>{mode=e.target.value;render()});
  root.querySelector('#career-range').addEventListener('change',e=>{range=e.target.value;render()});
  root.querySelectorAll('[data-action="flag"]').forEach(b=>b.addEventListener('click',()=>{modal=true;render();root.querySelector('#career-flag-search')?.focus()}));
  root.querySelectorAll('[data-action="close"]').forEach(b=>b.addEventListener('click',()=>{modal=false;render()}));
  root.querySelectorAll('[data-flag]').forEach(b=>b.addEventListener('click',()=>{flag=b.dataset.flag;localStorage.setItem('sf-career-flag',flag);modal=false;render()}));
  root.querySelector('#career-flag-search')?.addEventListener('input',e=>{const pos=e.target.selectionStart;search=e.target.value;render();const input=root.querySelector('#career-flag-search');input.focus();input.setSelectionRange(pos,pos)});
 };
 const key=e=>{if(e.key==='Escape'&&modal){modal=false;render()}};
 document.addEventListener('keydown',key);
 render();
 return ()=>{document.removeEventListener('keydown',key)};
}

// Future gameplay integration: store each completed match as
// {mode:'br-solo'|'br-duo'|'br-squad',timestamp:Date.now(),kills:0,assists:0,damage:0,win:false,died:true,placement:1}
// in the 'sf-match-history' localStorage array.
