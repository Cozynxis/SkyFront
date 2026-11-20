import * as THREE from 'three';
import './inventory.css';

const ICONS={
 pickaxe:'⛏',rifle:'⌁',potion:'⬡'
};
const STARTER={id:'training-rifle',name:'TRAINING RIFLE',kind:'rifle',rarity:'rare',damage:28,fireRate:5.5,magazine:30,description:'A practice weapon for Spawn Island. Combat is not implemented yet.'};
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export function mountInventory({root,scene,position,camera,renderer,onChange=()=>{}}){
 const slots=[{id:'pickaxe',name:'PICKAXE',kind:'pickaxe',rarity:'common',damage:20,description:'Your harvesting tool.'},null,null,null,null,null];
 let selected=0,opened=false,inspecting=false,holdTimer=null,near=false;
 const pickups=[];
 const group=new THREE.Group();
 const body=new THREE.Mesh(new THREE.BoxGeometry(.75,.24,.17),new THREE.MeshStandardMaterial({color:0x4287de,metalness:.45,roughness:.3}));
 const handle=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,1.15,10),new THREE.MeshStandardMaterial({color:0x333d53,roughness:.8}));
 handle.rotation.z=.3;
 group.add(body,handle);
 const glow=new THREE.PointLight(0x54baff,1.8,5);glow.position.y=.5;group.add(glow);
 group.position.set(3,1.3,7);
 scene.add(group);
 pickups.push({item:{...STARTER},mesh:group});
 const ui=document.createElement('div');ui.className='sf-inventory-ui';ui.innerHTML=`
 <div class="sf-pickup-hint" hidden><kbd>E</kbd><div><strong>PICK UP</strong><span>TRAINING RIFLE · RARE</span></div></div>
 <div class="sf-inventory-backdrop" hidden></div>
 <section class="sf-inventory-panel" role="dialog" aria-label="Inventory" aria-modal="true" hidden>
  <header><div><small>SKYFRONT / LOADOUT</small><h2>INVENTORY</h2></div><button type="button" data-close aria-label="Close inventory">✕</button></header>
  <div class="sf-inventory-body">
   <div class="sf-inventory-left"><h3>EQUIPMENT <span>6 SLOTS</span></h3><div class="sf-inventory-grid"></div><p>CLICK TWO SLOTS TO SWAP · DRAG TO REARRANGE</p></div>
   <aside class="sf-inventory-detail"><small>SELECTED ITEM</small><div class="sf-inventory-art">⛏</div><div class="sf-inventory-rarity">COMMON</div><h3 class="sf-inventory-name">PICKAXE</h3><p class="sf-inventory-description"></p><div class="sf-inventory-stats"></div><button type="button" data-drop>DROP ITEM</button><span class="sf-inventory-drop-note">Pickaxe cannot be dropped</span></aside>
  </div>
  <footer><span><kbd>I</kbd> CLOSE</span><span><kbd>V</kbd> HOLD TO INSPECT</span><span><kbd>1–6</kbd> SELECT SLOT</span></footer>
 </section>
 <div class="sf-inventory-inspect" hidden><small>ITEM INSPECTION · HOLD V</small><div class="sf-inspect-icon"></div><h2 class="sf-inspect-name"></h2><div class="sf-inspect-info"></div><span>RELEASE V TO RETURN</span></div>`;
 root.append(ui);
 const panel=ui.querySelector('.sf-inventory-panel'),backdrop=ui.querySelector('.sf-inventory-backdrop'),grid=ui.querySelector('.sf-inventory-grid'),detail=ui.querySelector('.sf-inventory-detail'),hint=ui.querySelector('.sf-pickup-hint'),inspect=ui.querySelector('.sf-inventory-inspect');
 const isPaused=()=>Boolean(document.querySelector('.sf-account-layer.open'));
 const isEditing=()=>['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
 function itemIcon(item){return ICONS[item?.kind]||'✦'}
 function statsHTML(item){return item?'<div><span>DAMAGE</span><b>'+escapeHTML(item.damage??'—')+'</b></div><div><span>FIRE RATE</span><b>'+escapeHTML(item.fireRate??'—')+'</b></div><div><span>MAGAZINE</span><b>'+escapeHTML(item.magazine??'—')+'</b></div>':''}
 function render(){
  grid.replaceChildren();
  slots.forEach((item,i)=>{
   const b=document.createElement('button');b.type='button';b.draggable=!!item;b.dataset.index=i;b.className='sf-inventory-cell'+(selected===i?' selected':'')+(item?' has-item':'');
   b.dataset.rarity=item?.rarity||'empty';
   b.innerHTML='<span class="sf-inventory-number">'+(i+1)+'</span><span class="sf-inventory-item-icon">'+(itemIcon(item)||'+')+'</span><strong>'+escapeHTML(item?.name||'EMPTY')+'</strong>';
   b.onclick=()=>{if(swapFrom!==null&&swapFrom!==i){swap(swapFrom,i);swapFrom=null}else{selected=i;swapFrom=i;render()}};
   b.ondragstart=e=>{e.dataTransfer.setData('text/plain',String(i));e.dataTransfer.effectAllowed='move'};
   b.ondragover=e=>{e.preventDefault()};
   b.ondrop=e=>{e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(from)&&from>=0&&from<slots.length)swap(from,i)};
   grid.append(b);
  });
  const item=slots[selected];detail.querySelector('.sf-inventory-art').textContent=itemIcon(item)||'+';
  detail.querySelector('.sf-inventory-rarity').textContent=item?.rarity?.toUpperCase()||'EMPTY SLOT';
  detail.querySelector('.sf-inventory-name').textContent=item?.name||'NO ITEM SELECTED';
  detail.querySelector('.sf-inventory-description').textContent=item?.description||'Select an item to see its details.';
  detail.querySelector('.sf-inventory-stats').innerHTML=statsHTML(item);
  detail.querySelector('[data-drop]').disabled=!item||item.kind==='pickaxe';
  detail.querySelector('.sf-inventory-drop-note').textContent=item?.kind==='pickaxe'?'Pickaxe cannot be dropped':item?'Drop this item on Spawn Island':'No item in this slot';
  onChange(slots.map(x=>x?{...x}:null),selected);
 }
 let swapFrom=null;
 function swap(a,b){if(a===b)return;[slots[a],slots[b]]=[slots[b],slots[a]];selected=b;swapFrom=null;render()}
 function open(){if(opened||isPaused())return;opened=true;swapFrom=null;document.exitPointerLock?.();panel.hidden=false;backdrop.hidden=false;ui.classList.add('is-open');render()}
 function close(){if(!opened)return;opened=false;panel.hidden=true;backdrop.hidden=true;ui.classList.remove('is-open');swapFrom=null;stopInspect()}
 function toggle(){opened?close():open()}
 function pickup(){
  const found=pickups.find(p=>p.mesh.parent&&Math.hypot(position.x-p.mesh.position.x,position.z-p.mesh.position.z)<3.2);
  if(!found)return false;
  const free=slots.findIndex((s,i)=>i>0&&!s);
  if(free<0){hint.querySelector('strong').textContent='INVENTORY FULL';return false}
  slots[free]={...found.item};scene.remove(found.mesh);found.mesh.clear();selected=free;render();hint.hidden=true;return true;
 }
 function drop(){
  const item=slots[selected];if(!item||item.kind==='pickaxe')return;
  slots[selected]=null;
  const mesh=new THREE.Group();
  const m=new THREE.Mesh(new THREE.BoxGeometry(.75,.24,.17),new THREE.MeshStandardMaterial({color:0x4287de,metalness:.45,roughness:.3}));
  const h=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,1.15,10),new THREE.MeshStandardMaterial({color:0x333d53}));
  h.rotation.z=.3;mesh.add(m,h);
  mesh.position.set(position.x-Math.sin(camera.rotation.y)*2,1.3,position.z-Math.cos(camera.rotation.y)*2);
  scene.add(mesh);pickups.push({item,mesh});render();
 }
 function startInspect(){
  if(inspecting)return;
  const item=slots[selected];if(!item)return;
  inspecting=true;inspect.hidden=false;inspect.querySelector('.sf-inspect-icon').textContent=itemIcon(item);inspect.querySelector('.sf-inspect-name').textContent=item.name;inspect.querySelector('.sf-inspect-info').innerHTML=statsHTML(item);
 }
 function stopInspect(){clearTimeout(holdTimer);holdTimer=null;inspecting=false;inspect.hidden=true}
 const down=e=>{
  if(isEditing()||isPaused()||e.ctrlKey||e.altKey||e.metaKey)return;
  if(e.code==='KeyI'||e.code==='Tab'){e.preventDefault();if(!e.repeat)toggle();return}
  if(e.code==='KeyE'&&!opened&&!e.repeat){if(pickup())e.preventDefault();return}
  if(e.code==='KeyV'&&!e.repeat){holdTimer=setTimeout(startInspect,220);return}
  if(/^Digit[1-6]$/.test(e.code)&&!e.repeat){selected=Number(e.code.slice(-1))-1;swapFrom=null;render()}
 };
 const up=e=>{if(e.code==='KeyV')stopInspect()};
 const blur=()=>stopInspect();
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
 panel.querySelector('[data-close]').onclick=close;backdrop.onclick=close;panel.querySelector('[data-drop]').onclick=drop;
 render();
 return {
  get isOpen(){return opened},
  update(t){
   let nearest=null;
   for(const p of pickups){if(!p.mesh.parent)continue;p.mesh.rotation.y+=t*.7;p.mesh.position.y=1.3+Math.sin(performance.now()*.003)*.14;if(Math.hypot(position.x-p.mesh.position.x,position.z-p.mesh.position.z)<3.2)nearest=p}
   hint.hidden=opened||!nearest||isPaused();
   if(nearest){hint.querySelector('strong').textContent='PICK UP';hint.querySelector('span').textContent=nearest.item.name+' · '+nearest.item.rarity.toUpperCase()}
  },
  dispose(){close();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);ui.remove();for(const p of pickups){scene.remove(p.mesh);p.mesh.traverse(o=>{o.geometry?.dispose?.();if(o.material)o.material.dispose?.()})}}
 };
}
