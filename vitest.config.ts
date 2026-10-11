import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Las pruebas con base de datos la vacían y la rellenan: una detrás de otra, no a la vez.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
