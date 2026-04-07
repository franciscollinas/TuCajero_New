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
  },
});
