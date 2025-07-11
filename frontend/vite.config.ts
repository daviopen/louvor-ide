import path from 'path';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    fs: {
      // permite importações de arquivos fora da raiz do projeto frontend
      allow: [path.resolve(__dirname, '..')]
    }
  },
  build: {
    // Otimizações para produção
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          ui: ['lucide-react', '@headlessui/react']
        }
      }
    },
    // Configuração para otimizar o tamanho do bundle
    chunkSizeWarningLimit: 1000
  },
  // Configuração para produção
  define: {
    // Remove console.log em produção
    ...(process.env.NODE_ENV === 'production' && {
      'console.log': '(() => {})',
      'console.debug': '(() => {})'
    })
  }
})
