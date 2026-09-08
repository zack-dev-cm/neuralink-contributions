import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ROOT,session,open} from './browser.mjs';
import {publishFiles} from './publish.mjs';
const local=path.join(ROOT,'.local');fs.mkdirSync(local,{recursive:true});
const staging=fs.mkdtempSync(path.join(local,'model-export-'));
const s=await session();
try{for(const project of ['sectioncheck','datarepo']){await open(s,project);const bytes=Buffer.from(await s.page.evaluate(()=>neuralFilm.exportGLB()));assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));assert(json.meshes.length>10);const sourceFacts=await s.page.evaluate(()=>neuralFilm.inspect().facts);fs.writeFileSync(path.join(staging,project+'.glb'),bytes);fs.writeFileSync(path.join(staging,project+'.json'),JSON.stringify({format:'glTF 2.0',meshes:json.meshes.length,bytes:bytes.length,sourceFacts,units:'Illustrative display units; not manufacturing or anatomical dimensions'},null,2)+'\n');publishFiles(staging,path.join(ROOT,'models'),[project+'.glb',project+'.json']);console.log(project+': '+json.meshes.length+' meshes, '+bytes.length+' bytes');}}finally{await s.close();}
