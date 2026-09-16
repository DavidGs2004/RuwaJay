import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const viteEntry = join(root, 'node_modules', 'vite', 'bin', 'vite.js');

let backend = null;
try {
  const response = await fetch('http://127.0.0.1:8000/api/health', { signal: AbortSignal.timeout(1200) });
  if (!response.ok) throw new Error('Backend no disponible');
  console.log('Backend de RuwaJay ya está activo en http://127.0.0.1:8000');
} catch {
  backend = spawn('python', ['-m', 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'], {
    cwd: root,
    stdio: 'inherit',
  });
}
const frontend = spawn(process.execPath, [viteEntry], { cwd: root, stdio: 'inherit' });

let closing = false;
function shutdown(exitCode = 0) {
  if (closing) return;
  closing = true;
  if (backend && !backend.killed) backend.kill();
  if (!frontend.killed) frontend.kill();
  setTimeout(() => process.exit(exitCode), 150);
}

backend?.on('error', (error) => {
    console.error(`No se pudo iniciar el backend: ${error.message}`);
    shutdown(1);
  });
frontend.on('error', (error) => {
  console.error(`No se pudo iniciar Vite: ${error.message}`);
  shutdown(1);
});
backend?.on('exit', (code) => { if (!closing && code) shutdown(code); });
frontend.on('exit', (code) => shutdown(code || 0));
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
