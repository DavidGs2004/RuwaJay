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
        export function useAuth() { return {
          user: null, isInitializing: false, isLoading: false, isPostAuthLoading: false,
          loginWithGoogle: async () => {
            throw Object.assign(new Error('Simulated Google failure'), { code: window.__googleError });
          },
        }; }
      ` });
    }
    return route.continue();
  });
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
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  }
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
    const button = page.getByRole('button', { name: 'Continuar con Google' });
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
