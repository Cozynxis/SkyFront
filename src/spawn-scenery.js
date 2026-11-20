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
 let disposed=false;
 const loader=new GLTFLoader();
 const assetUrl=file=>(import.meta.env.BASE_URL||'/')+'models/spawn-island/'+file;
 const models=[
  {file:'low-poly_tree.glb',count:24,min:31,max:60,scale:4.2},
  {file:'stylized_bush.glb',count:35,min:21,max:63,scale:2.1},
  {file:'small_grass_low_poly.glb',count:90,min:17,max:61,scale:1.35},
  {file:'low_poly_rock_set.glb',count:19,min:34,max:67,scale:1.6},
  {file:'small_modern_garage.glb',spots:[[0,-48,0],[-37,-12,1.57],[37,-12,-1.57]],scale:12}
 ];
 const hash=(n)=>{let x=(n*1664525+1013904223)>>>0;return x/4294967296};
 const makePositions=(def)=>{
  if(def.spots)return def.spots.map(([x,z,r])=>({x,z,rot:r}));
  const positions=[];
  for(let i=0;i<def.count;i++){
   const angle=i*2.399963+hash(i+def.count)*.42;
   const radius=def.min+(def.max-def.min)*Math.sqrt(hash(i*19+def.count));
   const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
   // Leave the central road, landing zone and waiting area clear.
   if(Math.abs(x)<15&&z>-53&&z<35)continue;
   if(z<0&&Math.abs(x)>16&&Math.abs(x)<48&&z>-43)continue;
   if(Math.abs(x)<13&&z<-39)continue;
   positions.push({x,z,rot:hash(i*7+def.count)*Math.PI*2});
  }
  return positions;
 };
 for(const def of models){
  loader.load(assetUrl(def.file),gltf=>{
   if(disposed){gltf.scene.traverse(o=>{if(o.isMesh)o.geometry?.dispose()});return}
   const source=gltf.scene;
   source.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(source);
   const size=bounds.getSize(new THREE.Vector3());
   if(size.lengthSq()===0)return;
   // Normalize every asset to a sensible world-space height while preserving proportions.
   const factor=def.scale/Math.max(size.y,.001);
   const placements=makePositions(def);
   for(let i=0;i<placements.length;i++){
    const p=placements[i],clone=source.clone(true);
    clone.scale.setScalar(factor*(def.spots?1:.8+hash(i*17+def.count)*.45));
    clone.rotation.y=p.rot;
    clone.updateMatrixWorld(true);
    const bb=new THREE.Box3().setFromObject(clone);
    const center=bb.getCenter(new THREE.Vector3());
    clone.position.set(p.x-center.x,.09-bb.min.y,p.z-center.z);
    scene.add(clone);imported.push(clone);
   }
  },undefined,error=>{console.error('[SKYFRONT] GLB failed:',assetUrl(def.file),error)});
 }
 return ()=>{disposed=true;for(const model of imported)scene.remove(model);for(const mesh of owned){scene.remove(mesh);mesh.geometry.dispose()}for(const m of [grass,concrete]){m.map?.dispose();m.dispose()}};
}
