import * as THREE from 'three';
export function createFrontPassViewer(host,item){
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(36,1,.1,100);camera.position.set(0,1.1,6.8);camera.lookAt(0,.2,0);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor(0,0);host.appendChild(renderer.domElement);
 const ambient=new THREE.HemisphereLight(0xc7e7ff,0x222348,2.1);scene.add(ambient);
 const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(3,5,5);scene.add(key);
 const rim=new THREE.PointLight(0x6cbcff,45,10);rim.position.set(-3,2,-2);scene.add(rim);
 const group=new THREE.Group();scene.add(group);
 const mat=(color,metal=.5)=>new THREE.MeshStandardMaterial({color,metalness:metal,roughness:.3});
 const blue=mat(0x49b9ff),dark=mat(0x172445),gold=mat(0xffce57,.85),purple=mat(0x8053d9);
 const mesh=(geometry,material,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);group.add(o);return o};
 const box=(w,h,d,m,x,y,z=0)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const ball=(r,m,x,y,z=0)=>mesh(new THREE.SphereGeometry(r,20,14),m,x,y,z);
 const cylinder=(a,b,h,m,x,y,z=0)=>mesh(new THREE.CylinderGeometry(a,b,h,20),m,x,y,z);
 const build=(type)=>{
  if(type==='skin'||type==='emote'){
   ball(.38,gold,0,1.42);box(.95,1.2,.48,dark,0,.44);box(.7,.18,.53,blue,0,.85);
   [-1,1].forEach(s=>{box(.26,.95,.3,blue,s*.65,.5);box(.35,1.03,.38,dark,s*.24,-.68);box(.4,.24,.56,gold,s*.24,-1.23,.13)});
   if(type==='emote')group.rotation.z=.12;
  }else if(type==='axe'){cylinder(.07,.07,3,dark,0,-.1,0).rotation.z=-.5;box(1.25,.42,.2,blue,.6,.8).rotation.z=-.35;box(.6,.15,.3,gold,.7,1.05)}
  else if(type==='backpack'){box(1.35,1.5,.65,dark,0,0);box(1.1,.85,.74,blue,0,-.25);box(.5,.35,.8,gold,0,.45)}
  else if(type==='parachute'){mesh(new THREE.SphereGeometry(1.7,28,12,0,Math.PI*2,0,Math.PI/2),blue,0,.75);box(1.5,.1,.8,dark,0,-1.25);[-1,1].forEach(s=>{cylinder(.015,.015,2.1,gold,s*.65,-.35).rotation.z=s*.28})}
  else if(type==='coin'){cylinder(1.25,1.25,.24,gold,0,0).rotation.x=Math.PI/2;const tor=mesh(new THREE.TorusGeometry(.93,.06,8,40),blue);tor.rotation.z=0}
  else if(type==='skyfall'){for(let i=0;i<8;i++){const o=box(.12,1.6,.12,i%2?blue:purple,Math.cos(i*Math.PI/4)*.6,Math.sin(i*Math.PI/4)*.6);o.rotation.z=i*Math.PI/4}}
  else {box(1.8,1.4,.18,blue);box(1.5,1.1,.2,dark,0,0,.1);ball(.36,gold,0,0,.25)}
 };
 build(item.type);
 let running=true,dragging=false,lastX=0,rotation=0,frame=0;
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const down=e=>{dragging=true;lastX=e.clientX;host.setPointerCapture?.(e.pointerId)};
 const move=e=>{if(!dragging)return;rotation+=(e.clientX-lastX)*.012;lastX=e.clientX};
 const up=()=>{dragging=false};
 host.addEventListener('pointerdown',down);host.addEventListener('pointermove',move);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',up);
 const clock=new THREE.Clock();
 const animate=()=>{if(!running)return;frame=requestAnimationFrame(animate);const t=clock.getElapsedTime();if(!dragging)rotation+=.004;group.rotation.y=rotation;group.position.y=Math.sin(t*1.5)*.06;renderer.render(scene,camera)};
 animate();
 return()=>{running=false;cancelAnimationFrame(frame);observer.disconnect();host.removeEventListener('pointerdown',down);host.removeEventListener('pointermove',move);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',up);scene.traverse(o=>{o.geometry?.dispose();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose())}});renderer.dispose();renderer.domElement.remove()};
}