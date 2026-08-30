import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/**/*.{test,spec}.{ts,tsx}'],
    watch: false,
    pool: 'forks',
    testTimeout: 5000,
    teardownTimeout: 1000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.*',
        'server.ts',
        'Backend/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
