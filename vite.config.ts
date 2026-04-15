import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'app/renderer',
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'app/renderer/src/shared'),
      '@modules': resolve(__dirname, 'app/renderer/src/modules'),
      '@config': resolve(__dirname, 'config'),
      '@db': resolve(__dirname, 'database'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
          'ui-vendor': ['lucide-react'],
          // Heavy libraries loaded on demand
          'pdf-vendor': ['pdf-lib', 'pdfkit'],
          'excel-vendor': ['exceljs'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
