import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
    },
  },
  resolve: {
    alias: {
      '@fire-monitoring/shared': path.resolve(__dirname, 'packages/shared/index.ts'),
      '@': path.resolve(__dirname, 'apps/monitoring-dashboard'),
    },
  },
});