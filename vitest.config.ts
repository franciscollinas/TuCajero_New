import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}', 'app/renderer/src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'app/renderer/dist'],
    setupFiles: ['./tests/setup.ts'],
  },
});
