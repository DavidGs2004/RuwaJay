import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export default defineConfig({
  testDir: 'tests/public-browser',
  testMatch: 'public-access.spec.js',
  workers: 1,
  timeout: 30000,
  outputDir: '../recuros ia/pruebas/public-access-results',
  use: {
    baseURL: 'http://localhost:5176/ruwajay/',
    headless: true,
    launchOptions: { executablePath: existsSync(edge) ? edge : existsSync(chrome) ? chrome : undefined },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --base=/ruwajay/ --host 127.0.0.1 --port 5176 --strictPort',
    url: 'http://127.0.0.1:5176/ruwajay/',
    reuseExistingServer: false,
  },
});
