import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@/api': path.resolve(__dirname, './api'),
      '@api': path.resolve(__dirname, './api'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/@supabase/supabase-js')) {
            return 'supabase'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons'
          }
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/')
          ) {
            return 'vendor'
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/media': {
        target: 'https://pub-0d40d8c10eb24e8388e286f86efcdb44.r2.dev',
        changeOrigin: true,
        rewrite: (reqPath) => reqPath.replace(/^\/media/, ''),
      },
    },
  },
})
