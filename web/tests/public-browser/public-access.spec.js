import { test, expect } from '@playwright/test';

// Exercise the real routes and login UI with an isolated auth fixture.
// No real Google accounts, tokens, popups, or remote services are used.
test.beforeEach(async ({ page }) => {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname.endsWith('/src/context/AuthContext.jsx')) {
      return route.fulfill({ contentType: 'application/javascript', body: `
        export { AVATAR_OPTIONS } from '/ruwajay/src/data/avatars.js';
        export function AuthProvider({ children }) { return children; }
        export function resolveUserStatus() { return 'active'; }
        export function useAuth() { return {
          user: window.__testUser || null, isInitializing: false, isLoading: false, isPostAuthLoading: false,
          loginWithGoogle: async () => {
            throw Object.assign(new Error('Simulated Google failure'), { code: window.__googleError });
          },
        }; }
      ` });
    }
    return route.continue();
  });
});

test('light appearance stays permanent when the OS and saved preference are dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => localStorage.setItem('ruwajay_theme', 'dark'));
  await page.goto('./');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
  await expect(page.getByRole('button', { name: /modo oscuro|modo claro/i })).toHaveCount(0);
});

test('the center publish action opens verification for an active unverified account', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { window.__testUser = { id: 'fixture-user', uid: 'fixture-user', name: 'Usuario', role: 'seeker', accountStatus: 'active' }; });
  await page.goto('./');
  const action = page.getByRole('link', { name: 'Publicar vivienda', exact: true });
  await expect(action).toBeVisible();
  const bounds = await action.boundingBox();
  expect(Math.abs(bounds.x + bounds.width / 2 - 195)).toBeLessThan(8);
  await action.click();
  await expect(page).toHaveURL(/\/ruwajay\/publicar$/);
  await expect(page.getByRole('heading', { name: 'Verificación de Casero Requerida' })).toBeVisible();
  await expect(page.getByText('Completar verificación en mi perfil', { exact: true })).toBeVisible();
});

test('mobile hero photography fills its container without embedded banner text',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('./');
  const photo=page.getByAltText('Hogar en Guatemala').first();
  await expect(photo).toBeVisible();
  const bounds=await photo.boundingBox();
  expect(bounds.height).toBeGreaterThanOrEqual(300);
  await expect(photo).toHaveAttribute('src',/Casas\/hero-banner-new\.jpg$/);
});

test('the publish action is hidden for suspended accounts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { window.__testUser = { id: 'fixture-user', role: 'owner', suspended: true }; });
  await page.goto('./');
  await expect(page.getByRole('link', { name: 'Publicar vivienda', exact: true })).toHaveCount(0);
});

test('the VPS entry opens the home for guests, including after reload', async ({ page }) => {
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto('./');
  await expect(page).toHaveURL(/\/ruwajay\/$/);
  await expect(page.getByRole('heading', { name: 'Descubre casas para alquilar indefinidamente' })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/ruwajay\/$/);
  await expect(page.locator('header a[href="/ruwajay/login"]').first()).toBeVisible();
  expect(failures).toEqual([]);
});

test('private pages still require login under the VPS subdirectory', async ({ page }) => {
  for (const path of ['perfil', 'chat', 'publicar', 'publicar/example']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/ruwajay\/login$/);
    await expect(page.getByRole('button', { name: 'Iniciar sesión con Google' })).toBeVisible();
  }
});

test('login preserves the destination of a visit notification', async ({ page }) => {
  await page.goto('perfil?tab=visitas');
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => history.state.usr.from)).toBe('/perfil?tab=visitas');
});

async function catalogFixture(page, properties) {
  await page.route('**/src/lib/propertyService.js', route => route.fulfill({ contentType:'application/javascript', body:`
    export * from '/ruwajay/src/lib/propertyService.js?actual=1';
    export function subscribeToProperties(onChange) { onChange(${JSON.stringify(properties)}); return () => {}; }
  ` }));
}

