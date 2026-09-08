import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ROOT,session,open} from './browser.mjs';
const dest=process.env.EVIDENCE_DIR||path.join(ROOT,'.local/check');fs.mkdirSync(dest,{recursive:true});
const startedAt=new Date().toISOString(),runId=startedAt.replace(/[^0-9]/g,'')+'-'+process.pid;
const captures=path.join(dest,runId);fs.mkdirSync(captures);
const report=path.join(dest,'browser-check.json');
fs.writeFileSync(report,JSON.stringify({passed:false,status:'running',startedAt,runId})+'\n');
const results=[];
try{
for(const project of ['sectioncheck','datarepo']){
 const s=await session();const errors=[];s.page.on('pageerror',e=>errors.push(e.message));
 try{
  await open(s,project);
  const shots=[];
  for(let i=0;i<8;i++){const state=await s.page.evaluate(t=>{neuralFilm.seek(t);neuralFilm.renderer.getContext().finish();return neuralFilm.inspect();},i*3.75+1.8);assert(state.visibleMeshes>=3);assert(state.triangles>20);shots.push(state);await s.page.screenshot({path:path.join(captures,`${project}-${i}.jpg`),type:'jpeg',quality:90});}
  if(project==='sectioncheck'){assert.deepEqual(shots[0].facts.roiAreas,[2700,3775]);assert.deepEqual(shots[0].facts.transform,[[1,0,40],[0,1,24],[0,0,1]]);assert.equal(shots[0].facts.exportAvailable,false);assert.equal(shots[0].facts.sourceStatus,'decision_required');}
  else{assert.deepEqual(shots[0].facts.nullRows,[1,3]);assert.deepEqual(shots[0].facts.join.map(r=>r.supplier_name),['Supplier B','Supplier A','Supplier B']);}
  await s.page.setViewportSize({width:390,height:844});await open(s,project,false);await s.page.getByRole('button',{name:'Pause tour',exact:true}).click();
  await s.page.getByRole('button',{name:'Inspect in 3D',exact:true}).click();
  await s.page.locator('#separate').press('Home');
  const compact=await s.page.evaluate(()=>neuralFilm.inspect().visibleNodes.map(n=>n.position));
  await s.page.locator('#separate').press('End');assert.equal(await s.page.locator('#separate').inputValue(),'1');
  const separated=await s.page.evaluate(()=>neuralFilm.inspect().visibleNodes.map(n=>n.position));assert.notDeepEqual(separated,compact);
  await s.page.getByLabel('Wireframe',{exact:true}).check();assert((await s.page.evaluate(()=>neuralFilm.inspect().visibleNodes.filter(n=>n.wireframe).length))>0);
  await s.page.getByLabel('Wireframe',{exact:true}).uncheck();assert.equal(await s.page.evaluate(()=>neuralFilm.inspect().visibleNodes.filter(n=>n.wireframe).length),0);
  await s.page.screenshot({path:path.join(captures,`${project}-mobile.png`)});
  const mobile=await s.page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,state:neuralFilm.inspect()}));assert(mobile.scroll<=mobile.width);assert(mobile.state.manual);
  await s.page.emulateMedia({reducedMotion:'reduce'});await open(s,project,false);assert.equal(await s.page.evaluate(()=>neuralFilm.inspect().playing),false);
  assert.deepEqual(errors,[]);results.push({project,shots,mobile,pageErrors:errors});
 }finally{await s.close();}
}
fs.writeFileSync(report,JSON.stringify({passed:true,startedAt,runId,results},null,2));console.log(JSON.stringify({passed:true,projects:results.length,evidence:captures}));
}catch(error){fs.writeFileSync(report,JSON.stringify({passed:false,status:'failed',startedAt,runId,error:error.message,results},null,2));throw error;}
