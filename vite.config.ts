import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: './src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer/src'),
      '@/components': path.resolve(__dirname, './src/renderer/src/components'),
      '@/pages': path.resolve(__dirname, './src/renderer/src/pages'),
      '@/hooks': path.resolve(__dirname, './src/renderer/src/hooks'),
      '@/services': path.resolve(__dirname, './src/renderer/src/services'),
      '@/store': path.resolve(__dirname, './src/renderer/src/store'),
      '@/utils': path.resolve(__dirname, './src/renderer/src/utils'),
      '@/types': path.resolve(__dirname, './src/renderer/src/types'),
    },
  },
  server: {
    port: 3000,
  },
})
