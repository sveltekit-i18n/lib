// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'tsup';

export default defineConfig((options) => {
  return {
    clean: true,
    dts: true,
    format: ['cjs', 'esm'],
    entry: ['src/index.ts'],
    minify: !options.watch,
    sourcemap: options.watch,
  };
});