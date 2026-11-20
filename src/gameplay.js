import * as THREE from 'three';
import './gameplay.css';
import {supabase} from './community.js';
import {buildSpawnScenery} from './spawn-scenery.js';
import {mountGameHud} from './game-hud.js';
import {mountInventory} from './inventory.js';

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
 const disposeScenery=buildSpawnScenery(scene);

 const position=new THREE.Vector3(0,1.75,11);
 const movement={stamina:100,exhausted:false,regenDelay:0,crouched:false,crouchBlend:0,bobPhase:0,bobAmount:0,viewY:1.75,roll:0};
 const gameHud=mountGameHud(root,{position});
 const inventory=mountInventory({root,scene,position,camera,renderer,onChange:(items,selected)=>gameHud.setInventory(items,selected)});
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
   gameHud.setState({players:Math.max(1,partyRoster.length)});
   const nextId=partyRoster[0]?.party_id||null;
   if(nextId!==partyId){
    if(partyChannel){await supabase.removeChannel(partyChannel);partyChannel=null}
    partyId=nextId;
    if(partyId){
     partyChannel=supabase.channel('sf-spawn-'+partyId,{config:{presence:{key:playerId}}});
     partyChannel.on('presence',{event:'sync'},()=>{
      const members=Object.values(partyChannel.presenceState()).flat();
      if(alive){onlineLabel.textContent=members.length+' CONNECTED IN PARTY';gameHud.setState({players:Math.max(1,members.length)})}
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
 const moveVelocity=new THREE.Vector2();
 const forwardVector=new THREE.Vector3();
 const rightVector=new THREE.Vector3();
 const hud=document.createElement('div');hud.className='sf-game-hud';hud.innerHTML='<div class="sf-game-brand">SKYFRONT <span>SPAWN ISLAND · PRE-ALPHA</span></div><div class="sf-spawn-status"><strong>SPAWN ISLAND</strong><span>WAITING FOR PLAYERS</span><small>Multiplayer matchmaking coming later</small></div><div class="sf-game-crosshair">+</div><div class="sf-game-help">CLICK TO LOOK AROUND · WASD MOVE · SHIFT SPRINT · CTRL / C CROUCH · ESC MENU · I INVENTORY</div>';
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
 const leaveFromMenu=()=>exit();
 document.addEventListener('sf:leave-gameplay',leaveFromMenu);
 const helpTip=hud.querySelector('.sf-game-help');
 const helpFadeTimer=window.setTimeout(()=>{if(alive)helpTip.classList.add('is-fading')},5000);
 const movementCodes=['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','ControlLeft','ControlRight','KeyC','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
 const keydown=e=>{
  if(e.code==='Escape'){
   if(inventory.isOpen){e.preventDefault();inventory.close();return}
   resetInput();
   if(!locked&&!e.defaultPrevented&&!document.querySelector('.sf-account-layer.open')){e.preventDefault();document.dispatchEvent(new Event('sf:open-game-menu'))}
   // When pointer-locked, Escape unlocks it; lockchange opens the menu.
   return;
  }
  if(movementCodes.includes(e.code)&&!inventory.isOpen&&!document.querySelector('.sf-account-layer.open')){keys.add(e.code);e.preventDefault()}
 };
 const keyup=e=>keys.delete(e.code);
 const resetInput=()=>{keys.clear();moveVelocity.set(0,0)};
 const visibilityChange=()=>{if(document.hidden)resetInput()};
 const mouse=e=>{if(!locked)return;yaw-=e.movementX*.0024;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.0024,-1.45,1.45)};
 const lock=()=>{renderer.domElement.requestPointerLock?.()};
 const lockchange=()=>{
  const wasLocked=locked;
  locked=document.pointerLockElement===renderer.domElement;
  if(wasLocked&&!locked&&alive){resetInput();if(!inventory.isOpen)document.dispatchEvent(new Event('sf:open-game-menu'))}
 };
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',resetInput);document.addEventListener('visibilitychange',visibilityChange);document.addEventListener('mousemove',mouse);document.addEventListener('pointerlockchange',lockchange);renderer.domElement.addEventListener('click',lock);
 function collides(x,z){return structures.some(b=>Math.abs(x-b.x)<b.w/2+.45&&Math.abs(z-b.z)<b.d/2+.45&&b.h>1)}
 function tick(now){
  if(!alive)return;frame=requestAnimationFrame(tick);
  const dt=Math.min((now-last)/1000,.05);last=now;
  lastRosterUpdate+=dt;if(lastRosterUpdate>4){lastRosterUpdate=0;void loadParty()}
  phaseClock+=dt;
  if(phase==='waiting'){countdown=Math.max(0,countdown-dt);gameHud.setState({seconds:countdown});countdownLabel.textContent='BATTLE BUS IN '+Math.ceil(countdown)+'s';if(countdown<=0){phase='bus';phaseClock=0;bus.visible=true;busBanner.hidden=false;spawnStatus.querySelector('strong').textContent='BATTLE BUS ARRIVING';countdownLabel.textContent='SPAWN ISLAND PREVIEW'}}
  if(phase==='bus'){bus.position.x=-60+Math.min(120,phaseClock*12);bus.position.y=22+Math.sin(phaseClock*.9)*1.2;bus.rotation.y=.1;if(phaseClock>11){phase='complete';bus.visible=false;spawnStatus.querySelector('strong').textContent='SPAWN ISLAND';countdownLabel.textContent='BATTLE ROYALE MAP COMING SOON'}}
  const width=root.clientWidth,height=root.clientHeight;
  if(width&&height){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()}
  // Camera-relative movement: W goes where the camera faces, A goes left.
  // Derive horizontal directions from the camera's yaw to avoid reversed strafing.
  const forward=inventory.isOpen||document.querySelector('.sf-account-layer.open')?0:Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
  const strafe=inventory.isOpen||document.querySelector('.sf-account-layer.open')?0:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const length=Math.hypot(forward,strafe);
  const blocked=inventory.isOpen||Boolean(document.querySelector('.sf-account-layer.open'))||document.hidden;
  const crouchHeld=keys.has('ControlLeft')||keys.has('ControlRight')||keys.has('KeyC');
  movement.crouched=!blocked&&crouchHeld;
  const sprintHeld=keys.has('ShiftLeft')||keys.has('ShiftRight');
  const wantsSprint=!blocked&&!movement.crouched&&sprintHeld&&forward>0&&length>0;
  if(movement.stamina<=0.01)movement.exhausted=true;
  if(movement.exhausted&&movement.stamina>=35)movement.exhausted=false;
  const sprinting=wantsSprint&&!movement.exhausted&&movement.stamina>0;
  if(sprinting){
   movement.stamina=Math.max(0,movement.stamina-19*dt);
   movement.regenDelay=0.85;
  }else{
   movement.regenDelay=Math.max(0,movement.regenDelay-dt);
   if(movement.regenDelay===0)movement.stamina=Math.min(100,movement.stamina+24*dt);
  }
  if(movement.stamina===0)movement.exhausted=true;
  const speed=movement.crouched?3.05:sprinting?8.15:6.1;
  gameHud.setStamina(movement.stamina,sprinting,movement.exhausted);
  movement.crouchBlend=THREE.MathUtils.damp(movement.crouchBlend,movement.crouched?1:0,11,dt);
  forwardVector.set(-Math.sin(yaw),0,-Math.cos(yaw));
  rightVector.set(Math.cos(yaw),0,-Math.sin(yaw));
  const desiredX=length>0?(forwardVector.x*forward+rightVector.x*strafe)/length*speed:0;
  const desiredZ=length>0?(forwardVector.z*forward+rightVector.z*strafe)/length*speed:0;
  const smoothing=1-Math.exp(-(length>0?10:13)*dt);
  moveVelocity.x=THREE.MathUtils.lerp(moveVelocity.x,desiredX,smoothing);
  moveVelocity.y=THREE.MathUtils.lerp(moveVelocity.y,desiredZ,smoothing);
  const dx=moveVelocity.x*dt,dz=moveVelocity.y*dt;
  if(!collides(position.x+dx,position.z))position.x+=dx;else moveVelocity.x=0;
  if(!collides(position.x,position.z+dz))position.z+=dz;else moveVelocity.y=0;
  const radius=Math.hypot(position.x,position.z);if(radius>68){position.x*=68/radius;position.z*=68/radius}
  inventory.update(dt);
  gameHud.updatePosition();
  const actualSpeed=moveVelocity.length();
  const moving=actualSpeed>0.22&&!blocked;
  movement.bobAmount=THREE.MathUtils.damp(movement.bobAmount,moving?Math.min(1,actualSpeed/6.1):0,9,dt);
  if(moving)movement.bobPhase+=dt*actualSpeed*(movement.crouched?1.18:1.65);
  const bobVertical=Math.sin(movement.bobPhase*2)*0.023*movement.bobAmount*(movement.crouched?.45:1);
  const bobSide=Math.cos(movement.bobPhase)*0.015*movement.bobAmount*(movement.crouched?.5:1);
  movement.viewY=THREE.MathUtils.damp(movement.viewY,1.75-movement.crouchBlend*0.63,12,dt);
  movement.roll=THREE.MathUtils.damp(movement.roll,-strafe*0.011*(movement.crouched?.6:1),9,dt);
  camera.position.set(position.x+bobSide,movement.viewY+bobVertical,position.z);
  camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,movement.roll);
  renderer.render(scene,camera);
 }
 frame=requestAnimationFrame(tick);
 function dispose(){
  if(!alive)return;alive=false;cancelAnimationFrame(frame);window.clearTimeout(helpFadeTimer);
  document.removeEventListener('sf:leave-gameplay',leaveFromMenu);
  if(document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();
  window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',resetInput);document.removeEventListener('visibilitychange',visibilityChange);document.removeEventListener('mousemove',mouse);document.removeEventListener('pointerlockchange',lockchange);renderer.domElement.removeEventListener('click',lock);
  scene.traverse(o=>{if(o.isMesh){o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose()}});
  if(partyChannel)void supabase.removeChannel(partyChannel);
  disposeScenery();
  inventory.dispose();
  gameHud.dispose();
  renderer.dispose();renderer.domElement.remove();hud.remove();
 }
 return dispose;
}
