import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT,session,open} from './browser.mjs';

const results=[];
const s=await session(1280,720);
try{
 await s.page.emulateMedia({reducedMotion:'reduce'});
 assert.equal((await fetch(s.url+'%')).status,400);
 assert.equal((await fetch(s.url+'studio.html')).status,200);
 results.push({check:'Malformed URL returns 400 and server remains usable',passed:true});
 for(const project of ['sectioncheck','datarepo']){
  const foreign=project==='sectioncheck'?'**/data/datarepo.json':'**/data/{manifest.json,annotations.json,review.json,source.png,target.png,provenance.json}';
  await s.page.route(foreign,route=>route.abort());
  await open(s,project,false);
  await s.page.unroute(foreign);
  let baseline;
  for(let chapter=0;chapter<8;chapter++){
   await s.page.locator('#chapters button').nth(chapter).click();
   await s.page.getByRole('button',{name:'Inspect in 3D',exact:true}).click();
   const state=await s.page.evaluate(()=>neuralFilm.inspect());
   assert(state.manual);
   if(!baseline)baseline=state.visibleNodes;
   else assert.deepEqual(state.visibleNodes,baseline,`${project} inspection after chapter ${chapter}`);
  }
  results.push({project,check:'Complete inspection geometry restored from all eight chapters',passed:true});
 }
 await open(s,'sectioncheck',false);
 const disposals=await s.page.evaluate(async()=>{
  const T=await import('three'),geometry=T.BufferGeometry.prototype.dispose,material=T.Material.prototype.dispose;let n=0;
  T.BufferGeometry.prototype.dispose=function(){n++;return geometry.call(this);};T.Material.prototype.dispose=function(){n++;return material.call(this);};
  try{for(let i=0;i<30;i++)neuralFilm.seek(11.3+i*.05);}finally{T.BufferGeometry.prototype.dispose=geometry;T.Material.prototype.dispose=material;}
  return n;
 });
 assert.equal(disposals,0,'Landmark connectors must reuse their geometry and materials');
 results.push({check:'Projects load without foreign fixtures; landmark connectors avoid per-frame replacement',passed:true,disposals});
 await s.page.evaluate(()=>neuralFilm.seek(5));
 await s.page.getByRole('button',{name:'Play tour',exact:true}).click();
 await s.page.waitForTimeout(200);
 const before=await s.page.evaluate(()=>neuralFilm.inspect().time);
 await s.page.evaluate(async()=>{
  const until=performance.now()+1000;while(performance.now()<until){}
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 });
 const after=await s.page.evaluate(()=>neuralFilm.inspect().time);
 assert(after-before>=.9,'Muted timeline must preserve a one-second foreground stall');
 await s.page.getByRole('button',{name:'Sound off',exact:true}).click();
 await s.page.waitForFunction(()=>!document.querySelector('#music').paused&&document.querySelector('#music').currentTime>0);
 await s.page.evaluate(async()=>{
  const until=performance.now()+1000;while(performance.now()<until){}
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 });
 const sync=await s.page.evaluate(()=>({visual:neuralFilm.inspect().time,audio:document.querySelector('#music').currentTime}));
 assert(Math.abs(sync.visual-sync.audio)<.15,JSON.stringify(sync));
 await s.page.getByRole('button',{name:'Pause tour',exact:true}).click();
 const paused=await s.page.evaluate(()=>neuralFilm.inspect().time);
 await s.page.waitForTimeout(300);
 assert.equal(await s.page.evaluate(()=>neuralFilm.inspect().time),paused);
 results.push({check:'Muted and audible clocks recover from stalls; pause holds',passed:true,mutedElapsed:after-before,sync});
 await s.page.getByRole('button',{name:'Sound on',exact:true}).click();
 await s.page.getByRole('button',{name:'Sound off',exact:true}).click();
 await s.page.evaluate(()=>{document.querySelector('#music').play=()=>Promise.reject(new DOMException('Injected media failure','NotSupportedError'));});
 await s.page.getByRole('button',{name:'Play tour',exact:true}).click();
 await s.page.waitForFunction(()=>document.querySelector('#sound').textContent==='Sound unavailable');
 assert.equal(await s.page.locator('#sound').getAttribute('aria-pressed'),'false');
 assert.equal(await s.page.evaluate(()=>neuralFilm.inspect().playing),true);
 results.push({check:'Failed soundtrack start is reported while the silent tour remains available',passed:true});
}finally{await s.close();}
const dest=process.env.EVIDENCE_DIR||path.join(ROOT,'.local/check');fs.mkdirSync(dest,{recursive:true});
fs.writeFileSync(path.join(dest,'regressions.json'),JSON.stringify({passed:true,results},null,2)+'\n');
console.log(JSON.stringify({passed:true,results}));
