import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Tailwind подключён через PostCSS (postcss.config.mjs), а не vite-плагин —
// vite-плагин не транслировался в этой связке версий.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // 5175 — свой порт (5173/5174 заняты фронтом Iqbola на этой машине)
  server: { port: 5175, strictPort: false },
})
