import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
  },
  resolve: {
    alias: {
      '@repo/validation': path.resolve(__dirname, 'packages/validation/src/index.ts'),
      '@repo/db': path.resolve(__dirname, 'packages/db/src/index.ts'),
      '@repo/redis': path.resolve(__dirname, 'packages/redis/src/index.ts'),
      '@repo/logger': path.resolve(__dirname, 'packages/logger/src/index.ts'),
      '@repo/auth': path.resolve(__dirname, 'packages/auth/src/index.ts'),
    },
  },
});
