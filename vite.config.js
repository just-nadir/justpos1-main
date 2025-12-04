import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Electron uchun muhim
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // --- OPTIMIZATSIYA ---
    chunkSizeWarningLimit: 1000, // 1000kb dan oshsa ogohlantir
    rollupOptions: {
      output: {
        manualChunks: {
          // Katta kutubxonalarni alohida faylga ajratamiz
          vendor: ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'recharts'],
          utils: ['axios', 'dayjs', 'socket.io-client']
        }
      }
    }
  }
})