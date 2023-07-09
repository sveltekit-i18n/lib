import { defineConfig } from 'tsup';

export default defineConfig(
  /** @type {() => import('tsup').Options} */
  (options) => ({
    clean: true,
    dts: true,
    format: ['cjs', 'esm'],
    entry: ['src/index.ts'],
    minify: !options.watch,
    sourcemap: options.watch,
    splitting: true,
  }),
);