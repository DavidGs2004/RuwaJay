import { spawn, spawnSync } from 'node:child_process';
import { delimiter, resolve } from 'node:path';
const [services,command] = process.argv.slice(2);
if (!services || !command) throw new Error('Specify emulator services and a test command.');
// Cold starts can exceed the CLI's 10 second discovery window on Windows.
const environment = { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT || '60' };
if (environment.JAVA_HOME) environment.PATH = `${environment.JAVA_HOME}/bin${delimiter}${environment.PATH || environment.Path || ''}`;
const child = spawn(process.execPath,[resolve('node_modules/firebase-tools/lib/bin/firebase.js'),
  'emulators:exec','--only',services,'--project','demo-ruwajay',command],{stdio:'inherit',env:environment});
child.on('close',code=>{
  // On Windows Java can outlive SIGINT. Only stop direct children of this exact CLI process.
  if(process.platform==='win32' && child.pid) spawnSync('powershell.exe',['-NoProfile','-Command',
    `Get-CimInstance Win32_Process -Filter 'ParentProcessId = ${child.pid}' | Where-Object { $_.Name -eq 'java.exe' -and $_.CommandLine -like '*emulator*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`],{stdio:'ignore',windowsHide:true});
  process.exitCode=code || 0;
});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
