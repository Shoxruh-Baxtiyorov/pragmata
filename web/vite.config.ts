import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Tailwind 4 подключён через PostCSS (postcss.config.mjs), не через vite-плагин —
// vite-плагин не транслировался в этой связке версий.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5175, // 5173/5174 заняты iqbola на дев-машине
    strictPort: false,
  },
})
