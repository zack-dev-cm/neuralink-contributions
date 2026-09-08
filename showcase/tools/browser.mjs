import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
export const ROOT=fileURLToPath(new URL('../',import.meta.url));
export async function session(width=1920,height=1080){
 const server=http.createServer((req,res)=>{let p;try{p=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400);res.end();return;}if(!p.startsWith(ROOT)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}const type={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.m4a':'audio/mp4','.glb':'model/gltf-binary'}[path.extname(p)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});fs.createReadStream(p).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:process.env.SOFTWARE_GL==='1'?['--enable-unsafe-swiftshader']:['--enable-gpu','--use-angle=gl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});return {browser,page,url:`http://127.0.0.1:${server.address().port}/`,close:async()=>{try{await browser.close();}finally{await new Promise(resolve=>server.close(resolve));}}};}catch(e){try{await browser?.close();}finally{await new Promise(resolve=>server.close(resolve));}throw e;}
}
export async function open(s,project,capture=true){await s.page.goto(s.url+`studio.html?project=${project}${capture?'&capture':''}`);await s.page.waitForFunction(()=>window.neuralFilm?.ready||window.neuralFilm?.error,null,{timeout:60000});const error=await s.page.evaluate(()=>neuralFilm.error);if(error)throw Error(error);}
