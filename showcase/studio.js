import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {sectionModel,datarepoModel,v} from './models.js';
import {TIMELINES,DURATION,shotAt} from './timeline.js';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search),project=params.get('project')==='datarepo'?'datarepo':'sectioncheck',capture=params.has('capture');
document.body.classList.toggle('capture',capture);
const app=window.neuralFilm={ready:false,error:null,duration:DURATION,project};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let time=0,playing=!capture&&!reduced.matches,manual=false,userCamera=false,wire=false,last=0,sound=false,audioAttempt=0;
const music=$('#music');let model,renderer,camera,controls,scene;
async function json(path){const r=await fetch(path);if(!r.ok)throw Error('Unable to load '+path);return r.json();}
async function init(){
 const verified={};let sceneScope;
 if(project==='sectioncheck'){
 const provenance=await json('data/provenance.json');
 const textureLoader=new T.TextureLoader();const files={};
 for(const [name,record] of Object.entries(provenance.sectioncheck)){
  const r=await fetch('data/'+name);if(!r.ok)throw Error('Missing fixture: '+name);const bytes=await r.arrayBuffer();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==record.sha256)throw Error('Fixture checksum mismatch: '+name);verified[name]=hash;files[name]=bytes;
 }
 const source=await textureLoader.loadAsync(URL.createObjectURL(new Blob([files['source.png']],{type:'image/png'}))),target=await textureLoader.loadAsync(URL.createObjectURL(new Blob([files['target.png']],{type:'image/png'})));
 source.colorSpace=target.colorSpace=T.SRGBColorSpace;
 const decode=name=>JSON.parse(new TextDecoder().decode(files[name]));
 const data={manifest:decode('manifest.json'),annotations:decode('annotations.json'),review:decode('review.json')};
 model=sectionModel(data,{source,target});sceneScope=provenance.display_depth;
 }else{
 const rows=await json('data/datarepo.json');model=datarepoModel(rows);sceneScope=rows.geometry_scope;
 }
 renderer=new T.WebGLRenderer({canvas:$('#scene'),antialias:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(capture?1:Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x0c1822);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 scene=new T.Scene();scene.fog=new T.Fog(0x0c1822,28,60);scene.add(model.root);
 camera=new T.PerspectiveCamera(34,1,.05,100);camera.up.set(0,0,1);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=2;controls.maxDistance=40;controls.maxPolarAngle=Math.PI*.91;
 controls.addEventListener('start',()=>{pause();userCamera=true;});controls.addEventListener('change',()=>{if(userCamera)render();});
 scene.add(new T.HemisphereLight(0xd9f6ff,0x29414d,3.1));
 const key=new T.DirectionalLight(0xfff1df,3.6);key.position.set(1,-3,10);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:30});key.shadow.normalBias=.025;scene.add(key);
 const rim=new T.DirectionalLight(0x7ff4e4,2.5);rim.position.set(-5,3,4);scene.add(rim);
 const warm=new T.DirectionalLight(0xffbb85,1.5);warm.position.set(6,4,3);scene.add(warm);
 const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0x0c1b26,roughness:.8,metalness:.15}));floor.position.z=-1.8;floor.receiveShadow=true;scene.add(floor);
 const grid=new T.GridHelper(100,100,0x365363,0x243e4f);grid.rotation.x=Math.PI/2;grid.position.z=-1.79;grid.material.transparent=true;grid.material.opacity=.12;scene.add(grid);
 $('#source-link').href=project==='sectioncheck'?'https://github.com/zack-dev-cm/sectioncheck':'https://github.com/zack-dev-cm/neuralink-contributions';
 $('#download').href=`models/${project}.glb`;document.title=(project==='sectioncheck'?'SectionCheck':'datarepo')+' — Explore the work in 3D';
 TIMELINES[project].forEach((row,i)=>{const b=document.createElement('button');b.type='button';b.textContent=String(i+1).padStart(2,'0')+' '+row[9];b.onclick=()=>{pause();manual=false;userCamera=false;$('.inspection-tools').hidden=true;seek(i*DURATION/8+.2);};$('#chapters').append(b);});
 function resize(){const w=$('#scene').clientWidth,h=$('#scene').clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();seek(time);}
 app.seek=seek;app.renderer=renderer;app.inspect=()=>({project,time,shot:shotAt(project,time).id,playing,manual,verifiedInputs:verified,facts:model.facts,visibleMeshes:countMeshes(),visibleNodes:visibleNodes(),renderCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,camera:camera.position.toArray(),sceneScope});
 app.exportGLB=async()=>{const {GLTFExporter}=await import('./vendor/GLTFExporter.js');pause();manual=true;userCamera=false;seek(0);model.root.userData={project,facts:model.facts,scope:sceneScope};const out=await new GLTFExporter().parseAsync(model.root,{binary:true,onlyVisible:true});return Array.from(new Uint8Array(out));};
 $('#play').onclick=()=>{if(playing)pause();else play();};
 $('#inspect').onclick=()=>{pause();manual=true;userCamera=false;$('.inspection-tools').hidden=false;seek(time);};
 $('#reset').onclick=()=>{userCamera=false;seek(time);};
 $('#separate').oninput=()=>{manual=true;seek(time);};
 $('#wire').onchange=()=>{wire=$('#wire').checked;seek(time);};
 $('#timeline').oninput=()=>{pause();manual=false;userCamera=false;$('.inspection-tools').hidden=true;seek(Number($('#timeline').value));};
 $('#sound').onclick=()=>{sound=!sound;audioAttempt++;$('#sound').textContent=sound?'Sound on':'Sound off';$('#sound').setAttribute('aria-pressed',String(sound));if(sound&&playing)startSound();else music.pause();};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
 reduced.addEventListener('change',e=>{if(e.matches)pause();});
 window.addEventListener('resize',resize);resize();
 await renderer.compileAsync(scene,camera);renderer.render(scene,camera);renderer.getContext().finish();
 app.ready=true;$('#loading').hidden=true;$('#play').textContent=playing?'Pause tour':'Play tour';
 requestAnimationFrame(tick);
}
function countMeshes(){let n=0;model.root.traverseVisible(o=>{if(o.isMesh)n++;});return n;}
function visibleNodes(){const nodes=[];model.root.traverseVisible(o=>nodes.push({name:o.name,type:o.type,position:o.position.toArray(),scale:o.scale.toArray(),wireframe:o.isMesh?Boolean(o.material?.wireframe):undefined}));return nodes;}
function render(){renderer.render(scene,camera);}
function seek(t){
 time=T.MathUtils.clamp(t,0,DURATION-.000001);const shot=shotAt(project,time),pose=model.update(shot.id,shot.u,manual,Number($('#separate').value));
 const w=$('#scene').clientWidth,h=$('#scene').clientHeight,narrow=w<700;
 if(!userCamera){if(!manual)pose.dir.applyAxisAngle(v(0,0,1),(shot.u-.5)*.08);const distance=pose.distance*(narrow?1.04:1);camera.position.copy(pose.focus).addScaledVector(pose.dir.normalize(),distance);camera.lookAt(pose.focus);controls.target.copy(pose.focus);}
 camera.setViewOffset(w,h,narrow?0:-w*.185,0,w,h);camera.updateProjectionMatrix();
 model.root.traverse(o=>{if(o.isMesh&&o.material&&!o.material.map)o.material.wireframe=wire;});
 $('#eyebrow').textContent=shot.eyebrow;$('#title').innerHTML=shot.title;$('#subtitle').textContent=shot.subtitle;$('#fact-value').textContent=shot.fact;$('#fact-label').textContent=shot.factLabel;
 $('#evidence-label').textContent=shot.evidenceLabel;$('#evidence-value').textContent=shot.evidence;$('#evidence-note').textContent=shot.note;
 $('#object-label').textContent=manual?'INSPECT / DRAG TO ORBIT':shot.label.toUpperCase();
 $('#scope').textContent=project==='sectioncheck'?'Synthetic 2D inputs · illustrative 3D depth':'Synthetic records · illustrative part geometry';
 $('#timeline').value=time;$('#clock').textContent='00:'+String(Math.floor(time)).padStart(2,'0')+' / 00:30';
 $('#film-progress i').style.width=(time/DURATION*100)+'%';
 [...$('#chapters').children].forEach((b,i)=>{b.classList.toggle('active',i===shot.index);b.setAttribute('aria-current',i===shot.index?'step':'false');});
 render();return {project,time,shot:shot.id,visibleMeshes:countMeshes()};
}
function pause(){playing=false;audioAttempt++;music.pause();$('#play').textContent='Play tour';}
async function startSound(){const attempt=++audioAttempt;music.currentTime=time;try{await music.play();}catch{if(attempt!==audioAttempt||!sound||!playing)return;sound=false;$('#sound').textContent='Sound unavailable';$('#sound').setAttribute('aria-pressed','false');}}
function play(){manual=false;userCamera=false;$('.inspection-tools').hidden=true;playing=true;last=0;$('#play').textContent='Pause tour';if(sound)startSound();}
function tick(now){if(playing){if(sound&&!music.paused)seek(music.currentTime%DURATION);else if(last)seek((time+(now-last)/1000)%DURATION);last=now;}else last=0;requestAnimationFrame(tick);}
init().catch(error=>{app.error=error.message;$('#loading').textContent='The scene could not load. '+error.message+' Reload this page to try again.';console.error(error);});
