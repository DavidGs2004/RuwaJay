import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      '@components': resolve(import.meta.dirname, './src/components'),
      '@pages': resolve(import.meta.dirname, './src/pages'),
      '@hooks': resolve(import.meta.dirname, './src/hooks'),
      '@data': resolve(import.meta.dirname, './src/data'),
      '@utils': resolve(import.meta.dirname, './src/utils'),
      '@context': resolve(import.meta.dirname, './src/context'),
      '@assets': resolve(import.meta.dirname, './src/assets'),
    },
  },
  server: {
    port: 5173,
    watch: {
      ignored: ['**/android-app/**'],
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
