import * as THREE from 'three';

export function createBattleBus(){
 const bus=new THREE.Group();bus.name='SkyfrontBattleBus';
 const mats=[];
 const material=(color,metalness=.05)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness:.5});mats.push(m);return m};
 const blue=material('#1468b8',.4),dark=material('#173452',.35),trim=material('#52c6ed',.45),glass=material('#9adff3',.2),gold=material('#e9c35a',.55),wheel=material('#1c2534'),rope=material('#c4d8df'),balloon=material('#2e8bc7'),balloonStripe=material('#73d5ee');
 const geometries=[];
 const mesh=(geometry,mat,x,y,z)=>{geometries.push(geometry);const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);bus.add(o);return o};
 const box=(w,h,d,m,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z);
 // Bus points towards its negative Z axis.
 box(3.6,2.1,8.5,blue,0,0,0);
 box(3.72,.22,8.6,dark,0,1.17,0);
 box(3.75,.35,8.7,dark,0,-1.15,0);
 box(3.2,1.1,1.2,glass,0,.38,-3.75);
 box(2.3,.32,8.7,trim,0,-.3,0);
 for(const side of [-1,1]){
  for(let i=0;i<6;i++){
   box(.055,.8,.83,glass,side*1.84,.38,-2.45+i*1.03);
   box(.07,.07,.86,dark,side*1.89,.05,-2.45+i*1.03);
  }
  for(const z of [-2.75,2.75]){
   const tire=mesh(new THREE.CylinderGeometry(.8,.8,.45,16),wheel,side*2,-1.05,z);
   tire.rotation.z=Math.PI/2;
   const hub=mesh(new THREE.CylinderGeometry(.38,.38,.48,12),gold,side*2.02,-1.05,z);hub.rotation.z=Math.PI/2;
  }
  for(const z of [-2.65,2.65]){
   const cable=mesh(new THREE.CylinderGeometry(.055,.055,5.5,7),rope,side*1.1,4.25,z);
   cable.rotation.z=side*.14;
  }
 }
 // Raised engine, roof deck, turbine, neon trim and hanging beacon.
 box(2.8,.7,2.3,dark,0,1.55,1.6);
 box(2.5,.13,4.2,gold,0,2.03,0);
 for(let i=0;i<5;i++)box(2.4,.05,.12,trim,0,2.15,-1.6+i*.75);
 const balloonMesh=mesh(new THREE.SphereGeometry(5,32,20),balloon,0,9.1,0);
 balloonMesh.scale.set(.9,1.1,.86);
 const stripeGeo=new THREE.TorusGeometry(4.45,.1,6,48);
 for(const y of [7.5,9.1,10.6]){
  const ring=mesh(stripeGeo,balloonStripe,0,y,0);ring.rotation.x=Math.PI/2;ring.scale.set(1,.86,1);
 }
 const harness=mesh(new THREE.CylinderGeometry(.45,.6,1.5,12),gold,0,3.1,0);
 const light=mesh(new THREE.SphereGeometry(.32,12,8),trim,0,-1.65,-4.05);
 const engineGlow=new THREE.PointLight('#52d7ff',1.2,16);engineGlow.position.set(0,-.8,4);bus.add(engineGlow);
 return {group:bus,update(t){balloonMesh.rotation.y=Math.sin(t*.3)*.018;light.scale.setScalar(1+Math.sin(t*4)*.1)},dispose(){geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose())}};
}
