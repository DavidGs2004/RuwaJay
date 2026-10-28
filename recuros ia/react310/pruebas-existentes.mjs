import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { writeFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
const web=resolve(here,'../../web');
const results=[];
async function run(name,args) {
  const path=resolve(here,name+'.log');
  const stream=createWriteStream(path);
  const code=await new Promise((done,reject)=>{
    const child=spawn(process.execPath,args,{cwd:web,env:process.env,stdio:['ignore','pipe','pipe']});
    child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});
    child.on('error',reject);child.on('close',code=>stream.end(()=>done(code)));
  });
  const log=await readFile(path,'utf8');
  const item={suite:name,codigo:code,resumen:log.split(/\r?\n/).filter(line=>/^[ℹ✖]| tests | passed| failed|Timed out/.test(line))};
  results.push(item);console.log(JSON.stringify(item));
}
await run('emuladores-existentes',['--test','--test-concurrency=1','tests/firestore.rules.test.js','tests/storage.rules.test.js','tests/integration.test.js','tests/supabase.backend.test.js']);
await run('browser-existente',[resolve(web,'node_modules/@playwright/test/cli.js'),'test','--config=playwright.config.js','--global-timeout=60000','--reporter=line']);
await writeFile(resolve(here,'pruebas-existentes.json'),JSON.stringify(results,null,2));
if(results.some(result=>result.codigo!==0)) process.exitCode=1;
