import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // WebViews de Android antiguos no entienden la sintaxis más reciente.
  build: { target: ['es2018', 'chrome64', 'safari12'], cssTarget: 'chrome64' },
})
