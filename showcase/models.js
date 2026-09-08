import * as T from 'three';
export const C={teal:0x75e2cf,amber:0xffc184,ink:0x122b39,blue:0x96b9d2,steel:0xa5b7bc,rose:0xef927c};
const mat=(color,metalness=.15,roughness=.4)=>new T.MeshStandardMaterial({color,metalness,roughness});
export const v=(x,y,z)=>new T.Vector3(x,y,z);
export const smooth=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
function mesh(g,m,name){const o=new T.Mesh(g,m);o.name=name;o.castShadow=true;o.receiveShadow=true;return o;}
function box(w,h,d,color,name){return mesh(new T.BoxGeometry(w,h,d),mat(color),name);}
function cylinder(r1,r2,h,color,segments=64){const m=mesh(new T.CylinderGeometry(r1,r2,h,segments),mat(color,.6,.27),'cylinder');m.rotation.x=Math.PI/2;return m;}
function line(points,color,r=.015){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),64,r,8,false),new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.35,roughness:.4}),'connection');}
function label(text,color='#9cc4cc',width=2.8){const c=document.createElement('canvas');c.width=768;c.height=128;const x=c.getContext('2d');x.fillStyle=color;x.font='500 36px monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(text,384,64);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const o=mesh(new T.PlaneGeometry(width,width/6),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:T.DoubleSide}),'label: '+text);o.castShadow=false;return o;}
function frame(w,h,color){const group=new T.Group();for(const [x,y,a,b] of [[0,h/2,w,.035],[0,-h/2,w,.035],[-w/2,0,.035,h],[w/2,0,.035,h]]){const m=box(a,b,.035,color,'frame');m.position.set(x,y,.03);group.add(m);}return group;}
function annShape(rings,scale=.012){const shape=new T.Shape();rings.forEach((ring,j)=>{const path=j?new T.Path():shape;ring.forEach(([x,y],i)=>path[i?'lineTo':'moveTo']((x-255.5)*scale,(255.5-y)*scale));path.closePath();if(j)shape.holes.push(path);});return shape;}
function annotations(data,color,z=.055){const root=new T.Group();for(const f of data.features){const parts=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const [i,rings] of parts.entries()){const shape=annShape(rings);const o=mesh(new T.ExtrudeGeometry(shape,{depth:z,bevelEnabled:false,steps:1}),mat(color,.25,.32),`${f.id}/part-${i}`);o.userData={sourceFeature:f.id,sourceRings:rings,extrusion:'illustrative'};root.add(o);}}return root;}
function panel(texture,color,name){const root=new T.Group();root.name=name;const base=box(6.35,6.35,.075,0x1e3946,'slide carrier');base.position.z=-.07;root.add(base);const image=mesh(new T.PlaneGeometry(6.144,6.144),new T.MeshStandardMaterial({map:texture,roughness:.7,metalness:0,side:T.DoubleSide}),'original synthetic raster');image.castShadow=false;root.add(image,frame(6.36,6.36,color));const tag=label(name,color===C.teal?'#9eecdc':'#f7c990',4);tag.position.set(0,-3.43,.02);root.add(tag);return root;}
export function sectionModel(data,textures){
 const root=new T.Group();root.name='SectionCheck — synthetic 2D geometry in illustrative 3D';
 const source=panel(textures.source,C.teal,'SOURCE / 512 × 512'),target=panel(textures.target,C.amber,'TARGET / 512 × 512');
 const sourceROI=annotations(data.annotations,C.teal,.065),targetROI=annotations(data.annotations,C.amber,.065);
 const hole=annotations({features:[data.annotations.features[0]]},C.teal,.14);hole.name='ROI macro / exact polygon and excluded hole';
 const multi=annotations({features:[data.annotations.features[1]]},C.amber,.09);multi.name='Two separate regions';
 source.add(sourceROI);sourceROI.position.z=.025;target.add(targetROI);targetROI.position.set(.48,-.288,.025);
 const points=new T.Group();points.name='Declared landmark correspondences';
 const markers=[];
 for(const [i,l] of data.manifest.landmarks.entries()){
  const a=v((l.source_level0_xy[0]-255.5)*.012,(255.5-l.source_level0_xy[1])*.012,0),b=v((l.target_level0_xy[0]-255.5)*.012,(255.5-l.target_level0_xy[1])*.012,0);
  const g=new T.Group();g.name=l.id;
  for(const [p,color] of [[a,C.teal],[b,C.amber]]){const dot=mesh(new T.SphereGeometry(.07,20,12),mat(color),'landmark');dot.position.copy(p);g.add(dot);}
  const ltext=label(String(i+1),'#ffffff',.45);g.add(ltext);points.add(g);markers.push({g,a,b,ltext,line:null});
 }
 const warning=new T.Group();warning.name='Transformed source support outside target';
 const right=box(.48,6.144,.02,C.rose,'right overflow');right.position.set(3.072+.24,-.288,.14);
 const bottom=box(5.664,.288,.02,C.rose,'bottom overflow');bottom.position.set(.24,-3.072-.144,.14);warning.add(right,bottom);
 const bindings=new T.Group();bindings.name='Input bindings';
 const bindNames=['IMAGE HASHES','ROI JSON','POLICY','ENGINE','REVIEW'];
 for(let i=0;i<5;i++){const x=(i-2)*1.45;const tile=box(1.24,1.24,.1,i===4?C.teal:C.ink,bindNames[i]);tile.position.set(x,-4.25,.2+i*.09);const title=label(bindNames[i],i===4?'#152c33':'#accec9',1.14);title.position.copy(tile.position).add(v(0,0,.06));bindings.add(tile,title);if(i<4)bindings.add(line([v(x,-4.25,.24),v(x+.7,-4.25,.24),v(x+1.45,-4.25,.24)],C.teal,.018));}
 root.add(target,source,points,warning,bindings,hole,multi);
 const geometryFacts={inputDimensions:[512,512],transform:data.manifest.transform.matrix,roiAreas:data.review.source_annotations.map(x=>x.area_pixels_squared),holes:1,parts:3,sourceStatus:data.review.status,exportAvailable:data.review.export_available};
 function update(shot,u,manual=false,separation=.5){
  if(manual){shot='layers';u=.5;}
  const s=smooth(u);source.visible=target.visible=true;hole.visible=multi.visible=points.visible=warning.visible=bindings.visible=false;
  sourceROI.visible=targetROI.visible=true;source.position.set(-.6,0,1.3);target.position.set(.45,.1,-.2);
  source.children[0].visible=source.children[1].visible=true;
  let focus=v(0,0,.4),distance=17.5,dir=v(1.1,-1.3,1.6);
  if(['layers','resolve'].includes(shot)){source.position.set(-.9+.2*s,.25,1.0+.4*Math.sin(Math.PI*u));target.position.set(.8,-.25,-.4);dir=v(.85+.2*u,-1.2,1.45);}
  if(shot==='transform'){source.position.set(.48*s,-.288*s,.95*(1-s)+.16);target.position.set(0,0,0);dir=v(.6,-.9,2.2);}
  if(shot==='holes'){source.visible=target.visible=false;hole.visible=multi.visible=true;hole.position.z=.35;multi.position.z=.1;focus=v(-1.3,.65,.15);distance=7.0;dir=v(.6,-1.4,2.3);}
  if(shot==='landmarks'){source.position.set(0,0,1.45);target.position.set(0,0,-.25);points.visible=true;source.children[0].visible=source.children[1].visible=false;dir=v(.6,-1.25,1.8);
   for(const m of markers){m.g.children[0].position.copy(m.a).add(source.position).add(v(0,0,.1));m.g.children[1].position.copy(m.b).add(target.position).add(v(0,0,.1));m.ltext.position.copy(m.g.children[0].position).add(v(.18,.15,.05));if(!m.line){const a=m.g.children[0].position,b=m.g.children[1].position;m.line=line([a,a.clone().lerp(b,.5).add(v(.08,0,.02)),b],C.teal,.012);m.g.add(m.line);}}
  }
  if(shot==='crop'){source.position.set(.48,-.288,.13);target.position.set(0,0,-.05);source.visible=false;warning.visible=true;const outline=sourceROI;outline.visible=true;focus=v(.25,-.15,0);dir=v(.2,-.4,2.5);distance=18;}
  if(shot==='decision'){source.position.set(-.75,0,1.5);target.position.set(.65,0,-.35);bindings.visible=true;distance=17.8;focus=v(0,-.55,.4);}
  if(shot==='bindings'){source.position.set(-.35,0,1.55);target.position.set(.35,0,-.3);bindings.visible=true;distance=17.3;focus=v(0,-.8,.3);dir=v(.5,-1.45,1.8);}
  if(manual){source.visible=target.visible=true;hole.visible=multi.visible=points.visible=warning.visible=bindings.visible=false;source.position.set(-.4,0,.18+separation*2.4);target.position.set(.4,0,-.25);distance=17;focus=v(0,0,.5);}
  root.updateMatrixWorld(true);return {focus,distance,dir,facts:geometryFacts};
 }
 return {root,update,facts:geometryFacts};
}
function washer(outer=.43,inner=.23,depth=.1,color=C.steel,hex=false){const shape=new T.Shape();if(hex){for(let i=0;i<=6;i++){const a=i/6*Math.PI*2;shape[i?'lineTo':'moveTo'](Math.cos(a)*outer,Math.sin(a)*outer);}}else shape.absarc(0,0,outer,0,2*Math.PI,false);const hole=new T.Path();hole.absarc(0,0,inner,0,2*Math.PI,true);shape.holes.push(hole);return mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.015,bevelThickness:.015,curveSegments:48}),mat(color,.6,.27),hex?'hex nut':'washer');}
function bolt(){const g=new T.Group();g.name='Bolt / illustrative dimensions';const shaft=cylinder(.2,.2,1.1,C.steel);shaft.position.z=.55;const head=cylinder(.36,.36,.25,C.steel,6);head.position.z=1.24;g.add(shaft,head);const pts=[];for(let i=0;i<=800;i++){const a=i/800*Math.PI*2*12;pts.push(v(Math.cos(a)*.208,Math.sin(a)*.208,.08+i/800*1.03));}g.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),768,.025,8,false),mat(C.steel,.6,.27),'continuous helical thread')); const slot=box(.4,.06,.015,C.ink,'head marking');slot.position.z=1.375;g.add(slot);return g;}
function bracket(){const g=new T.Group();g.name='Bracket / illustrative dimensions';const s=new T.Shape();s.moveTo(-.55,-.45);s.lineTo(.55,-.45);s.lineTo(.55,.45);s.lineTo(-.55,.45);s.closePath();for(const x of [-.29,.29]){const h=new T.Path();h.absarc(x,0,.12,0,Math.PI*2,true);s.holes.push(h);}const m=mesh(new T.ExtrudeGeometry(s,{depth:.09,bevelEnabled:true,bevelSegments:2,bevelSize:.025,bevelThickness:.02}),mat(C.steel,.65,.28),'bracket base with holes');g.add(m);const back=m.clone();back.rotation.x=Math.PI/2;back.position.set(0,.44,.51);g.add(back);return g;}
export function datarepoModel(data){
 const root=new T.Group();root.name='datarepo / source-linked query explanation';
 const parts=new T.Group(),connections=new T.Group(),nulls=new T.Group(),packages=new T.Group();root.add(parts,connections,nulls,packages);
 const shapes=[bolt(),washer(.48,.23,.32,C.steel,true),washer(),bracket()],carriers=[],originals=[];
 for(let i=0;i<4;i++){const group=new T.Group();group.name=data.parts[i].name+' / row '+(i+1);group.userData={sourceRecord:data.parts[i],dimensions:'illustrative'};const body=shapes[i];body.position.z=.12;const platform=box(1.42,1.52,.12,C.ink,'record');const rim=frame(1.42,1.52,i%2?C.amber:C.teal);const title=label(`0${i+1} / ${data.parts[i].name.toUpperCase()}`,i%2?'#ffce96':'#9ceddf',1.55);title.position.set(0,-.98,.02);group.add(body,platform,rim,title);group.position.set((i-1.5)*1.9,0,0);originals.push(group.position.clone());parts.add(group);carriers.push(group);}
 const suppliers=[];
 for(let i=0;i<2;i++){const g=new T.Group();g.name='Supplier '+(i?'B':'A');const x=(i?1:-1)*2.1;g.position.set(x,2.7,-.12);const plate=box(2.0,1.0,.14,i?C.teal:C.amber,'supplier record');const title=label(i?'20 / SUPPLIER B':'10 / SUPPLIER A','#152c33',1.8);title.position.z=.085;g.add(plate,title);connections.add(g);suppliers.push(g);}
 for(let i=0;i<3;i++){const start=originals[i].clone().add(v(0,.76,.12)),end=suppliers[data.parts[i].supplier===20?1:0].position.clone().add(v(0,-.55,.2));connections.add(line([start,start.clone().add(v(0,.6,.05)),end.clone().add(v(0,-.65,.1)),end],data.parts[i].supplier===20?C.teal:C.amber,.03));}
 const packets=[];
 for(let i=0;i<3;i++){const p=mesh(new T.SphereGeometry(.085,20,12),mat(i===1?C.amber:C.teal),'illustrative join tracer');connections.add(p);packets.push(p);}
 const nullRows=[];
 for(let i=0;i<4;i++){const g=new T.Group();g.name=`row ${i+1}: ${data.null_fixture[i].x??'NULL'}`;g.position.set((i-1.5)*1.8,0,0);const deck=box(1.3,1.45,.13,C.ink,'row record');g.add(deck,frame(1.3,1.45,i%2?C.blue:C.teal));const o=i%2?box(.64,.64,.64,C.blue,'numeric value'):washer(.4,.25,.14,C.teal);o.position.z=.27;g.add(o);const text=label(i%2?String(data.null_fixture[i].x):'NULL',i%2?'#b1c8d8':'#9ef1db',1.2);text.position.set(0,-.85,.08);g.add(text);const id=label('ROW '+(i+1),'#819fae',1.1);id.position.set(0,.9,.05);g.add(id);nulls.add(g);nullRows.push(g);}
 const gate=frame(7.7,2.6,C.teal);gate.position.set(0,-2.1,.16);nulls.add(gate);const gateLabel=label('WHERE x IS NULL','#a9f1de',4.6);gateLabel.position.set(0,-3.65,.18);nulls.add(gateLabel);
 for(let i=0;i<2;i++){const g=new T.Group();g.name='Python '+(i?'3.12':'3.10')+' installed-wheel illustration';g.position.set((i?1:-1)*1.8,0,.25);const w=washer(.85,.35,.45,i?C.teal:C.amber);g.add(w);const tag=label(i?'PYTHON 3.12':'PYTHON 3.10','#d7e7e3',2.1);tag.position.set(0,-1.35,.1);g.add(tag);packages.add(g);}
 const facts={selectedPartIds:data.selected_part_ids,join:data.recorded_join_result,nullRows:data.recorded_null_result,nonNullRows:data.recorded_not_null_result,geometry:'Original illustrative part models, arbitrary dimensions'};
 function update(shot,u,manual=false,separation=.4){
  if(manual){shot='parts';u=.5;}
  const s=smooth(u);parts.visible=true;connections.visible=nulls.visible=packages.visible=false;
  let focus=v(0,.15,.5),distance=14,dir=v(.6,-1.65,1.65);
  for(let i=0;i<4;i++){const g=carriers[i];g.visible=true;g.position.copy(originals[i]);g.scale.setScalar(1);shapes[i].rotation.z=(i%2?-1:1)*(.14+.16*s);shapes[i].position.z=.14+.07*Math.sin(u*Math.PI*2+i);}
  if(shot==='parts'||shot==='resolve'){connections.visible=true;focus=v(0,.55,.3);distance=15.8;dir=v(.75-.25*s,-1.6,1.6);}
  if(shot==='detail'){for(let i=0;i<4;i++){carriers[i].position.x=(i-1.5)*1.55;shapes[i].position.z=.25+(i===0?.3*s:.15*s);}distance=12.8;focus=v(-.6,0,.4);dir=v(.25,-1.5,1.4);}
  if(shot==='filter'||shot==='join'){connections.visible=shot==='join';carriers[3].position.set(2.85,1.4*s,-.65*s);carriers[3].scale.setScalar(1-.2*s);if(shot==='join'){carriers[3].visible=false;focus=v(0,.8,.3);distance=15.8;}}
  if(shot==='nulls'||shot==='checks'){parts.visible=false;nulls.visible=true;focus=v(0,-.8,.3);distance=14.7;for(let i=0;i<4;i++){nullRows[i].position.set((i-1.5)*1.8,i%2?0:-2.0*(shot==='checks'?1:s),i%2?-.18:.12);}}
  if(shot==='wheels'){parts.visible=false;packages.visible=true;distance=12;focus=v(0,0,.3);for(let i=0;i<2;i++){packages.children[i].rotation.z=(i?1:-1)*.15*s;packages.children[i].position.z=.25+.12*Math.sin(u*Math.PI*2+i);}}
  for(let i=0;i<3;i++){const start=originals[i].clone().add(v(0,.76,.12)),end=suppliers[i===1?0:1].position.clone().add(v(0,-.55,.2));const curve=new T.CatmullRomCurve3([start,start.clone().add(v(0,.6,.05)),end.clone().add(v(0,-.65,.1)),end]);packets[i].position.copy(curve.getPoint((u*2+i*.3)%1));}
  if(manual){parts.visible=connections.visible=true;nulls.visible=packages.visible=false;for(let i=0;i<4;i++){carriers[i].visible=true;carriers[i].position.copy(originals[i]);shapes[i].position.z=.15+separation*1.3;}distance=16;focus=v(0,.6,.5);}
  root.updateMatrixWorld(true);return {focus,distance,dir,facts};
 }
 return {root,update,facts};
}
