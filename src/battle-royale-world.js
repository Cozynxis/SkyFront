import * as THREE from 'three';

// A deterministic, lightweight first playable Battle Royale island.
// Procedural geometry is a temporary base for future custom city GLBs.
export const BR_RADIUS=780;
const places=[
 {name:'HARBOR POINT',x:-390,z:-275,kind:'port'},
 {name:'NEON DISTRICT',x:285,z:-250,kind:'city'},
 {name:'PINE VALLEY',x:-305,z:245,kind:'village'},
 {name:'SUNSET SQUARE',x:230,z:280,kind:'town'},
 {name:'CENTRAL CROSSING',x:10,z:0,kind:'city'},
 {name:'HILLTOP',x:10,z:-480,kind:'village'}
];
export const BR_PLACES=places;
export function buildBattleRoyaleWorld(scene){
 const root=new THREE.Group();root.name='BattleRoyaleWorld';scene.add(root);
 const materials=[];
 const colliders=[];
 const mat=(c,extra={})=>{const m=new THREE.MeshStandardMaterial({color:c,roughness:.89,...extra});materials.push(m);return m};
 // Procedural grass texture prevents the flat green terrain look without external files.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const context=canvas.getContext('2d');context.fillStyle='#75b668';context.fillRect(0,0,256,256);
 let grassSeed=12897;const grassRandom=()=>{grassSeed=(Math.imul(grassSeed,1664525)+1013904223)>>>0;return grassSeed/4294967296};
 for(let i=0;i<4200;i++){context.fillStyle=i%3===0?'#4e9250':i%3===1?'#9bcc7b':'#62a75b';context.globalAlpha=.15+grassRandom()*.4;context.fillRect(grassRandom()*256,grassRandom()*256,1+grassRandom()*5,1+grassRandom()*7)}
 context.globalAlpha=1;
 const grassTexture=new THREE.CanvasTexture(canvas);grassTexture.colorSpace=THREE.SRGBColorSpace;grassTexture.wrapS=grassTexture.wrapT=THREE.RepeatWrapping;grassTexture.repeat.set(65,65);
 const grass=mat('#ffffff',{map:grassTexture}),sand=mat('#d9c68e'),road=mat('#65747d'),water=mat('#267eac',{roughness:.42}),trunk=mat('#77543a'),leaf=[mat('#36845b'),mat('#4c9b59'),mat('#2d7857')],rock=mat('#81918e');
 const buildings=['#b6c7c9','#d8b6a2','#a9b7d6','#e0d1a9','#b0d3c8'].map(c=>mat(c));
 const roof=mat('#435e7e'),windows=mat('#28455b',{metalness:.2}),line=mat('#f3dfaa');
 const geo=[];const own=(g)=>{geo.push(g);return g};
 const plane=(w,h,m,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(own(new THREE.PlaneGeometry(w,h)),m);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);root.add(mesh);return mesh};
 const box=(x,y,z,w,h,d,m)=>{const mesh=new THREE.Mesh(own(new THREE.BoxGeometry(w,h,d)),m);mesh.position.set(x,y,z);root.add(mesh);return mesh};
 const disc=(r,m,y=0)=>{const mesh=new THREE.Mesh(own(new THREE.CircleGeometry(r,96)),m);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;root.add(mesh)};
 plane(3200,3200,water,0,-2,0);
 disc(790,sand,-.5);disc(762,grass,0);
 // Two wide roads cross the island and connect the named settlements.
 plane(18,1340,road,0,.04,0);plane(1300,18,road,0,.05,0);
 for(let i=-600;i<600;i+=35){box(0,.085,i,1,.02,13,line);box(i,.09,0,13,.02,1,line)}
 let seed=314159;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const footprints=[];
 const clear=(x,z,r)=>Math.hypot(x,z)<740-r&&Math.abs(x)>17&&Math.abs(z)>17&&footprints.every(p=>Math.hypot(p.x-x,p.z-z)>p.r+r);
 for(const place of places){
  const rows=place.kind==='city'?5:3,cols=place.kind==='city'?5:4;
  // Distinct street grid and several blocks for each location.
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   if(rand()<.14)continue;
   const x=place.x+(col-(cols-1)/2)*27,z=place.z+(row-(rows-1)/2)*27;
   const height=place.kind==='city'?12+rand()*45:5+rand()*13;
   const width=12+rand()*7,depth=12+rand()*7;
   box(x,height/2,z,width,height,depth,buildings[Math.floor(rand()*buildings.length)]);
   box(x,height+.4,z,width+1,.8,depth+1,roof);
   // Window bands are visible from the Battle Bus without hundreds of meshes.
   for(let level=4;level<height-2;level+=5){
    box(x,level,z+depth/2+.07,width*.7,1.2,.12,windows);
    box(x+width/2+.07,level,z,.12,1.2,depth*.65,windows);
   }
   footprints.push({x,z,r:Math.max(width,depth)});
   colliders.push({type:'box',x,z,halfX:width/2,halfZ:depth/2,height});
  }
 }
 const treeTrunk=own(new THREE.CylinderGeometry(.75,1.1,7,6));
 const canopy=own(new THREE.ConeGeometry(5,14,7));
 const treeMat=leaf;
 for(let i=0;i<450;i++){
  const a=rand()*Math.PI*2,r=115+Math.sqrt(rand())*605,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(!clear(x,z,7))continue;
  const height=.75+rand()*.7;
  const tree=new THREE.Group();
  const t=new THREE.Mesh(treeTrunk,trunk);t.position.y=3.5;tree.add(t);
  const crown=new THREE.Mesh(canopy,treeMat[Math.floor(rand()*3)]);crown.position.y=11;tree.add(crown);
  tree.position.set(x,0,z);tree.scale.setScalar(height);tree.rotation.y=rand()*Math.PI*2;root.add(tree);
  colliders.push({type:'circle',x,z,radius:1.05*height,height:7*height});
 }
 const stoneGeo=own(new THREE.DodecahedronGeometry(3.2,0));
 for(let i=0;i<115;i++){
  const a=rand()*Math.PI*2,r=170+rand()*550,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(!clear(x,z,4))continue;
  const stone=new THREE.Mesh(stoneGeo,rock);stone.position.set(x,1.6,z);stone.scale.set(.6+rand(),.4+rand()*.7,.6+rand());stone.rotation.y=rand()*6;root.add(stone);
  colliders.push({type:'circle',x,z,radius:3.2*Math.max(stone.scale.x,stone.scale.z)*.8,height:3.2});
 }
 return {root,places,colliders,dispose(){scene.remove(root);geo.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());grassTexture.dispose()}};
}
