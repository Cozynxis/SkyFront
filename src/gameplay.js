import * as THREE from 'three';
import './gameplay.css';
import {supabase} from './community.js';

export function mountGameplay(root,{onExit=()=>{}}={}){
 let alive=true,frame=0,locked=false,phase='waiting',countdown=25,phaseClock=0,partyChannel=null,partyId=null,playerId=null,partyRoster=[],lastRosterUpdate=0;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#8bc8ed');scene.fog=new THREE.Fog('#8bc8ed',38,150);
 const camera=new THREE.PerspectiveCamera(75,1,.1,250);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.className='sf-game-canvas';root.append(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xdcefff,0x40536d,2.2));
 const sun=new THREE.DirectionalLight(0xffffff,2.5);sun.position.set(-15,35,10);scene.add(sun);
 const ground=new THREE.Mesh(new THREE.CircleGeometry(72,80),new THREE.MeshStandardMaterial({color:'#64aa69',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=.01;scene.add(ground);
 const ocean=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.MeshStandardMaterial({color:'#298cc1',roughness:.42,metalness:.08}));ocean.rotation.x=-Math.PI/2;ocean.position.y=-1.4;scene.add(ocean);
 const landing=new THREE.Mesh(new THREE.CircleGeometry(12,48),new THREE.MeshStandardMaterial({color:'#9ba9ae',roughness:.95}));landing.rotation.x=-Math.PI/2;landing.position.set(0,.035,11);scene.add(landing);
 const stripe=new THREE.Mesh(new THREE.RingGeometry(9.6,10.1,64),new THREE.MeshBasicMaterial({color:'#f5e9aa',side:THREE.DoubleSide}));stripe.rotation.x=-Math.PI/2;stripe.position.set(0,.05,11);scene.add(stripe);
 const structures=[];
 function block(x,z,w,d,h,color){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.82}));
  mesh.position.set(x,h/2,z);scene.add(mesh);structures.push({x,z,w,d,h});
 }
 // Spawn island: runway, hangars, stacked cargo, fences, trees and a watchtower.
 block(0,-24,18,10,6,'#507da1');block(-23,-15,11,13,5,'#d4a77c');block(24,-18,13,10,7,'#738db7');
 const metal=new THREE.MeshStandardMaterial({color:'#516e87',metalness:.3,roughness:.72});
 const foliage=new THREE.MeshStandardMaterial({color:'#3e955f',roughness:1});
 const bark=new THREE.MeshStandardMaterial({color:'#805c3b',roughness:1});
 function cylinder(x,y,z,r,h,mat,segments=9){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),mat);mesh.position.set(x,y,z);scene.add(mesh);return mesh}
 for(let i=0;i<22;i++){
  const a=i*2.399,r=37+(i%4)*6,x=Math.cos(a)*r,z=Math.sin(a)*r;
  cylinder(x,2.1,z,.48,4.2,bark);
  const canopy=new THREE.Mesh(new THREE.ConeGeometry(3.2,7,8),foliage);canopy.position.set(x,7.1,z);scene.add(canopy);
 }
 for(let i=0;i<16;i++){const x=-30+(i%8)*7,z=-34+Math.floor(i/8)*9;block(x,z,3.6,3.6,2.4,i%3===0?'#e8a24e':i%3===1?'#3986b7':'#c85e5c')}
 for(let i=0;i<18;i++){
  const x=-42+i*5;
  block(x,-47,.2,.2,2.5,'#d6e6ed');block(x,39,.2,.2,2.5,'#d6e6ed');
 }
 for(let i=0;i<17;i++){const x=-42+i*5;block(x,-47,5,.15,.1,'#d6e6ed');block(x,39,5,.15,.1,'#d6e6ed')}
 block(37,-33,7,7,2,'#768da0');block(37,-33,2,2,12,'#73859c');
 for(let i=0;i<6;i++){const x=-22+i*8;block(x,23,2,2,1.3,'#ab9879')}
 for(let i=0;i<5;i++){const x=-18+i*9;block(x,-5,2.2,2.2,.9,'#a1b7c0')}

 const position=new THREE.Vector3(0,1.75,11);
 const remoteAvatars=new Map();
 const avatarMaterial=new THREE.MeshStandardMaterial({color:'#f4ca89',roughness:.82});
 const shirtMaterial=new THREE.MeshStandardMaterial({color:'#2688c9',roughness:.8});
 const remoteGeo=new THREE.CapsuleGeometry(.4,.85,4,8);
 const headGeo=new THREE.SphereGeometry(.27,12,8);
 function syncAvatars(){
  const other=partyRoster.filter(p=>p.member_id!==playerId&&p.user_id!==playerId);
  for(const [id,obj] of remoteAvatars){if(!other.some(p=>(p.member_id||p.user_id)===id)){scene.remove(obj);remoteAvatars.delete(id)}}
  other.forEach((p,i)=>{
   const id=p.member_id||p.user_id;if(!id)return;
   let obj=remoteAvatars.get(id);
   if(!obj){obj=new THREE.Group();const torso=new THREE.Mesh(remoteGeo,shirtMaterial);torso.position.y=1.2;obj.add(torso);const head=new THREE.Mesh(headGeo,avatarMaterial);head.position.y=2.1;obj.add(head);scene.add(obj);remoteAvatars.set(id,obj)}
   obj.position.set(-5+i*3,0,9);
  });
 }
 async function loadParty(){
  try{
   const {data:{user}}=await supabase.auth.getUser();if(!alive)return;
   playerId=user?.id||null;
   if(!playerId){partyRoster=[];syncAvatars();return}
   const {data,error}=await supabase.rpc('sf_party_view');if(error)throw error;
   partyRoster=(data||[]).map(p=>({...p,user_id:p.member_id||p.user_id}));
   const nextId=partyRoster[0]?.party_id||null;
   if(nextId!==partyId){
    if(partyChannel){await supabase.removeChannel(partyChannel);partyChannel=null}
    partyId=nextId;
    if(partyId){
     partyChannel=supabase.channel('sf-spawn-'+partyId,{config:{presence:{key:playerId}}});
     partyChannel.on('presence',{event:'sync'},()=>{
      const members=Object.values(partyChannel.presenceState()).flat();
      if(alive)onlineLabel.textContent=members.length+' CONNECTED IN PARTY';
     }).on('broadcast',{event:'start'},({payload})=>{
      if(!alive||phase!=='waiting')return;
      countdown=Math.max(1,Math.min(60,Number(payload?.countdown)||25));
      phaseClock=0;
     }).subscribe(async status=>{if(status==='SUBSCRIBED')await partyChannel.track({user_id:playerId,joined_at:Date.now()})});
    }
   }
   syncAvatars();
  }catch(error){console.warn('Spawn Island party sync:',error)}
 }
