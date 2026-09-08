import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const run=(bin,args)=>{const p=spawnSync(bin,args,{encoding:'utf8',maxBuffer:2*1024*1024});if(p.error||p.status!==0)throw Error(p.error?.message||p.stderr||`${bin} terminated: ${p.signal}`);return p.stdout;};
const results=[];
for(const project of ['sectioncheck','datarepo']){
 const receipt=JSON.parse(fs.readFileSync(path.join(root,'media',project+'-capture.json')));
 assert.equal(receipt.frameCount,960);assert.equal(receipt.frames.length,960);assert.deepEqual(receipt.pageErrors,[]);
 for(const [name,expected] of Object.entries(receipt.sourceSha256))assert.equal(hash(path.join(root,name)),expected,`Source mismatch: ${name}`);
 assert.equal(receipt.audioSha256,hash(path.join(root,'media/score.wav')));
 for(const [name,expected] of Object.entries(receipt.outputs)){
  const file=path.join(root,'media',name);assert.equal(hash(file),expected.sha256);assert.equal(fs.statSync(file).size,expected.bytes);
 }
 receipt.frames.forEach((frame,i)=>{
  assert.equal(frame.time,i/32);assert(frame.attempts>=2&&frame.attempts<=12);assert(frame.pixelComparison.match);
  for(const key of ['mean','tileMean','changedFraction'])assert(frame.pixelComparison[key]<=receipt.pixelLimits[key]);
 });
 const formats=[];
 for(const [suffix,width,height,frames,duration,audio] of [['film.mp4',1920,1080,960,30,true],['loop.mp4',1280,720,960,30,false],['preview.gif',640,360,180,15,false]]){
  const file=path.join(root,'media',project+'-'+suffix);
  const probe=JSON.parse(run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]));
  const video=probe.streams.find(s=>s.codec_type==='video');assert.equal(video.width,width);assert.equal(video.height,height);assert.equal(Number(video.nb_frames),frames);assert(Math.abs(Number(probe.format.duration)-duration)<.1);
  assert.equal(probe.streams.some(s=>s.codec_type==='audio'),audio);
  if(suffix.endsWith('.mp4')){assert.equal(video.codec_name,'h264');assert.equal(video.r_frame_rate,'32/1');}
  else assert(fs.statSync(file).size<8*1024*1024,'GIF must stay below 8 MiB');
  run('ffmpeg',['-hide_banner','-v','error','-xerror','-i',file,'-f','null','-']);
  formats.push({file:path.basename(file),width,height,frames,duration:Number(probe.format.duration),audio,bytes:fs.statSync(file).size,sha256:hash(file),fullDecodePassed:true});
 }
 const modelFile=path.join(root,'models',project+'.glb'),bytes=fs.readFileSync(modelFile),metadata=JSON.parse(fs.readFileSync(path.join(root,'models',project+'.json')));
 assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);assert.equal(metadata.bytes,bytes.length);
 const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));assert.equal(gltf.meshes.length,metadata.meshes);
 assert(gltf.buffers.every(b=>!b.uri));assert((gltf.images||[]).every(image=>image.bufferView!==undefined));
 results.push({project,captureFrames:receipt.frames.length,sourceFilesChecked:Object.keys(receipt.sourceSha256).length,formats,model:{meshes:metadata.meshes,bytes:bytes.length,sha256:hash(modelFile),embeddedResources:true}});
}
const report={passed:true,verifiedAt:new Date().toISOString(),results};
if(process.env.EVIDENCE_FILE)fs.writeFileSync(process.env.EVIDENCE_FILE,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
