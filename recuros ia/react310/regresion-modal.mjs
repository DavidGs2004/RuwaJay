import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, build, preview } from '../../web/node_modules/vite/dist/node/index.js';
import { chromium, expect } from '../../web/node_modules/@playwright/test/index.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '../../web');
const modal = resolve(web, 'src/components/ui/SystemUpdatesModal.jsx').replaceAll('\\', '/');
const broken = resolve(web, 'src/components/ui/__regresion_310__.jsx').replaceAll('\\', '/');
const original = await readFile(modal, 'utf8');
const state = "  const [selectedCategory, setSelectedCategory] = useState('todas');";
assert(original.includes(state));
const historical = original.replace(state, '').replace('  if (!isOpen) return null;', `  if (!isOpen) return null;\n${state}`);
const report = [];

const auth = `import { createContext, useContext } from 'react';
export const AuditAuth = createContext({isAdmin:false,user:null});
export function useAuth() {return useContext(AuditAuth);}`;
const service = `export function subscribeToSystemUpdates(callback) {
  const timer = setTimeout(() => callback([{id:'async',category:'mejora',title:'Actualización recibida',content:'Datos diferidos',active:true}]), 25);
  return () => clearTimeout(timer);
}`;
const harness = `import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {AuditAuth} from 'react310:auth';
import FixedModal from '/src/components/ui/SystemUpdatesModal.jsx';
import BrokenModal from 'react310:broken';
const sample = [{id:'notice',category:'alerta',title:'Aviso de prueba',content:'Mensaje de prueba',active:true}];
window.hookErrors=[];
class Boundary extends React.Component {
  state={error:null};
  static getDerivedStateFromError(error) {return {error:error.message};}
  componentDidCatch(error) {window.hookErrors.push(error.message);}
  render() {return this.state.error ? React.createElement('p',{'data-testid':'error'},this.state.error) : this.props.children;}
}
function Harness() {
  const [open,setOpen]=useState(false);
  const [user,setUser]=useState(null);
  const [provided,setProvided]=useState(true);
  window.modalControls={setOpen,setUser,setProvided};
  const Component = new URLSearchParams(location.search).has('broken') ? BrokenModal : FixedModal;
  return React.createElement(AuditAuth.Provider,{value:{user,isAdmin:user?.role==='admin'}},
    React.createElement(MemoryRouter,null,React.createElement(Boundary,null,
      React.createElement(Component,{isOpen:open,onClose:()=>setOpen(false),updates:provided?sample:undefined,loading:provided?false:undefined}))));
}
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(Harness)));`;

function fixturePlugin() {
  return {
    name: 'regresion-modal-310', enforce: 'pre',
    resolveId(id, importer) {
      if (id === '/__react310_harness.js') return '\0react310:harness';
      if (id === 'react310:broken' || id.replaceAll('\\', '/') === broken || id === '/src/components/ui/__regresion_310__.jsx') return broken;
      if (id === 'react310:auth' || ((importer === modal || importer === broken) && id.includes('context/AuthContext'))) return '\0react310:auth';
      if ((importer === modal || importer === broken) && id.includes('lib/adminService')) return '\0react310:admin';
    },
    load(id) {
      if (id === '\0react310:harness') return harness;
      if (id === '\0react310:auth') return auth;
      if (id === '\0react310:admin') return service;
      if (id === broken) return historical;
    },
    transformIndexHtml: {
      order: 'pre',
      handler() {return '<!doctype html><html><body><div id="root"></div><script type="module" src="/__react310_harness.js"></script></body></html>';},
    },
  };
}

const executablePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ executablePath, headless: true });
async function check(url, mode) {
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  try {
    // La versión publicada cambia la cantidad de Hooks exactamente al abrirse.
    await page.goto(url + '?broken=1');
    await page.waitForFunction(() => Boolean(window.modalControls));
    await page.evaluate(() => window.modalControls.setOpen(true));
    await expect(page.getByTestId('error')).toContainText(mode === 'produccion' ? '#310' : 'Rendered more hooks');
    report.push({ modo: mode, caso: 'version-publicada-reproducida', resultado: 'error esperado #310' });

    await page.goto(url);
    await page.waitForFunction(() => Boolean(window.modalControls));
    await page.evaluate(() => window.modalControls.setOpen(true));
    await expect(page.getByRole('heading', { name: 'Aviso de prueba' })).toBeVisible();
    await page.getByRole('button', { name: 'Alertas', exact: true }).click();
    await page.getByRole('button', { name: 'Entendido', exact: true }).click();
    await page.evaluate(() => window.modalControls.setUser({id:'fixture',role:'admin'}));
    await page.evaluate(() => window.modalControls.setOpen(true));
    await expect(page.getByRole('link', { name: 'Gestionar en Panel Admin' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Aviso de prueba' })).toBeVisible();
    await page.getByRole('button', { name: 'Entendido', exact: true }).click();
    await page.evaluate(() => {window.modalControls.setUser(null);window.modalControls.setProvided(false);});
    await page.evaluate(() => window.modalControls.setOpen(true));
    await page.getByRole('button', { name: 'Todas', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Actualización recibida' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Gestionar en Panel Admin' })).toHaveCount(0);
    for (let i=0; i<4; i++) {
      await page.getByRole('button', { name: 'Entendido', exact: true }).click();
      await page.evaluate(() => window.modalControls.setOpen(true));
      await expect(page.getByRole('heading', { name: 'Actualización recibida' })).toBeVisible();
    }
    assert.deepEqual(await page.evaluate(() => window.hookErrors), []);
    report.push({ modo: mode, caso: 'fuente-local-apertura-cierre-auth-datos-diferidos', resultado: 'correcto' });
  } finally { await page.close(); }
}

let dev, production;
try {
  dev = await createServer({root:web,configFile:resolve(web,'vite.config.js'),plugins:[fixturePlugin()],server:{host:'127.0.0.1',port:5181,strictPort:true}});
  await dev.listen();
  await check('http://127.0.0.1:5181/', 'desarrollo');
  await dev.close(); dev = null;
  // createServer establece NODE_ENV=development; el segundo caso debe usar React minificado.
  process.env.NODE_ENV = 'production';
  await build({root:web,configFile:resolve(web,'vite.config.js'),plugins:[fixturePlugin()],build:{outDir:resolve(here,'harness-dist'),emptyOutDir:true}});
  production = await preview({root:web,configFile:resolve(web,'vite.config.js'),build:{outDir:resolve(here,'harness-dist')},preview:{host:'127.0.0.1',port:5182,strictPort:true}});
  await check('http://127.0.0.1:5182/ruwajay/', 'produccion');
} finally {
  await browser.close();
  if (dev) await dev.close();
  if (production) await new Promise(resolve => production.httpServer.close(resolve));
  await mkdir(here,{recursive:true});
  await writeFile(resolve(here,'regresion-modal.json'), JSON.stringify(report,null,2));
}
console.log(JSON.stringify(report));
