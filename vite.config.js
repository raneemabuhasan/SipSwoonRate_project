import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Fixed port to match Supabase redirect configuration
    strictPort: true, // Fail if port is already in use
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  // Vite automatically handles SPA routing, but we need to ensure root path works
  build: {
    rollupOptions: {
      input: './index.html'
    }
  }
})
