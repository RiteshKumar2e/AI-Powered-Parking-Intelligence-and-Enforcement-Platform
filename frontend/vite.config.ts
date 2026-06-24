import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://park-iq-nbvy.onrender.com',
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on('error', (err: Error & { code?: string }) => {
            if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') return
            console.error('[api proxy]', err.message)
          })
        },
      },
      '/ws': {
        target: 'wss://park-iq-nbvy.onrender.com',
        ws: true,
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on('error', (err: Error & { code?: string }) => {
            if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') return
            console.error('[ws proxy]', err.message)
          })
        },
      },
      '/storage': {
        target: 'https://park-iq-nbvy.onrender.com',
        changeOrigin: true,
        secure: true,
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
