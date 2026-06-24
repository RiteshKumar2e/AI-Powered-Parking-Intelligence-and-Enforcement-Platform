import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: Error & { code?: string }) => {
            if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') return
            console.error('[api proxy]', err.message)
          })
        },
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err: Error & { code?: string }) => {
            if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') return
            console.error('[ws proxy]', err.message)
          })
        },
      },
      '/storage': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: Error & { code?: string }) => {
            if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') return
            console.error('[storage proxy]', err.message)
          })
        },
      },
    },
  },
})
