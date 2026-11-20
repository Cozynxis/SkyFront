import * as THREE from 'three';
import './inventory.css';

const ICONS={
 pickaxe:'⛏',rifle:'⌁',potion:'⬡'
};
const STARTER={id:'training-rifle',name:'TRAINING RIFLE',kind:'rifle',rarity:'rare',damage:28,fireRate:5.5,magazine:30,description:'A practice weapon for Spawn Island. Combat is not implemented yet.'};
const SECOND={id:'burst-blaster',name:'BURST BLASTER',kind:'rifle',rarity:'epic',damage:34,fireRate:3.2,magazine:18,description:'A second test weapon for swapping inventory slots.'};
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export function mountInventory({root,scene,position,camera,renderer,onChange=()=>{}}){
 const slots=[{id:'pickaxe',name:'PICKAXE',kind:'pickaxe',rarity:'common',damage:20,description:'Your harvesting tool.'},null,null,null,null,null];
 let selected=0,opened=false;
 const pickups=[];
 function spawnWeapon(item,x,z){
  const mesh=new THREE.Group();
  const color=item.rarity==='epic'?0xa63cf0:0x4287de;
  const body=new THREE.Mesh(new THREE.BoxGeometry(.75,.24,.17),new THREE.MeshStandardMaterial({color,metalness:.45,roughness:.3}));
  const grip=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.55,10),new THREE.MeshStandardMaterial({color:0x333d53,roughness:.8}));
  grip.position.set(-.12,-.3,0);grip.rotation.z=.3;
  mesh.add(body,grip);
  const glow=new THREE.PointLight(item.rarity==='epic'?0xb65aff:0x54baff,1.8,5);
  glow.position.y=.5;mesh.add(glow);
  mesh.position.set(x,1.3,z);
  scene.add(mesh);pickups.push({item:{...item},mesh});
 }
 spawnWeapon(STARTER,3,7);
 spawnWeapon(SECOND,-3,7);
 const ui=document.createElement('div');ui.className='sf-inventory-ui';ui.innerHTML=`
 <div class="sf-pickup-hint" hidden><kbd>E</kbd><div><strong>PICK UP</strong><span>TRAINING RIFLE · RARE</span></div></div>
 <div class="sf-inventory-backdrop" hidden></div>
 <section class="sf-inventory-panel" role="dialog" aria-label="Inventory" aria-modal="true" hidden>
  <header><div><small>SKYFRONT / EQUIPMENT</small><h2>INVENTORY</h2></div><button type="button" data-close aria-label="Close inventory">✕</button></header>
  <div class="sf-inventory-body">
   <aside class="sf-inventory-detail"><div class="sf-inventory-rarity">COMMON · EQUIPMENT</div><h3 class="sf-inventory-name">PICKAXE</h3><p class="sf-inventory-description"></p><div class="sf-inventory-stats"></div><div class="sf-inventory-art" aria-hidden="true">⛏</div></aside>
   <div class="sf-inventory-right">
    <div class="sf-inventory-section sf-inventory-equipment"><h3>EQUIPMENT <span class="sf-inventory-slot-count">6 SLOTS</span></h3><div class="sf-inventory-grid"></div><p>THE PICKAXE IS LOCKED · DRAG WEAPONS TO REARRANGE</p></div>
   </div>
  </div>
  <footer><button type="button" data-drop>DROP ITEM</button><span class="sf-inventory-drop-note"></span><span><kbd>E</kbd> CLOSE</span><span><kbd>ESC</kbd> BACK</span></footer>
 </section>`;
 root.append(ui);
 const panel=ui.querySelector('.sf-inventory-panel'),backdrop=ui.querySelector('.sf-inventory-backdrop'),grid=ui.querySelector('.sf-inventory-grid'),detail=ui.querySelector('.sf-inventory-detail'),hint=ui.querySelector('.sf-pickup-hint');
 const isPaused=()=>Boolean(document.querySelector('.sf-account-layer.open'));
 const isEditing=()=>['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
 function itemIcon(item){return item?(ICONS[item.kind]||'✦'):'+'}
 function statsHTML(item){return item?'<div><span>DAMAGE</span><b>'+escapeHTML(item.damage??'—')+'</b></div><div><span>FIRE RATE</span><b>'+escapeHTML(item.fireRate??'—')+'</b></div><div><span>MAGAZINE</span><b>'+escapeHTML(item.magazine??'—')+'</b></div>':''}
 function render(){
  grid.replaceChildren();
  slots.forEach((item,i)=>{
   const b=document.createElement('button');b.type='button';b.draggable=!!item&&i!==0;b.dataset.index=i;b.className='sf-inventory-cell'+(selected===i?' selected':'')+(item?' has-item':'')+(i===0?' is-locked':'');
   b.dataset.rarity=item?.rarity||'empty';
   b.innerHTML='<span class="sf-inventory-number">'+(i+1)+'</span>'+(i===0?'<span class="sf-inventory-lock" aria-label="Locked">🔒</span>':'')<span class="sf-inventory-item-icon">'+(itemIcon(item)||'+')+'</span><strong>'+escapeHTML(item?.name||'EMPTY')+'</strong>';
   b.onclick=()=>{if(swapFrom!==null&&swapFrom!==i&&swapFrom!==0&&i!==0){swap(swapFrom,i)}else{selected=i;swapFrom=i===0?null:i;render()}};
   b.ondragstart=e=>{if(i===0){e.preventDefault();return}e.dataTransfer.setData('text/plain',String(i));e.dataTransfer.effectAllowed='move'};
   b.ondragover=e=>{e.preventDefault()};
   b.ondrop=e=>{e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(from)&&from>0&&from<slots.length&&i>0)swap(from,i)};
   grid.append(b);
  });
  const item=slots[selected];detail.querySelector('.sf-inventory-art').textContent=itemIcon(item)||'+';
  detail.dataset.rarity=item?.rarity||'empty';
  detail.querySelector('.sf-inventory-rarity').textContent=item?(item.rarity.toUpperCase()+' · '+(item.kind==='rifle'?'RANGED WEAPON':'EQUIPMENT')):'EMPTY SLOT';
  detail.querySelector('.sf-inventory-name').textContent=item?.name||'NO ITEM SELECTED';
  detail.querySelector('.sf-inventory-description').textContent=item?.description||'Select an item to see its details.';
  detail.querySelector('.sf-inventory-stats').innerHTML=statsHTML(item);
  panel.querySelector('[data-drop]').disabled=!item||item.kind==='pickaxe';
  panel.querySelector('.sf-inventory-drop-note').textContent=item?.kind==='pickaxe'?'Pickaxe cannot be dropped':item?'Drop this item on Spawn Island':'No item in this slot';
  onChange(slots.map(x=>x?{...x}:null),selected);
 }
 let swapFrom=null;
 function swap(a,b){if(a===b||a===0||b===0)return;[slots[a],slots[b]]=[slots[b],slots[a]];selected=b;swapFrom=null;render()}
 function open(){if(opened||isPaused())return;opened=true;swapFrom=null;document.exitPointerLock?.();panel.hidden=false;backdrop.hidden=false;ui.classList.add('is-open');render()}
 function close(){if(!opened)return;opened=false;panel.hidden=true;backdrop.hidden=true;ui.classList.remove('is-open');swapFrom=null}
 function toggle(){opened?close():open()}
 function pickup(){
  const found=pickups.filter(p=>p.mesh.parent).map(p=>({p,d:Math.hypot(position.x-p.mesh.position.x,position.z-p.mesh.position.z)})).filter(x=>x.d<3.2).sort((a,b)=>a.d-b.d)[0]?.p;
  if(!found)return false;
  const free=slots.findIndex((s,i)=>i>0&&!s);
  if(free<0){hint.querySelector('strong').textContent='INVENTORY FULL';return false}
  slots[free]={...found.item};scene.remove(found.mesh);selected=free;render();hint.hidden=true;return true;
 }
 function drop(){
  const item=slots[selected];if(!item||item.kind==='pickaxe')return;
  slots[selected]=null;
  spawnWeapon(item,position.x-Math.sin(camera.rotation.y)*2,position.z-Math.cos(camera.rotation.y)*2);render();
 }
 const down=e=>{
  if(isEditing()||isPaused()||e.ctrlKey||e.altKey||e.metaKey)return;
  if(e.code==='KeyI'||e.code==='Tab'){e.preventDefault();if(!e.repeat)toggle();return}
  if(e.code==='KeyE'&&!e.repeat){e.preventDefault();if(opened)close();else if(!pickup())open();return}
  if(/^Digit[1-6]$/.test(e.code)&&!e.repeat){selected=Number(e.code.slice(-1))-1;swapFrom=null;render()}
 };
 window.addEventListener('keydown',down);
 panel.querySelector('[data-close]').onclick=close;backdrop.onclick=close;panel.querySelector('[data-drop]').onclick=drop;
 render();
 return {
  get isOpen(){return opened},
  close,
  update(t){
   let nearest=null;
   for(const p of pickups){if(!p.mesh.parent)continue;p.mesh.rotation.y+=t*.7;p.mesh.position.y=1.3+Math.sin(performance.now()*.003)*.14;if(Math.hypot(position.x-p.mesh.position.x,position.z-p.mesh.position.z)<3.2&&(!nearest||Math.hypot(position.x-p.mesh.position.x,position.z-p.mesh.position.z)<Math.hypot(position.x-nearest.mesh.position.x,position.z-nearest.mesh.position.z)))nearest=p}
   hint.hidden=opened||!nearest||isPaused();
   if(nearest){hint.querySelector('strong').textContent='PICK UP';hint.querySelector('span').textContent=nearest.item.name+' · '+nearest.item.rarity.toUpperCase()}
  },
  dispose(){close();window.removeEventListener('keydown',down);ui.remove();for(const p of pickups){scene.remove(p.mesh);p.mesh.traverse(o=>{o.geometry?.dispose?.();if(o.material)o.material.dispose?.()})}}
 };
}
