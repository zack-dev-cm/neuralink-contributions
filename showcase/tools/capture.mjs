import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {publishFiles} from './publish.mjs';
import {ROOT,session,open} from './browser.mjs';
import {DURATION,TIMELINES} from '../timeline.js';
const digest=b=>createHash('sha256').update(b).digest('hex');
const run=args=>{const p=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{encoding:'utf8'});if(p.error||p.status!==0)throw Error(p.error?.message||p.stderr||'FFmpeg terminated: '+p.signal);};
const project=process.argv[2];if(!['sectioncheck','datarepo'].includes(project))throw Error('Specify sectioncheck or datarepo');
const local=path.join(ROOT,'.local');fs.mkdirSync(local,{recursive:true});
const lock=path.join(local,project+'-capture.lock');fs.mkdirSync(lock);
try{await captureLocked();}finally{fs.rmSync(lock,{recursive:true,force:true});}
async function captureLocked(){
const media=path.join(ROOT,'media'),staging=fs.mkdtempSync(path.join(local,'render-'+project+'-'));
const names=['tools/capture.mjs','tools/publish.mjs','media/score.wav','tools/capture-pixels.mjs','studio.html','studio.css','studio.js','models.js','timeline.js','icon.svg',...fs.readdirSync(path.join(ROOT,'data')).map(n=>'data/'+n),...['three.module.min.js','three.core.min.js','OrbitControls.js'].map(n=>'vendor/'+n)];
const frozen=new Map(names.map(n=>[n,fs.readFileSync(path.join(ROOT,n))]));
fs.writeFileSync(path.join(staging,'input-score.wav'),frozen.get('media/score.wav'));
const s=await session(1920,1080),errors=[];let encoder;
s.page.on('pageerror',e=>errors.push(e.message));
await s.page.route('**/*',route=>{const name=decodeURIComponent(new URL(route.request().url()).pathname).slice(1),body=frozen.get(name);if(!body)return route.abort();const type={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'}[path.extname(name)]||'application/octet-stream';return route.fulfill({status:200,body,contentType:type});});
try{
 await open(s,project);const renderer=await s.page.evaluate(()=>{const gl=neuralFilm.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});
 const film=path.join(staging,project+'-film.mp4');
 encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate','32','-i','pipe:0','-i',path.join(staging,'input-score.wav'),'-map','0:v','-map','1:a','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t',String(DURATION),'-movflags','+faststart','-metadata','title='+project+' - Inside the work','-metadata','comment=Original 3D software explanation. Synthetic data; illustrative depth. Independent project.',film],{stdio:['pipe','ignore','pipe']});
 let stderr='';encoder.stderr.on('data',b=>stderr+=b);const done=new Promise((resolve,reject)=>{encoder.once('close',c=>c===0?resolve():reject(Error(stderr)));encoder.once('error',reject);});done.catch(()=>{});encoder.stdin.on('error',()=>{});
 await s.page.evaluate(async()=>{window.comparePixels=(await import('./tools/capture-pixels.mjs')).compareReadbacks;window.readbackCanvas=new OffscreenCanvas(1920,1080);const img=document.createElement('img');img.id='capture-bitmap';img.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';document.querySelector('#scene').after(img);document.querySelector('#scene').style.visibility='hidden';});
 const frames=[],started=Date.now();
 for(let i=0;i<DURATION*32;i++){
  const frameState=await s.page.evaluate(async t=>{neuralFilm.seek(t);const gl=neuralFilm.renderer.getContext();gl.finish();if(gl.isContextLost()||gl.getError()!==gl.NO_ERROR)throw Error('WebGL frame failed at '+t);const canvas=neuralFilm.renderer.domElement;let previous='',pixels=null,second='',stable=false,attempts=0,comparison=null;const img=document.querySelector('#capture-bitmap'),ctx=window.readbackCanvas.getContext('2d',{willReadFrequently:true});for(;attempts<12;attempts++){neuralFilm.seek(t);gl.finish();second=canvas.toDataURL('image/png');img.src=second;await img.decode();ctx.drawImage(img,0,0);const next=ctx.getImageData(0,0,1920,1080).data;if(pixels){comparison=second===previous?{match:true,mean:0,tileMean:0,changedFraction:0}:window.comparePixels(pixels,next,1920,1080);if(comparison.match){stable=true;break;}}previous=second;pixels=next;}if(!stable)throw Error('Unstable canvas after 12 readbacks at '+t+': '+JSON.stringify(comparison));return {time:t,attempts:attempts+1,pixelComparison:comparison,shot:neuralFilm.inspect().shot,pixelSha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(second))),b=>b.toString(16).padStart(2,'0')).join('')};},i/32);
  const jpg=await s.page.screenshot({type:'jpeg',quality:94});if(!encoder.stdin.write(jpg))await Promise.race([once(encoder.stdin,'drain'),done.then(()=>{throw Error('Encoder ended before all frames');})]);frames.push(frameState);
  if(i%120===0)console.log(`${project}: ${i}/960 frames (${Math.round((Date.now()-started)/1000)} s)`);
 }
 encoder.stdin.end();await done;if(errors.length)throw Error(errors.join('\n'));
 run(['-i',film,'-an','-vf','scale=1280:720','-c:v','libx264','-preset','slow','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart',path.join(staging,project+'-loop.mp4')]);
 run(['-i',film,'-an','-filter_complex','[0:v]setpts=0.5*PTS,fps=12,scale=640:360:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',path.join(staging,project+'-preview.gif')]);
 run(['-ss','1.8','-i',film,'-frames:v','1','-q:v','2',path.join(staging,project+'-poster.jpg')]);
 const stamp=t=>'00:'+String(Math.floor(t/60)).padStart(2,'0')+':'+(t%60).toFixed(3).padStart(6,'0');
 fs.writeFileSync(path.join(staging,project+'.vtt'),'WEBVTT\n\n'+TIMELINES[project].map((r,i)=>`${i+1}\n${stamp(i*3.75)} --> ${stamp((i+1)*3.75)}\n${r[3]} ${r[8]}\n`).join('\n'));
 for(const [n,bytes] of frozen)if(digest(fs.readFileSync(path.join(ROOT,n)))!==digest(bytes))throw Error('Capture input changed: '+n);
 const outputs={};for(const name of [project+'-film.mp4',project+'-loop.mp4',project+'-preview.gif',project+'-poster.jpg',project+'.vtt']){const bytes=fs.readFileSync(path.join(staging,name));outputs[name]={sha256:digest(bytes),bytes:bytes.length};}
 const receipt={project,kind:'DETERMINISTIC_BROWSER_CAPTURE',width:1920,height:1080,fps:32,duration:30,frameCount:frames.length,renderer,stableCanvasReadbacks:2,pixelLimits:{mean:.01,tileMean:.5,changedFraction:.0005},frozenBrowserInputs:true,sourceSha256:Object.fromEntries([...frozen].map(([n,b])=>[n,digest(b)])),audioSha256:digest(frozen.get('media/score.wav')),outputs,frames,pageErrors:errors,scope:'Synthetic software examples. Scene motion and depth are explanatory, not research or hardware validation.'};
 fs.writeFileSync(path.join(staging,project+'-capture.json'),JSON.stringify(receipt,null,2)+'\n');publishFiles(staging,media,[...Object.keys(outputs),project+'-capture.json']);console.log(JSON.stringify({project,outputs,completed:true}));
}finally{if(encoder&&encoder.exitCode===null)encoder.kill();await s.close();}

}
