import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = process.env.VITE_API_URL || 'https://nx51c96s16.execute-api.ap-south-1.amazonaws.com'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  define: {
    // amazon-cognito-identity-js (and buffer) expect Node's `global`; browser has `window`
    global: 'globalThis',
  },
  server: {
    port: 5174,
    proxy: {
      // Proxy all /api requests to the deployed API — avoids CORS in local dev.
      // The browser makes same-origin requests; Vite forwards them server-side.
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
