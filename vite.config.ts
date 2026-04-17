import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
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
    minify: true,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            if (id.includes('recharts')) {
              return 'chart-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            if (id.includes('pdf-lib') || id.includes('pdfkit') || id.includes('exceljs')) {
              return 'office-vendor';
            }
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
