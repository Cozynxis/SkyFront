import * as THREE from 'three';

// Lightweight, original pack-reveal inspired 3D stage. Returns a cleanup callback.
export function createRevealStage(host, logoUrl) {
 const scene = new THREE.Scene();
 scene.fog = new THREE.FogExp2(0x060910, 0.028);
 const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 140);
 camera.position.set(0, 3.5, 15);
 const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
 renderer.setSize(host.clientWidth||800,host.clientHeight||600);
 renderer.outputColorSpace = THREE.SRGBColorSpace;
 renderer.toneMapping = THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure = 1.3;
 host.appendChild(renderer.domElement);
 const ambient = new THREE.AmbientLight(0x7e9cd9,1.5);scene.add(ambient);
 const goldLight = new THREE.PointLight(0xffd36b,0,24);goldLight.position.set(0,3,4);scene.add(goldLight);
 const rimLight = new THREE.PointLight(0x82bfff,5,22);rimLight.position.set(-5,5,-1);scene.add(rimLight);
 const ground = new THREE.Mesh(new THREE.CylinderGeometry(5.5,6.2,.25,80),new THREE.MeshStandardMaterial({color:0x0c1322,metalness:.8,roughness:.25}));
 ground.position.y=-3.5;scene.add(ground);
 const floorRing = new THREE.Mesh(new THREE.TorusGeometry(4.5,.06,12,96),new THREE.MeshBasicMaterial({color:0x81a8ec}));
 floorRing.rotation.x=Math.PI/2;floorRing.position.y=-3.34;scene.add(floorRing);
 const logoGroup = new THREE.Group();scene.add(logoGroup);
 const edgeMat = new THREE.MeshStandardMaterial({color:0x343c50,metalness:1,roughness:.16});
 const back = new THREE.Mesh(new THREE.BoxGeometry(3.7,3.7,.32),edgeMat);
 logoGroup.add(back);
 const texture = new THREE.TextureLoader().load(logoUrl);
 texture.colorSpace=THREE.SRGBColorSpace;
 const face = new THREE.Mesh(new THREE.PlaneGeometry(3.56,3.56),new THREE.MeshBasicMaterial({map:texture,transparent:true,toneMapped:false}));
 face.position.z=.175;logoGroup.add(face);
 const halo = new THREE.Mesh(new THREE.TorusGeometry(2.8,.035,12,120),new THREE.MeshBasicMaterial({color:0x779ff3,transparent:true,opacity:.7}));
 logoGroup.add(halo);
 const halo2 = new THREE.Mesh(new THREE.TorusGeometry(3.6,.022,10,120),new THREE.MeshBasicMaterial({color:0xffe2a0,transparent:true,opacity:0}));
 halo2.rotation.y=.35;logoGroup.add(halo2);
 const columns=[];
 const colGeo=new THREE.BoxGeometry(.25,9,.25);
 for(let i=0;i<14;i++){
  const a=i/14*Math.PI*2;
  const mat=new THREE.MeshStandardMaterial({color:0x182238,emissive:0x315da9,emissiveIntensity:.4,metalness:.8});
  const col=new THREE.Mesh(colGeo,mat);
  col.position.set(Math.sin(a)*8,0,Math.cos(a)*8-2);
  scene.add(col);columns.push(col);
 }
 const beams=[];
 const beamGeo=new THREE.ConeGeometry(.85,12,20,1,true);
 beamGeo.translate(0,6,0);
 for(let i=0;i<8;i++){
  const mat=new THREE.MeshBasicMaterial({color:0x78aaff,transparent:true,opacity:.06,depthWrite:false,side:THREE.DoubleSide});
  const beam=new THREE.Mesh(beamGeo,mat);
  beam.position.set(Math.sin(i*Math.PI*2/8)*5,-3.4,Math.cos(i*Math.PI*2/8)*5-2);
  scene.add(beam);beams.push(beam);
 }
 const count=340;
 const particlesGeo=new THREE.BufferGeometry();
 const positions=new Float32Array(count*3);
 const randoms=new Float32Array(count);
 for(let i=0;i<count;i++){
  const a=Math.random()*Math.PI*2,rad=3+Math.random()*9;
  positions[i*3]=Math.cos(a)*rad;
  positions[i*3+1]=(Math.random()-.5)*12;
  positions[i*3+2]=Math.sin(a)*rad-2;
  randoms[i]=Math.random();
 }
 particlesGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const particlesMat=new THREE.PointsMaterial({color:0x99bfff,size:.075,transparent:true,opacity:.8,depthWrite:false});
 const particles=new THREE.Points(particlesGeo,particlesMat);scene.add(particles);
 const TAU=Math.PI*2;
 let start=performance.now(),frame=0,disposed=false;
 const resize=()=>{const w=host.clientWidth||800,h=host.clientHeight||600;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function animate(now){
  if(disposed)return;
  const t=Math.min((now-start)/1000,10),gold=Math.min(1,Math.max(0,(t-3.3)/1.1));
  logoGroup.position.y=Math.sin(t*1.9)*.17+.4;
  const zoom=t<2?Math.max(.01,t/2):1;
  logoGroup.scale.setScalar(zoom*(t>4.2&&t<5.1?1+(t-4.2)*.22:1));
  logoGroup.rotation.y=t<3?Math.PI*2*(1-t/3)+.15*Math.sin(t):.12*Math.sin(t*.65);
  logoGroup.rotation.z=Math.sin(t*.8)*.035;
  const gray=new THREE.Color(0x343c50),yellow=new THREE.Color(0xe4aa27);
  edgeMat.color.copy(gray).lerp(yellow,gold);edgeMat.emissive=new THREE.Color(0xffb52b);edgeMat.emissiveIntensity=gold*.5;
  goldLight.intensity=gold*15;
  rimLight.intensity=5*(1-gold)+gold*2;
  halo.material.color.setHex(gold>.5?0xffd16a:0x779ff3);
  halo.rotation.z=t*.3;halo2.rotation.x=t*.5;halo2.material.opacity=gold*.85;
  floorRing.material.color.setHex(gold>.5?0xffd16a:0x81a8ec);
  columns.forEach((c,i)=>{c.material.emissive.setHex(gold>.5?0xb88320:0x315da9);c.material.emissiveIntensity=.4+gold*1.2+Math.sin(t*2+i)*.15});
  beams.forEach((b,i)=>{b.rotation.z=Math.sin(t*.9+i*1.7)*.33;b.rotation.x=Math.cos(t*.8+i)*.22;b.material.color.setHex(gold>.5?0xffca67:0x78aaff);b.material.opacity=.035+gold*.07});
  particles.rotation.y=t*.055;particlesMat.color.setHex(gold>.5?0xffdf88:0x99bfff);
  camera.position.z=15-(Math.min(t,5)/5)*3+Math.max(0,t-8)*.45;
  camera.position.x=Math.sin(t*.5)*.3;
  camera.lookAt(0,.1,0);
  renderer.render(scene,camera);
  frame=requestAnimationFrame(animate);
 }
 frame=requestAnimationFrame(animate);
 return ()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();scene.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material){const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach(m=>m.dispose())}});texture.dispose();renderer.dispose();renderer.domElement.remove()};
}
