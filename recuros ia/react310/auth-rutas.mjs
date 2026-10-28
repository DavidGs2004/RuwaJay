import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, preview } from '../../web/node_modules/vite/dist/node/index.js';
import { chromium, expect } from '../../web/node_modules/@playwright/test/index.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '../../web');
const require = createRequire(resolve(web, 'package.json'));
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } = require('firebase/auth');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
assert(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Solo ejecutar contra emuladores.');
const projectId = 'demo-ruwajay';
const rules = await readFile(resolve(web, '../archivos varios/servicios/firestore.rules'), 'utf8');
const env = await initializeTestEnvironment({projectId,firestore:{rules}});
const app = initializeApp({projectId,apiKey:'demo-key'},'render-hooks-' + Date.now());
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', {disableWarnings:true});
const email = `render-${Date.now()}@example.test`;
const password = 'Testing-render-310';
const {user} = await createUserWithEmailAndPassword(auth,email,password);
async function seed(path,data) {
  await env.withSecurityRulesDisabled(context => context.firestore().doc(path).set(data,{merge:true}));
}
await seed('users/' + user.uid,{name:'Prueba render',email,role:'seeker',accountStatus:'active',status:'active'});
const report = [];
const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
let dev, production;
try {
  process.env.VITE_FIREBASE_EMULATORS = 'true';
  dev = await createServer({root:web,configFile:resolve(web,'vite.config.js'),server:{host:'127.0.0.1',port:5173,strictPort:true}});
  await dev.listen();
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (/order of Hooks|Rendered (?:more|fewer) hooks|#310/.test(message.text())) errors.push(message.text()); });
  await page.route('**/*', route => ['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.goto('http://localhost:5173/');
  await expect(page.getByRole('heading',{name:'Descubre casas para alquilar indefinidamente'})).toBeVisible();
  await seed('system_updates/render-310',{title:'Aviso render 310',content:'Prueba local',category:'mejora',active:true});
  await expect(page.getByRole('heading',{name:'Actualizaciones del Sistema'})).toBeVisible();
  await page.getByRole('button',{name:'Entendido',exact:true}).click();
  await page.goto('http://localhost:5173/login');
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.locator('form').getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await expect(page).toHaveURL('http://localhost:5173/');
  await expect(page.getByRole('heading',{name:'Descubre casas para alquilar indefinidamente'})).toBeVisible();
  await page.goto('http://localhost:5173/perfil');
  await expect(page.locator('main').getByText('Prueba render',{exact:true}).first()).toBeVisible();
  await seed('users/' + user.uid,{role:'admin'});
  await seed('system_updates/render-310',{title:'Aviso render actualizado'});
  await expect(page.getByRole('heading',{name:'Actualizaciones del Sistema'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Gestionar en Panel Admin'})).toBeVisible();
  await page.getByRole('button',{name:'Entendido',exact:true}).click();
  await seed('users/' + user.uid,{accountStatus:'inactive',status:'inactive'});
  await expect(page.getByRole('heading',{name:'Cuenta Inactiva'})).toBeVisible();
  await seed('users/' + user.uid,{accountStatus:'active',status:'active'});
  await expect(page.locator('main').getByText('Prueba render',{exact:true}).first()).toBeVisible();
  await page.evaluate(async () => {
    const { firebaseAuth } = await import('/src/lib/firebase.js');
    await firebaseAuth.signOut();
  });
  await expect(page).toHaveURL('http://localhost:5173/login');
  await expect(page.getByRole('button',{name:'Iniciar sesión con Google'})).toBeVisible();
  assert.deepEqual(errors, []);
  report.push({caso:'AuthProvider real: inicio, perfil, rol, inactivo, reactivacion y cierre',resultado:'correcto'});
  await page.close();
  await dev.close(); dev = null;

  production = await preview({root:web,configFile:resolve(web,'vite.config.js'),preview:{host:'127.0.0.1',port:5184,strictPort:true}});
  const built = await browser.newPage();
  built.setDefaultTimeout(15000);
  await built.route('**/*', route => ['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  const failures = [];
  built.on('pageerror', error => failures.push(error.message));
  for (const path of ['', 'explorar', 'login', 'perfil']) {
    const response = await built.goto('http://localhost:5184/ruwajay/' + path);
    assert.equal(response.status(),200);
    if (path === 'perfil') await expect(built).toHaveURL('http://localhost:5184/ruwajay/login');
    else await expect(built.locator('main')).toBeVisible();
    await built.reload();
    await expect(built.locator('main')).toBeVisible();
  }
  for (const flag of ['inactive', 'suspended']) {
    await built.goto('http://localhost:5184/ruwajay/login?' + flag + '=true');
    await expect(built).toHaveURL('http://localhost:5184/ruwajay/login');
    await built.reload();
    await expect(built.getByRole('button',{name:'Iniciar sesión con Google'})).toBeVisible();
  }
  const resources = await built.evaluate(() => [...document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(node => node.src || node.href).filter(url => new URL(url).origin === location.origin));
  for (const url of resources) {
    assert(new URL(url).pathname.startsWith('/ruwajay/assets/'));
    assert.equal((await built.request.get(url)).status(),200);
  }
  assert.deepEqual(failures, []);
  report.push({caso:'build real: /ruwajay/, explorar, login, ruta protegida, recargas, JS y CSS',resultado:'correcto',recursos:resources});
  await built.close();
} finally {
  await browser.close();
  if (dev) await dev.close();
  if (production) await new Promise(resolve => production.httpServer.close(resolve));
  await env.cleanup();
  await deleteApp(app);
  await writeFile(resolve(here,'auth-rutas.json'),JSON.stringify(report,null,2));
}
console.log(JSON.stringify(report));
