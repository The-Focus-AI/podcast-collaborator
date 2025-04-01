import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
    globals: true,
    watch: false,
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 5000, // Reduced timeout to 5 seconds
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4,
        isolate: true
      }
    },
    bail: 1, // Stop on first failure
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
}); 