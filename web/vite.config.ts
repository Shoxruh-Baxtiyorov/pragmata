import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Tailwind 4 через официальный vite-плагин (как в бэкофисе/iqbola-ките) —
// нужен, чтобы резолвился `@import "shadcn/tailwind.css"` из дизайн-кита.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5175, // 5173/5174 заняты iqbola на дев-машине
    strictPort: false,
  },
})
