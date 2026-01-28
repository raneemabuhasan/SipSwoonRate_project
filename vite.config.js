import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Fixed port to match InstantDB configuration
    strictPort: true, // Fail if port is already in use
  },
  // Vite automatically handles SPA routing, but we need to ensure root path works
  build: {
    rollupOptions: {
      input: './index.html'
    }
  }
})

