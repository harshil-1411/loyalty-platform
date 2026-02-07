import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
})
