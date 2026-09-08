import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ROOT,session} from './browser.mjs';
const dest=process.env.EVIDENCE_DIR||path.join(ROOT,'.local/check');fs.mkdirSync(dest,{recursive:true});
const report=path.join(dest,'gallery-check.json'),results=[];
fs.writeFileSync(report,JSON.stringify({passed:false,status:'running'})+'\n');
let s;
try{
 s=await session(1280,900);await s.page.emulateMedia({reducedMotion:'reduce'});
 let release;const held=new Promise(resolve=>{release=resolve;});
 await s.page.route('**/gallery.js',async route=>{await held;await route.continue();});
 await s.page.goto(s.url+'index.html',{waitUntil:'commit'});await s.page.waitForSelector('video');
 await s.page.evaluate(()=>document.querySelectorAll('video').forEach(v=>{v.preload='auto';v.load();}));
 await s.page.waitForFunction(()=>[...document.querySelectorAll('video')].every(v=>v.readyState>=2));
 assert(await s.page.evaluate(()=>[...document.querySelectorAll('video')].every(v=>v.paused&&v.currentTime===0)));
 release();await s.page.waitForSelector('button[aria-label="Play sectioncheck preview"]');
 assert(await s.page.evaluate(()=>[...document.querySelectorAll('video')].every(v=>v.paused&&v.currentTime===0)));
 results.push({check:'Reduced-motion media stays paused before and after delayed JavaScript initialization',passed:true});
 await s.page.unroute('**/gallery.js');await s.page.emulateMedia({reducedMotion:'no-preference'});await s.page.goto(s.url+'index.html');
 for(const project of ['sectioncheck','datarepo']){
  const video=s.page.locator('#'+project+'-video');await video.scrollIntoViewIfNeeded();
  await s.page.waitForFunction(id=>{const v=document.getElementById(id);return !v.paused&&v.currentTime>.2;},project+'-video');
  await s.page.getByRole('button',{name:`Pause ${project} preview`,exact:true}).click();
  const time=await video.evaluate(v=>v.currentTime);await s.page.waitForTimeout(200);assert.equal(await video.evaluate(v=>v.currentTime),time);
  await s.page.getByRole('button',{name:`Play ${project} preview`,exact:true}).click();await s.page.waitForFunction(id=>!document.getElementById(id).paused,project+'-video');
  results.push({project,check:'Normal autoplay, manual pause and resume',passed:true});
 }
 await s.page.emulateMedia({reducedMotion:'reduce'});
 await s.page.waitForFunction(()=>[...document.querySelectorAll('video')].every(v=>v.paused));
 await s.page.setViewportSize({width:390,height:844});assert(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 fs.writeFileSync(report,JSON.stringify({passed:true,results},null,2)+'\n');console.log(JSON.stringify({passed:true,results}));
}catch(error){fs.writeFileSync(report,JSON.stringify({passed:false,status:'failed',error:error.message,results},null,2)+'\n');throw error;}finally{await s?.close();}