let yaw=0,pitch=0;
 const keys=new Set();let last=performance.now();
 const hud=document.createElement('div');hud.className='sf-game-hud';hud.innerHTML='<div class="sf-game-brand">SKYFRONT <span>SPAWN ISLAND · PRE-ALPHA</span></div><div class="sf-spawn-status"><strong>SPAWN ISLAND</strong><span>WAITING FOR PLAYERS</span><small>Multiplayer matchmaking coming later</small></div><div class="sf-game-crosshair">+</div><div class="sf-game-help">CLICK TO LOOK AROUND · WASD MOVE · SHIFT SPRINT · ESC UNLOCK MOUSE</div><button type="button" class="sf-game-exit">RETURN TO LOBBY</button>';
 root.append(hud);
 const spawnStatus=hud.querySelector('.sf-spawn-status');
 spawnStatus.innerHTML='<strong>SPAWN ISLAND</strong><span class="sf-spawn-countdown">BATTLE BUS IN 25s</span><small class="sf-spawn-online">WAITING FOR PLAYERS</small>';
 const countdownLabel=spawnStatus.querySelector('.sf-spawn-countdown'),onlineLabel=spawnStatus.querySelector('.sf-spawn-online');
 const bus=new THREE.Group();bus.visible=false;scene.add(bus);
 const busBody=new THREE.Mesh(new THREE.BoxGeometry(5,2.3,2.6),new THREE.MeshStandardMaterial({color:'#278bda',roughness:.55}));bus.add(busBody);
 const balloon=new THREE.Mesh(new THREE.SphereGeometry(3.6,20,14),new THREE.MeshStandardMaterial({color:'#60c9f6',roughness:.7}));balloon.position.y=5.2;bus.add(balloon);
 const ropes=new THREE.MeshStandardMaterial({color:'#e8e3c8'});
 for(const x of [-1.7,1.7])for(const z of [-.8,.8]){const rope=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,4.5,5),ropes);rope.position.set(x,2.8,z);bus.add(rope)}
 bus.position.set(-60,22,-35);
 const busBanner=document.createElement('div');busBanner.className='sf-bus-banner';busBanner.hidden=true;busBanner.innerHTML='<strong>THE BATTLE BUS IS HERE!</strong><span>Battle Royale map coming soon · Spawn Island preview</span>';hud.append(busBanner);
 void loadParty();

 const exit=()=>{dispose();onExit()};
 hud.querySelector('.sf-game-exit').addEventListener('click',exit);
 const keydown=e=>{if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){keys.add(e.code);e.preventDefault()}};
 const keyup=e=>keys.delete(e.code);
 const mouse=e=>{if(!locked)return;yaw-=e.movementX*.0024;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.0024,-1.45,1.45)};
 const lock=()=>{renderer.domElement.requestPointerLock?.()};
 const lockchange=()=>{locked=document.pointerLockElement===renderer.domElement};
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);document.addEventListener('mousemove',mouse);document.addEventListener('pointerlockchange',lockchange);renderer.domElement.addEventListener('click',lock);
 function collides(x,z){return structures.some(b=>Math.abs(x-b.x)<b.w/2+.45&&Math.abs(z-b.z)<b.d/2+.45&&b.h>1)}
 function tick(now){
  if(!alive)return;frame=requestAnimationFrame(tick);
  const dt=Math.min((now-last)/1000,.05);last=now;
  lastRosterUpdate+=dt;if(lastRosterUpdate>4){lastRosterUpdate=0;void loadParty()}
  phaseClock+=dt;
  if(phase==='waiting'){countdown=Math.max(0,countdown-dt);countdownLabel.textContent='BATTLE BUS IN '+Math.ceil(countdown)+'s';if(countdown<=0){phase='bus';phaseClock=0;bus.visible=true;busBanner.hidden=false;spawnStatus.querySelector('strong').textContent='BATTLE BUS ARRIVING';countdownLabel.textContent='SPAWN ISLAND PREVIEW'}}
  if(phase==='bus'){bus.position.x=-60+Math.min(120,phaseClock*12);bus.position.y=22+Math.sin(phaseClock*.9)*1.2;bus.rotation.y=.1;if(phaseClock>11){phase='complete';bus.visible=false;spawnStatus.querySelector('strong').textContent='SPAWN ISLAND';countdownLabel.textContent='BATTLE ROYALE MAP COMING SOON'}}
  const width=root.clientWidth,height=root.clientHeight;
  if(width&&height){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()}
  const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  const len=Math.hypot(forward,side)||1,speed=keys.has('ShiftLeft')?11:6;
  const dx=(Math.sin(yaw)*forward+Math.cos(yaw)*side)/len*speed*dt;
  const dz=(-Math.cos(yaw)*forward+Math.sin(yaw)*side)/len*speed*dt;
  if(!collides(position.x+dx,position.z))position.x+=dx;
  if(!collides(position.x,position.z+dz))position.z+=dz;
  const radius=Math.hypot(position.x,position.z);if(radius>68){position.x*=68/radius;position.z*=68/radius}
  camera.position.copy(position);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);
  renderer.render(scene,camera);
 }
 frame=requestAnimationFrame(tick);
 function dispose(){
  if(!alive)return;alive=false;cancelAnimationFrame(frame);
  if(document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();
  window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);document.removeEventListener('mousemove',mouse);document.removeEventListener('pointerlockchange',lockchange);renderer.domElement.removeEventListener('click',lock);
  scene.traverse(o=>{if(o.isMesh){o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose()}});
  if(partyChannel)void supabase.removeChannel(partyChannel);
  renderer.dispose();renderer.domElement.remove();hud.remove();
 }
 return dispose;
}
