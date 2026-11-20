import * as THREE from 'three';

const SKINS={
 'Recruit':{gender:'male',jacket:'#2276c6',pants:'#243f69',hair:'#283248',skin:'#e4b58e',accent:'#e6f5ff',style:'jacket'},
 'Sky Scout':{gender:'female',jacket:'#17b8bd',pants:'#203c65',hair:'#3a263f',skin:'#dba77f',accent:'#e8fbff',style:'sport'},
 'Night Runner':{gender:'male',jacket:'#302b51',pants:'#151e36',hair:'#171a2b',skin:'#bb896c',accent:'#bb66ff',style:'hood'},
 'Blue Phantom':{gender:'female',jacket:'#2353bd',pants:'#142a58',hair:'#172c65',skin:'#bd9279',accent:'#79edff',style:'armor'},
 'Storm Ranger':{gender:'male',jacket:'#466f85',pants:'#26354b',hair:'#25272f',skin:'#d7a47e',accent:'#d4f3ff',style:'armor'},
 'Solar Scout':{gender:'female',jacket:'#ef9b36',pants:'#774a53',hair:'#63362a',skin:'#c78b64',accent:'#fff19b',style:'sport'},
 'Frost Agent':{gender:'female',jacket:'#85c5e5',pants:'#325178',hair:'#d9e9f2',skin:'#e8b99c',accent:'#f6ffff',style:'jacket'},
 'Neon Striker':{gender:'male',jacket:'#7532b9',pants:'#25274c',hair:'#171d31',skin:'#d5a37f',accent:'#44ffce',style:'sport'},
 'Shadow Guard':{gender:'male',jacket:'#303744',pants:'#111a2c',hair:'#151923',skin:'#b88b74',accent:'#ed5d91',style:'armor'},
 'Cloud Walker':{gender:'female',jacket:'#7c8ec5',pants:'#3d517c',hair:'#6a5362',skin:'#d7a78a',accent:'#eaf9ff',style:'jacket'},
 'Aurora':{gender:'female',jacket:'#7457b9',pants:'#244e64',hair:'#253a60',skin:'#d6a48b',accent:'#7bfbd1',style:'sport'},
 'Sky Sentinel':{gender:'male',jacket:'#316c9c',pants:'#283456',hair:'#282d41',skin:'#d7a17d',accent:'#f7d777',style:'armor'}
};
const material=(color,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness:.7,metalness});
const geoBox=new THREE.BoxGeometry(1,1,1);
const geoSphere=new THREE.SphereGeometry(1,20,14);
const geoCylinder=new THREE.CylinderGeometry(1,1,1,16);
function mesh(parent,geo,mat,xyz,scale,rotation){
 const o=new THREE.Mesh(geo,mat);o.position.set(...xyz);o.scale.set(...scale);
 if(rotation)o.rotation.set(...rotation);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
export function createSkyfrontCharacter(name='Recruit'){
 const cfg=SKINS[name]||SKINS.Recruit;
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const jacket=material(cfg.jacket),trousers=material(cfg.pants),hair=material(cfg.hair),skin=material(cfg.skin),accent=material(cfg.accent,.16),boots=material('#18233a'),seams=material('#142e4d');
 const narrow=cfg.gender==='female',torsoWidth=narrow?.78:.94,hips=narrow?.85:.81;
 // Shared rig hierarchy: clothing and proportions can later be swapped for GLB assets.
 mesh(body,geoBox,jacket,[0,1.9,0],[torsoWidth,.98,.49]);
 mesh(body,geoBox,trousers,[0,1.29,0],[hips,.27,.48]);
 mesh(body,geoBox,accent,[0,2.1,.255],[torsoWidth*.75,.095,.025]);
 mesh(body,geoBox,seams,[0,1.72,.254],[.13,.45,.025]);
 mesh(body,geoCylinder,skin,[0,2.53,0],[.17,.21,.17]);
 mesh(body,geoSphere,skin,[0,2.88,0],[.36,.43,.32]);
 mesh(body,geoSphere,hair,[0,3.14,-.07],[.375,.22,.34]);
 mesh(body,geoBox,hair,[0,3.17,.12],[.64,.11,.22]);
 // Eyes and eyebrows are intentionally readable at small preview sizes.
 for(const side of [-1,1]){
  mesh(body,geoSphere,boots,[side*.145,2.91,.298],[.042,.05,.022]);
  mesh(body,geoBox,hair,[side*.145,3.02,.30],[.115,.024,.024]);
  const arm=new THREE.Group();arm.position.set(side*(torsoWidth/2+.16),2.32,0);body.add(arm);
  mesh(arm,geoCylinder,jacket,[0,-.34,0],[.19,.43,.19],[0,0,side*.12]);
  mesh(arm,geoSphere,skin,[side*.04,-.82,.01],[.16,.18,.15]);
  arm.userData.armSide=side;
  const leg=new THREE.Group();leg.position.set(side*.24,1.14,0);body.add(leg);
  mesh(leg,geoCylinder,trousers,[0,-.43,0],[.225,.49,.225]);
  mesh(leg,geoBox,boots,[0,-.98,.12],[.37,.3,.58]);
  leg.userData.legSide=side;
 }
 if(cfg.style==='armor'){
  mesh(body,geoBox,accent,[0,2.17,.31],[.58,.36,.08]);
  for(const side of [-1,1])mesh(body,geoBox,jacket,[side*.55,2.31,0],[.33,.25,.57]);
 }else if(cfg.style==='hood'){
  mesh(body,geoSphere,jacket,[0,2.78,-.18],[.45,.51,.29]);
  mesh(body,geoBox,accent,[0,1.97,.263],[.42,.06,.035]);
 }else if(cfg.style==='sport'){
  mesh(body,geoBox,accent,[0,2.36,.265],[.57,.11,.035]);
 }
 root.userData={name,gender:cfg.gender,body,arms:body.children.filter(o=>o.userData.armSide),legs:body.children.filter(o=>o.userData.legSide)};
 return root;
}
export function mountCharacterPreview(host,name='Recruit'){
 if(!host)return()=>{};
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(35,1,.1,100);
 camera.position.set(0,2.05,8.3);camera.lookAt(0,1.65,0);
 let renderer;
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}
 catch(err){host.textContent='3D preview unavailable on this device';return()=>{}}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.setClearColor(0x000000,0);
 renderer.domElement.className='sf-character-canvas';
 host.append(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xd9f3ff,0x243655,2.1));
 const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-3,6,5);scene.add(key);
 const rim=new THREE.DirectionalLight(0x4caeff,2);rim.position.set(3,4,-4);scene.add(rim);
 const avatar=createSkyfrontCharacter(name);scene.add(avatar);
 const floor=mesh(scene,new THREE.CylinderGeometry(1.4,1.5,.14,48),material('#275fa4',.35),[0,-.12,0],[1,1,1]);
 const ring=mesh(scene,new THREE.TorusGeometry(1.38,.026,8,48),material('#77eaff',.25),[0,-.03,0],[1,1,1],[-Math.PI/2,0,0]);
 let width=0,height=0,frame=0,disposed=false,dragging=false,lastX=0,angle=-.25,auto=true;
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(w===width&&h===height)return;width=w;height=h;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
 const down=e=>{dragging=true;auto=false;lastX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId)};
 const move=e=>{if(dragging){angle+=(e.clientX-lastX)*.012;lastX=e.clientX}};
 const up=()=>{dragging=false};
 renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
 const start=performance.now();
 function tick(now){if(disposed)return;frame=requestAnimationFrame(tick);if(!host.isConnected||document.hidden)return;resize();if(!width||!height)return;
 const t=(now-start)/1000;
 if(auto)angle+=.003;
 avatar.rotation.y=angle;avatar.position.y=Math.sin(t*1.9)*.035;
 avatar.userData.arms.forEach(a=>a.rotation.z=Math.sin(t*1.7)*.035*a.userData.armSide);
 ring.rotation.z=t*.07;
 renderer.render(scene,camera);
 }
 frame=requestAnimationFrame(tick);
 return ()=>{disposed=true;cancelAnimationFrame(frame);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);
 scene.traverse(o=>{if(o.geometry&&o.geometry!==geoBox&&o.geometry!==geoSphere&&o.geometry!==geoCylinder)o.geometry.dispose();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose())}});
 renderer.dispose();renderer.domElement.remove();
 };
}
export const getCharacterDefinition=name=>SKINS[name]||SKINS.Recruit;
