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
export function mountCharacterPreview(host,name='Jaxon'){
 if(!host)return()=>{};
 let disposed=false,frame=0,renderer,avatar=null,angle=0,dragging=false,lastX=0;
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(35,1,.1,100);
 camera.position.set(0,1.7,8.3);camera.lookAt(0,1.6,0);
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
  avatar=object;scene.add(avatar);label.remove();
 }).catch(error=>{if(!disposed){label.textContent='MODEL NOT FOUND · '+name.toUpperCase();label.title=String(error);}});
 const down=e=>{dragging=true;lastX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId)};
 const move=e=>{if(dragging){angle+=(e.clientX-lastX)*.012;lastX=e.clientX}};
 const up=()=>{dragging=false};
 renderer.domElement.addEventListener('pointerdown',down);
 renderer.domElement.addEventListener('pointermove',move);
 renderer.domElement.addEventListener('pointerup',up);
 renderer.domElement.addEventListener('pointercancel',up);
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
  if(avatar){if(!dragging)angle+=.002;avatar.rotation.y=angle;avatar.position.y=Math.sin(now*.0018)*.025;}
  renderer.render(scene,camera);
 }
 frame=requestAnimationFrame(tick);
 return()=>{disposed=true;cancelAnimationFrame(frame);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);renderer.dispose();renderer.domElement.remove();label.remove();};
}

const thumbnailCache=new Map();
export function getSkinThumbnail(name){return thumbnailCache.get(name)||null}
export async function generateSkinThumbnail(name){
 if(thumbnailCache.has(name))return thumbnailCache.get(name);
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
