import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['ref/**', 'node_modules/**'],
  },
});