test('empty catalog and missing demo IDs never substitute fictional listings',async({page})=>{
  await catalogFixture(page,[]);
  await page.goto('explorar');
  await expect(page.getByText('0 viviendas encontradas',{exact:true})).toBeVisible();
  await expect(page.locator('article')).toHaveCount(0);
  await page.goto('propiedad/prop-1');
  await expect(page.getByText('Esta vivienda no existe o fue eliminada.')).toBeVisible();
});

test('reserved listings keep their status and the mobile comparison traps focus',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});
  const fixtures=[1,2].map(id=>({id:'qa-house-'+id,title:'Vivienda real '+id,price:2500+id,deposit:0,status:'reservada',images:[],address:{approximate:'Guatemala'},bedrooms:2,bathrooms:1,area:60}));
  await catalogFixture(page,fixtures);
  await page.goto('explorar');
  await expect(page.getByText('Apartada / En cita',{exact:true})).toHaveCount(2);
  const compare=page.getByRole('button',{name:'Agregar al comparador',exact:true});
  await compare.first().click();await compare.last().click();
  await page.getByRole('button',{name:'Comparar (2)',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Comparar viviendas',exact:true});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('row').filter({hasText:'Depósito en garantía'})).toContainText('Q0');
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(element=>element.contains(document.activeElement))).toBe(true);
  await page.screenshot({path:testInfo.outputPath('comparador-mobile.png'),animations:'disabled'});
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Comparar (2)',exact:true})).toBeFocused();
});

test('rental calculator fits mobile and closes with Escape',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});
  await catalogFixture(page,[]);
  await page.goto('explorar?calculator=true');
  const dialog=page.getByRole('dialog',{name:'Calculadora de presupuesto de alquiler',exact:true});
  await expect(dialog).toBeVisible();
  const bounds=await dialog.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(390);
  await page.screenshot({path:testInfo.outputPath('calculadora-mobile.png'),animations:'disabled'});
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
});

test('mobile notice center loads alerts, traps focus and restores the trigger', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  await page.addInitScript(() => { window.__testUser = { id: 'fixture-user', name: 'Usuario', accountStatus: 'active' }; });
  await page.route('**/src/lib/notificationService.js', route => route.fulfill({ contentType: 'application/javascript', body: `
    export function subscribeNotifications(uid, onChange) {
      onChange([{ id: 'visit', title: 'Visita confirmada', body: 'Tu visita está lista.', path: '/perfil?tab=visitas', readAt: null }]);
      return () => {};
    }
    export async function enableNotifications() { throw new Error('Permite las notificaciones en tu navegador.'); }
    export async function disableNotifications() {}
  ` }));
  await page.goto('./');
  const trigger = page.getByRole('button', { name: 'Avisos, 1 sin leer', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Tus avisos (1 sin leer)', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link')).toHaveAttribute('href', '/ruwajay/perfil?tab=visitas');
  await dialog.getByRole('button', { name: 'Activar notificaciones en este dispositivo' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Permite las notificaciones');
  await dialog.getByRole('link').focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Cerrar avisos' })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  const bounds = await dialog.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(640);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

for (const [code, message] of [
  ['auth/unauthorized-domain', 'Dominios autorizados'],
  ['auth/popup-blocked', 'Permite ventanas emergentes'],
  ['auth/popup-closed-by-user', 'Se cerró la ventana'],
  ['auth/network-request-failed', 'Revisa tu conexión'],
]) {
  test(`Google ${code} leaves an actionable message and no blocking overlay`, async ({ page }) => {
    await page.addInitScript(value => { window.__googleError = value; }, code);
    await page.goto('login');
    const button = page.getByRole('button', { name: 'Iniciar sesión con Google' });
    await button.click();
    await expect(page.getByRole('alert')).toContainText(message);
    await expect(button).toBeEnabled();
    await expect(page.getByText('Sincronizar con Google', { exact: true })).toHaveCount(0);
    await expect(page.locator('main .fixed')).toHaveCount(0);
    await page.locator('input[type=email]').fill('guest@example.test');
    await expect(page.locator('input[type=email]')).toHaveValue('guest@example.test');
    await button.click();
    await expect(page.getByRole('alert')).toContainText(message);
  });
}
