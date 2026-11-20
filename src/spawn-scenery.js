import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Original SKYFRONT stylized scenery: lightweight procedural meshes and textures.
export function buildSpawnScenery(scene){
 const owned=[];
 const add=(geometry,material,x,y,z,rot=0)=>{
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.rotation.y=rot;scene.add(mesh);owned.push(mesh);return mesh;
 };
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.83,flatShading:true,...extra});
 function pattern(base,accent,kind,repeat=1){
  const c=document.createElement('canvas');c.width=c.height=256;
  const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
  let seed=1729;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  if(kind==='grass'){
   for(let i=0;i<1800;i++){const x=rnd()*256,y=rnd()*256;ctx.fillStyle=i%3?'#75b96b':accent;ctx.globalAlpha=.16+rnd()*.24;ctx.fillRect(x,y,1+rnd()*4,2+rnd()*5)}
  }else if(kind==='concrete'){
   ctx.strokeStyle=accent;ctx.globalAlpha=.27;ctx.lineWidth=2;
   for(let x=0;x<=256;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke()}
   for(let y=0;y<=256;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke()}
   for(let i=0;i<450;i++){ctx.fillStyle='#fff';ctx.globalAlpha=.03+rnd()*.1;ctx.fillRect(rnd()*256,rnd()*256,1,1)}
  }else if(kind==='metal'){
   for(let y=0;y<256;y+=26){ctx.fillStyle=accent;ctx.globalAlpha=.3;ctx.fillRect(0,y,256,3);ctx.globalAlpha=.12;ctx.fillRect(0,y+5,256,2)}
   ctx.globalAlpha=.5;ctx.fillStyle='#d8e7f4';for(let x=14;x<256;x+=54)for(let y=12;y<256;y+=26){ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill()}
  }
  ctx.globalAlpha=1;
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=4;
  return t;
 }
 const grass=mat('#fff',{map:pattern('#64a65d','#3f8646','grass',18)});
 const concrete=mat('#fff',{map:pattern('#9eabb0','#65717c','concrete',6)});


 const box=(x,y,z,w,h,d,m,rot=0)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,rot);

 const island=add(new THREE.CircleGeometry(71.5,80),grass,0,.065,0);island.rotation.x=-Math.PI/2;
 const runway=box(0,.085,-10,13,.09,63,concrete);
 for(let i=0;i<8;i++)box(0,.14,-35+i*7,.45,.015,3,mat('#f5e9bb'));
 // Imported environment assets are loaded from public/models/spawn-island/.
 const imported=[];
 const colliders=[];
 const grassMaterial=mat('#5ea951',{side:THREE.DoubleSide});
 let disposed=false;
 const loader=new GLTFLoader();
 const assetUrl=file=>(import.meta.env.BASE_URL||'/')+'models/spawn-island/'+file;
 const models=[
  {file:'low-poly_tree.glb',count:19,height:10.5,spacing:12,kind:'tree'},
  {file:'stylized_bush.glb',count:26,height:1.55,spacing:4.8,kind:'bush'},
  {file:'small_grass_low_poly.glb',count:65,height:.45,spacing:2.1,kind:'grass'},
  {file:'low_poly_rock_set.glb',count:16,height:1.8,spacing:5.5,kind:'rock'},
  {file:'small_modern_garage.glb',height:9,kind:'garage',spots:[[0,-48,0],[-37,-12,1.57],[37,-12,-1.57]]}
 ];
 // Stable random distribution; keep large objects apart and clear the runway and garages.
 let seed=52917;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const occupied=[];
 const garages=[[0,-48],[-37,-12],[37,-12]];
 function validPosition(x,z,kind,spacing){
  const radius=Math.hypot(x,z);
  if(radius>65-spacing*.45||radius<18)return false;
  if(Math.abs(x)<12&&z>-49&&z<35)return false;
  if(Math.hypot(x,z-11)<19)return false;
  if(garages.some(([gx,gz])=>Math.hypot(x-gx,z-gz)<15))return false;
  for(const o of occupied){
   // Grass can be sprinkled around scenery, but never inside larger models.
   const required=kind==='grass'?(o.kind==='grass'?2.2:o.kind==='tree'?5.2:3.0)
     :o.kind==='grass'?(kind==='tree'?5.2:3.0)
     :Math.max(spacing,o.spacing,(kind==='tree'||o.kind==='tree')?10:0);
   if(Math.hypot(x-o.x,z-o.z)<required)return false;
  }
  return true;
 }
 function positionsFor(def){
  if(def.spots)return def.spots.map(([x,z,rot])=>({x,z,rot}));
  const result=[];
  for(let tries=0;tries<def.count*130&&result.length<def.count;tries++){
   const a=random()*Math.PI*2;
   const r=Math.sqrt(18*18+random()*(65*65-18*18));
   const x=Math.cos(a)*r,z=Math.sin(a)*r;
   if(!validPosition(x,z,def.kind,def.spacing))continue;
   occupied.push({x,z,kind:def.kind,spacing:def.spacing});
   result.push({x,z,rot:random()*Math.PI*2});
  }
  return result;
 }
 // Calculate every position before async loading so load order cannot change spacing.
 const placements=new Map(models.map(def=>[def.file,positionsFor(def)]));
 function rockVariants(source){
  // A rock-set GLB commonly contains multiple rock objects in one scene.
  // Prefer separate top-level groups; otherwise extract its distinct mesh objects.
  const groups=source.children.filter(child=>child.visible&&child.type!=='Bone');
  if(groups.length>1)return groups;
  const meshes=[];
  source.traverse(node=>{if(node.isMesh&&node.visible)meshes.push(node)});
  return meshes.length>1?meshes:[source];
 }
 function makeRock(source){
  const variants=rockVariants(source);
  const selected=variants[Math.floor(random()*variants.length)];
  // Preserve world transform of a child when extracting it from the rock-set.
  source.updateMatrixWorld(true);
  const copy=selected.clone(true);
  const group=new THREE.Group();
  if(selected!==source){
   const matrix=selected.matrixWorld.clone();
   matrix.decompose(copy.position,copy.quaternion,copy.scale);
  }
  group.add(copy);
  return group;
 }
 for(const def of models){
  loader.load(assetUrl(def.file),gltf=>{
   if(disposed)return;
   const source=gltf.scene;
   source.updateMatrixWorld(true);
   for(const p of placements.get(def.file)){
    const clone=def.kind==='rock'?makeRock(source):source.clone(true);
    clone.updateMatrixWorld(true);
    const bb=new THREE.Box3().setFromObject(clone);
    const size=bb.getSize(new THREE.Vector3());
    if(size.y<.0001||!Number.isFinite(size.y))continue;
    const height=def.height*(def.spots?1:.83+random()*.35);
    clone.scale.multiplyScalar(height/size.y);
    clone.rotation.y+=p.rot;
    clone.updateMatrixWorld(true);
    const placed=new THREE.Box3().setFromObject(clone);
    const center=placed.getCenter(new THREE.Vector3());
    // Terrain is at y=0.065; position model's lowest point just above it.
    clone.position.x+=p.x-center.x;
    clone.position.z+=p.z-center.z;
    clone.position.y+=.08-placed.min.y;
    // Some free grass GLBs reference missing textures. Replace only grass
    // materials with a reliable double-sided stylized green material.
    if(def.kind==='grass')clone.traverse(node=>{if(node.isMesh)node.material=grassMaterial});
    scene.add(clone);
    imported.push(clone);
    if(!['grass','bush'].includes(def.kind)){
     const bounds=new THREE.Box3().setFromObject(clone);
     const center=bounds.getCenter(new THREE.Vector3());
     const extents=bounds.getSize(new THREE.Vector3());
     if(def.kind==='tree')colliders.push({type:'circle',x:center.x,z:center.z,radius:Math.max(.55,Math.min(1.65,extents.x*.13)),height:extents.y});
     else if(def.kind==='rock')colliders.push({type:'circle',x:center.x,z:center.z,radius:Math.max(.6,Math.min(extents.x,extents.z)*.42),height:extents.y});
     else colliders.push({type:'box',x:center.x,z:center.z,halfX:extents.x*.46,halfZ:extents.z*.46,height:extents.y});
    }
   }
  },undefined,error=>console.error('[SKYFRONT] GLB failed:',assetUrl(def.file),error));
 }
 const dispose=()=>{disposed=true;for(const model of imported)scene.remove(model);for(const mesh of owned){scene.remove(mesh);mesh.geometry.dispose()}for(const m of [grass,concrete]){m.map?.dispose();m.dispose()}grassMaterial.dispose()};
 dispose.colliders=colliders;
 return dispose;
}
