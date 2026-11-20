import * as THREE from 'three';

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
 const metal=mat('#fff',{map:pattern('#638cb0','#1a476d','metal',2),metalness:.28});
 const wood=mat('#95653f'),leaves=[mat('#3f995d'),mat('#58ad65'),mat('#317c53')],sand=mat('#d6bd87');
 const box=(x,y,z,w,h,d,m,rot=0)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,rot);
 const cylinder=(x,y,z,r,h,m,segments=9)=>add(new THREE.CylinderGeometry(r,r,h,segments),m,x,y,z);
 const island=add(new THREE.CircleGeometry(71.5,80),grass,0,.065,0);island.rotation.x=-Math.PI/2;
 const runway=box(0,.085,-10,13,.09,63,concrete);
 for(let i=0;i<8;i++)box(0,.14,-35+i*7,.45,.015,3,mat('#f5e9bb'));
 for(let i=0;i<24;i++){
  const a=i*2.399,r=42+(i%4)*5,x=Math.cos(a)*r,z=Math.sin(a)*r;
  cylinder(x,2.1,z,.44,4.2,wood,8);
  cylinder(x,5.1,z,2.4,2.8,leaves[i%3],7);
  const top=add(new THREE.ConeGeometry(2.8,3.8,7),leaves[(i+1)%3],x,7,z);top.rotation.y=i*.5;
 }
 // Original detailed modular hangars with doors, roofs and windows.
 for(const [x,z,w,d,h,tint] of [[0,-26,19,11,6,'#6c91af'],[-24,-16,12,14,5,'#c29d74'],[24,-20,13,11,7,'#789bb6']]){
  const wall=mat(tint);box(x,h/2,z,w,h,d,wall);
  box(x,h+.38,z,w+1,.75,d+1,metal);
  box(x,h*.36,z+d/2+.035,w*.56,h*.72,.14,mat('#233e56'));
  for(let i=0;i<4;i++)box(x-w*.35+i*w*.23,h*.76,z+d/2+.13,w*.12,.55,.13,mat('#8cd1eb',{emissive:'#2a657c',emissiveIntensity:.2}));
  for(const side of [-1,1])box(x+side*(w/2+.15),h*.53,z,.3,h*.9,d,metal);
 }
 // Textured shipping containers, including ribs and corner locks.
 const containerColors=['#cf7850','#3b89b2','#d3b64f','#5a9b88'];
 for(let i=0;i<14;i++){
  const x=-33+(i%7)*10,z=-38+Math.floor(i/7)*8,m=mat(containerColors[i%4]);
  box(x,1.4,z,6,2.8,2.8,m);
  for(let j=0;j<10;j++)box(x-2.65+j*.58,1.4,z+1.43,.09,2.5,.06,metal);
  for(const side of [-1,1])box(x+side*2.9,1.4,z+1.46,.14,2.7,.09,mat('#d2dce2'));
 }
 // Wooden picnic benches and crates around the social waiting area.
 for(let i=0;i<7;i++){
  const x=-24+i*8,z=25+(i%2)*4;
  box(x,.75,z,3,.18,1.2,wood);box(x-1,.36,z,.18,.7,1,metal);box(x+1,.36,z,.18,.7,1,metal);
 }
 for(let i=0;i<10;i++){
  const x=-35+(i%5)*7,z=-2+Math.floor(i/5)*5;
  box(x,.8,z,1.6,1.6,1.6,wood);
  box(x,.8,z+.83,1.5,.1,.08,metal);
 }
 // Low-poly cliffs and shoreline rocks.
 for(let i=0;i<26;i++){
  const a=i*2.399,r=64+(i%3)*2.1;
  const rock=add(new THREE.DodecahedronGeometry(1.3+(i%4)*.55,0),i%3?sand:mat('#84938a'),Math.cos(a)*r,.3,Math.sin(a)*r);
  rock.scale.y=.5;rock.rotation.y=a;
 }
 // Directional signs and tall lamps.
 for(const [x,z] of [[-12,14],[14,14],[-15,-25],[18,-29]]){
  cylinder(x,2.4,z,.13,4.8,metal,8);
  box(x,4.8,z,.95,.22,.65,mat('#ffda70',{emissive:'#ffcf68',emissiveIntensity:.7}));
 }
 const sign=box(-13,2.2,13,5,1.6,.22,mat('#254b80'));
 const label=document.createElement('canvas');label.width=512;label.height=128;const ctx=label.getContext('2d');ctx.fillStyle='#194f83';ctx.fillRect(0,0,512,128);ctx.fillStyle='#fff';ctx.font='bold 53px sans-serif';ctx.textAlign='center';ctx.fillText('SPAWN ISLAND',256,80);
 const signTexture=new THREE.CanvasTexture(label);signTexture.colorSpace=THREE.SRGBColorSpace;
 add(new THREE.PlaneGeometry(4.7,1.2),new THREE.MeshBasicMaterial({map:signTexture,side:THREE.DoubleSide}),-13,2.2,13.13);
 return ()=>{for(const mesh of owned){scene.remove(mesh);mesh.geometry.dispose()}for(const m of [grass,concrete,metal,wood,sand,...leaves]){m.map?.dispose();m.dispose()}signTexture.dispose()};
}
