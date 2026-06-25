import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['functions/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
