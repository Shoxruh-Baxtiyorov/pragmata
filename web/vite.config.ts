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
    // один ngrok-тоннель на :5175 отдаёт и фронт, и API: /api проксируется на бэкенд
    proxy: {
      '/api': { target: 'http://127.0.0.1:8088', changeOrigin: true },
    },
    // Vite блокирует чужой Host — разрешаем ngrok-домены и локалхост
    allowedHosts: ['.ngrok-free.dev', '.ngrok.app', 'localhost', '127.0.0.1'],
  },
})
