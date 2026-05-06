import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['localhost', 'host.docker.internal', '127.0.0.1'],
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.API_URL || 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
