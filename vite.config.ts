import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const FEATURE_CODE = /\/web\/src\/features\//;

export default defineConfig({
  root: fileURLToPath(new URL('./web', import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./web/src', import.meta.url)),
      '@contracts': fileURLToPath(new URL('./src/contracts', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      treeshake: {
        moduleSideEffects: (id) => !FEATURE_CODE.test(id),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
