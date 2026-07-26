import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Отдельное приложение бэкофиса Pragmata. Свой dev-сервер :5176 (операторский
// web на :5175). API на :8088 — CORS для :5176 уже в allow-list бэкенда.
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5176, strictPort: false },
})
