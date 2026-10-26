import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export default defineConfig({
  testDir:'tests/browser', workers:1, timeout:30000, outputDir:'../recuros ia/pruebas/browser-results',
  use:{baseURL:'http://localhost:5175',headless:true,
    launchOptions:{executablePath:existsSync(edge)?edge:existsSync(chrome)?chrome:undefined},
    screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'npm run dev:frontend -- --host 127.0.0.1 --port 5175 --strictPort',
    url:'http://127.0.0.1:5175',env:{VITE_FIREBASE_EMULATORS:'true'},reuseExistingServer:false},
});
