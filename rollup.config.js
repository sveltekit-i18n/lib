import ts from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { terser } from 'rollup-plugin-terser';
import autoExternal from 'rollup-plugin-auto-external';

import pkg from './package.json';

const { ROLLUP_WATCH } = process.env;

export default [
  {
    input: './src/index.ts',
    external: [
      ...Object.keys(pkg.peerDependencies),
      'svelte/store',
    ],
    output: [
      { file: pkg.main, format: 'es' },
    ],
    plugins: [autoExternal(), ts(), !ROLLUP_WATCH && terser({ mangle: { reserved: ['get', 'derived', 'writable'] } })],
  },
  {
    input: './src/index.ts',
    output: [{ file: 'types/index.d.ts', format: 'es' }],
    plugins: [dts()],
  },
];