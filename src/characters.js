import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';

export const SKYFRONT_SKINS={
 Jaxon:{id:'jaxon',name:'Jaxon',gender:'male',url:'/models/characters/jaxon.fbx',accent:'#4baaff'},
 Nova:{id:'nova',name:'Nova',gender:'female',url:'/models/characters/nova.fbx',accent:'#fa83d5'}
};
export const getCharacterDefinition=name=>SKYFRONT_SKINS[name]||SKYFRONT_SKINS.Jaxon;
const loader=new FBXLoader();
const cache=new Map();
function loadSkin(name){
 const def=getCharacterDefinition(name);
 if(!cache.has(def.id))cache.set(def.id,new Promise((resolve,reject)=>{
  loader.load(import.meta.env.BASE_URL+def.url.slice(1),object=>{
   object.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.side=THREE.DoubleSide}}});
   resolve(object);
  },undefined,reject);
 }).catch(e=>{cache.delete(def.id);throw e}));
 return cache.get(def.id);
}
export async function createSkyfrontCharacter(name='Jaxon'){
 const model=(await loadSkin(name)).clone(true);
 const bounds=new THREE.Box3().setFromObject(model);
 const size=bounds.getSize(new THREE.Vector3());
 if(!Number.isFinite(size.y)||size.y<.0001)throw Error('Invalid FBX model bounds');
 const scale=3.1/size.y;
 model.scale.multiplyScalar(scale);
 const scaled=new THREE.Box3().setFromObject(model);
 const center=scaled.getCenter(new THREE.Vector3());
 model.position.x-=center.x;
 model.position.z-=center.z;
 model.position.y-=scaled.min.y;
 return model;
}
// Pose rigged FBX characters without requiring an external animation file.
// If a model has no shoulder/arm bones, it remains in its imported bind pose.
function makeIdleRig(model){
 const bones=[];
 model.traverse(node=>{if(node.isBone)bones.push(node)});
 const find=(side,part)=>{
  const patterns={
   upper:/upperarm|uparm|arm[_ .-]?(l|r)|shoulder/i,
   lower:/forearm|lowerarm|loarm|elbow/i,
   head:/head/i,
   spine:/spine|chest/i
  };
  const sidePattern=side==='left'?/(left|[_ .-]l(?:$|[_ .-])|\.l$)/i:/(right|[_ .-]r(?:$|[_ .-])|\.r$)/i;
  return bones.find(b=>patterns[part].test(b.name)&&sidePattern.test(b.name)&&!(part==='upper'&&/fore|lower|hand|finger/i.test(b.name)));
 };
 const neck=bones.find(b=>/neck/i.test(b.name));
 const head=bones.find(b=>/head/i.test(b.name));
 const chest=bones.find(b=>/chest|spine2|spine_02|upperbody/i.test(b.name));
 const armBones=[];
 for(const side of ['left','right']){
  const upper=find(side,'upper'),lower=find(side,'lower');
  if(upper)armBones.push({bone:upper,side,kind:'upper',rest:upper.quaternion.clone()});
  if(lower)armBones.push({bone:lower,side,kind:'lower',rest:lower.quaternion.clone()});
 }
 const restHead=head?.quaternion.clone(),restNeck=neck?.quaternion.clone(),restChest=chest?.quaternion.clone();
 const target=new THREE.Quaternion(),axis=new THREE.Vector3(),desired=new THREE.Vector3();
 const pose=(t,dt)=>{
  const ease=1-Math.exp(-Math.min(dt,.05)*5);
  // Arms rest near the torso; elbows bend slightly forward, like a relaxed game lobby stance.
  for(const part of armBones){
   const sign=part.side==='left'?-1:1;
   const angle=part.kind==='upper'?(sign*.93+Math.sin(t*1.3+sign)*.018):(sign*-.24+Math.sin(t*1.1+sign)*.025);
   axis.set(0,0,1);
   target.setFromAxisAngle(axis,angle);
   target.multiply(part.rest);
   part.bone.quaternion.slerp(target,ease);
  }
  if(chest&&restChest){target.setFromEuler(new THREE.Euler(Math.sin(t*1.35)*.012,Math.sin(t*.58)*.025,Math.sin(t*.88)*.009));target.multiply(restChest);chest.quaternion.slerp(target,ease)}
  if(neck&&restNeck){target.setFromEuler(new THREE.Euler(Math.sin(t*.74)*.018,Math.sin(t*.57)*.045,0));target.multiply(restNeck);neck.quaternion.slerp(target,ease)}
  if(head&&restHead){target.setFromEuler(new THREE.Euler(Math.sin(t*.74)*.018,Math.sin(t*.57)*.04,0));target.multiply(restHead);head.quaternion.slerp(target,ease)}
 };
 return pose;
}
export function mountCharacterPreview(host,name='Jaxon',options={}){
 if(!host)return()=>{};
 let disposed=false,frame=0,renderer,avatar=null,angle=0,dragging=false,lastX=0,idleRig=null,lastTime=0;
 const lobby=Boolean(options.lobby),interactive=!lobby;
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(35,1,.1,100);
 camera.position.set(0,1.7,lobby?7.3:8.3);camera.lookAt(0,1.6,0);
 const label=document.createElement('div');label.className='sf-model-loading';label.textContent='LOADING '+name.toUpperCase()+'…';host.append(label);
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}
 catch(e){label.textContent='3D preview unavailable';return()=>label.remove()}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
 renderer.setClearColor(0x000000,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.className='sf-character-canvas';
 host.append(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xf5faff,0x314568,2.4));
 const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-4,7,5);scene.add(key);
 const rim=new THREE.DirectionalLight(0x7fc8ff,2.3);rim.position.set(3,5,-4);scene.add(rim);
 createSkyfrontCharacter(name).then(object=>{
  if(disposed)return;
  avatar=object;scene.add(avatar);idleRig=makeIdleRig(avatar);label.remove();
 }).catch(error=>{if(!disposed){label.textContent='MODEL NOT FOUND · '+name.toUpperCase();label.title=String(error);}});
 const down=e=>{dragging=true;lastX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId)};
 const move=e=>{if(dragging){angle+=(e.clientX-lastX)*.012;lastX=e.clientX}};
 const up=()=>{dragging=false};
 if(interactive)renderer.domElement.addEventListener('pointerdown',down);
 if(interactive)renderer.domElement.addEventListener('pointermove',move);
 if(interactive)renderer.domElement.addEventListener('pointerup',up);
 if(interactive)renderer.domElement.addEventListener('pointercancel',up);
 let w=0,h=0;
 function tick(now){
  if(disposed)return;
  frame=requestAnimationFrame(tick);
  if(document.hidden||!host.isConnected)return;
  if(host.clientWidth!==w||host.clientHeight!==h){
   w=host.clientWidth;h=host.clientHeight;
   if(w&&h){camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
  }
  if(!w||!h)return;
  if(avatar){
   const t=now*.001,dt=lastTime?Math.min(.05,t-lastTime):.016;lastTime=t;
   idleRig?.(t,dt);
   avatar.rotation.y=angle+Math.sin(t*.52)*.018;
   avatar.rotation.z=Math.sin(t*.78)*.004;
   avatar.position.y=Math.sin(t*1.45)*.012;
  }
  renderer.render(scene,camera);
 }
 frame=requestAnimationFrame(tick);
 return()=>{disposed=true;cancelAnimationFrame(frame);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);renderer.dispose();renderer.domElement.remove();label.remove();};
}

const thumbnailCache=new Map();
const thumbnailPending=new Map();
export function getSkinThumbnail(name){return thumbnailCache.get(name)||null}
export async function generateSkinThumbnail(name){
 if(thumbnailCache.has(name))return thumbnailCache.get(name);
 if(thumbnailPending.has(name))return thumbnailPending.get(name);
 const task=renderThumbnail(name).finally(()=>thumbnailPending.delete(name));
 thumbnailPending.set(name,task);
 return task;
}
async function renderThumbnail(name){
 const avatar=await createSkyfrontCharacter(name);
 const scene=new THREE.Scene();
 scene.add(avatar);scene.add(new THREE.HemisphereLight(0xffffff,0x345078,2.7));
 const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-3,5,6);scene.add(light);
 const camera=new THREE.PerspectiveCamera(35,1,.1,100);
 camera.position.set(0,1.7,7.3);camera.lookAt(0,1.6,0);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
 renderer.setSize(220,220);renderer.setPixelRatio(1);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.render(scene,camera);
 const url=renderer.domElement.toDataURL('image/png');
 renderer.dispose();thumbnailCache.set(name,url);
 window.dispatchEvent(new CustomEvent('skyfront:skin-thumbnail',{detail:{name,url}}));
 return url;
}
