import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Отдельное приложение бэкофиса (по логике Iqbola): свой dev-сервер, свой логин.
// Операторский web/ живёт на :5175 — бэкофис на :5176, чтобы поднимать оба сразу.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 5176, strictPort: false },
})
