import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: './src/renderer',
  optimizeDeps: {
    force: true,
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'zustand',
      'lucide-react'
    ],
    exclude: ['electron']
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
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
    hmr: {
      overlay: false
    }
  },
  esbuild: {
    target: 'es2020',
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
})
