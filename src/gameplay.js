import * as THREE from 'three';
import './gameplay.css';

export function mountGameplay(root,{onExit=()=>{}}={}){
 let alive=true,frame=0,locked=false;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#86b9e0');scene.fog=new THREE.Fog('#86b9e0',35,130);
 const camera=new THREE.PerspectiveCamera(75,1,.1,250);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.className='sf-game-canvas';root.append(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xdcefff,0x40536d,2.2));
 const sun=new THREE.DirectionalLight(0xffffff,2.5);sun.position.set(-15,35,10);scene.add(sun);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(240,240),new THREE.MeshStandardMaterial({color:'#52926b',roughness:1}));ground.rotation.x=-Math.PI/2;scene.add(ground);
 const structures=[];
 function block(x,z,w,d,h,color){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.82}));
  mesh.position.set(x,h/2,z);scene.add(mesh);structures.push({x,z,w,d,h});
 }
 block(0,-22,16,7,6,'#537a9b');block(-24,-8,8,12,5,'#d2a47a');block(24,-13,11,9,8,'#738bb3');
 for(let i=0;i<18;i++){const a=i*2.399,r=28+i*2.3;block(Math.cos(a)*r,Math.sin(a)*r,3+i%3,3+i%2,2+i%4,i%2?'#638c8c':'#ab9b82')}
 const position=new THREE.Vector3(0,1.75,14);let yaw=0,pitch=0;
 const keys=new Set();let last=performance.now();
 const hud=document.createElement('div');hud.className='sf-game-hud';hud.innerHTML='<div class="sf-game-brand">SKYFRONT <span>PRE-ALPHA · MOVEMENT TEST</span></div><div class="sf-game-crosshair">+</div><div class="sf-game-help">CLICK TO LOOK AROUND · WASD MOVE · SHIFT SPRINT · ESC UNLOCK MOUSE</div><button type="button" class="sf-game-exit">RETURN TO LOBBY</button>';
 root.append(hud);
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
  const width=root.clientWidth,height=root.clientHeight;
  if(width&&height){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()}
  const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  const len=Math.hypot(forward,side)||1,speed=keys.has('ShiftLeft')?11:6;
  const dx=(Math.sin(yaw)*forward+Math.cos(yaw)*side)/len*speed*dt;
  const dz=(-Math.cos(yaw)*forward+Math.sin(yaw)*side)/len*speed*dt;
  if(!collides(position.x+dx,position.z))position.x+=dx;
  if(!collides(position.x,position.z+dz))position.z+=dz;
  position.x=THREE.MathUtils.clamp(position.x,-112,112);position.z=THREE.MathUtils.clamp(position.z,-112,112);
  camera.position.copy(position);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);
  renderer.render(scene,camera);
 }
 frame=requestAnimationFrame(tick);
 function dispose(){
  if(!alive)return;alive=false;cancelAnimationFrame(frame);
  if(document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();
  window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);document.removeEventListener('mousemove',mouse);document.removeEventListener('pointerlockchange',lockchange);renderer.domElement.removeEventListener('click',lock);
  scene.traverse(o=>{if(o.isMesh){o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose()}});
  renderer.dispose();renderer.domElement.remove();hud.remove();
 }
 return dispose;
}
