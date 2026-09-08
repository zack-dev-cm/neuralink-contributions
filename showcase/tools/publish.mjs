import fs from 'node:fs';
import path from 'node:path';

// Prepare every file before changing the published generation. A failed rename
// restores earlier files from the same-filesystem backups; backups survive a
// failed rollback so a damaged filesystem never destroys the recovery evidence.
export function publishFiles(staging,destination,names,rename=fs.renameSync){
 const transaction=fs.mkdtempSync(path.join(destination,'.publish-'));
 const fresh=path.join(transaction,'new'),backup=path.join(transaction,'previous');
 fs.mkdirSync(fresh);fs.mkdirSync(backup);
 const present=new Set(),replaced=[];
 try{
  for(const name of names){
   if(path.basename(name)!==name)throw Error('Publication requires flat filenames');
   const src=path.join(staging,name);if(!fs.statSync(src).isFile()||fs.statSync(src).size===0)throw Error('Empty publication file: '+name);
   fs.copyFileSync(src,path.join(fresh,name));
   if(fs.existsSync(path.join(destination,name))){fs.copyFileSync(path.join(destination,name),path.join(backup,name));present.add(name);}
  }
  fs.writeFileSync(path.join(transaction,'journal.json'),JSON.stringify({names,previous:[...present]}));
  for(const name of names){rename(path.join(fresh,name),path.join(destination,name));replaced.push(name);}
 }catch(error){
  const failures=[];
  for(const name of replaced.reverse())try{if(present.has(name))fs.renameSync(path.join(backup,name),path.join(destination,name));else fs.unlinkSync(path.join(destination,name));}catch(e){failures.push(String(e));}
  if(failures.length)throw Error('Publication and rollback failed; recovery retained at '+transaction+': '+failures.join('; '),{cause:error});
  fs.rmSync(transaction,{recursive:true,force:true});throw error;
 }
 fs.rmSync(transaction,{recursive:true,force:true});
}
