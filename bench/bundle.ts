// Bundles a tree's build as a consumer's bundler would, for `run.ts` and the
// size rows. Node runs it as it is.
//
// The subject is what the package ships and pins: the tree's `dist/` and the
// core and parser its own install resolves. The instruments are this tree's:
// esbuild, and the Svelte that compiles the core's rune modules (which the
// core ships uncompiled) and runs them, as svelte is the consumer's. A change
// of an instrument then moves both sides alike.
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';
import { compileModule } from 'svelte/compiler';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export type Generate = 'client' | 'server';

export type Bundle = {
  /** The package root measured: its `dist/` and its install. */
  tree: string;
  /** The entry module, resolved from the tree's root. */
  contents: string;
  generate: Generate;
  /**
   * What an app ships to a browser: minified, with `svelte` left out, since
   * it is the consumer's. Otherwise a module Node runs, `svelte` included.
   */
  shipped?: boolean;
  /** Only the tree's own code: every bare import is left out. */
  own?: boolean;
  /**
   * The module the tree's `dist/` gets for `@sveltekit-i18n/parser-curly`,
   * written from the path of the real one.
   */
  parser?: (real: string) => string;
};

// Marks a resolution a plugin asked for itself, so it does not answer it again.
const OWN = Symbol('bench');

export const bundle = async ({ tree, contents, generate, shipped = false, own = false, parser }: Bundle) => {
  const root = realpathSync.native(tree);
  const dist = join(root, 'dist', sep);
  const compiled = new Set<string>();
  const plugins: esbuild.Plugin[] = [{
    name: 'runes',
    setup: (build) => {
      build.onLoad({ filter: /\.svelte\.js$/ }, ({ path }) => {
        compiled.add(path);

        return {
          contents: compileModule(readFileSync(path, 'utf8'), { generate, dev: false, filename: path }).js.code,
          loader: 'js',
        };
      });
    },
  }];

  if (!shipped) {
    plugins.push({
      name: 'svelte',
      setup: (build) => {
        build.onResolve({ filter: /^svelte(\/|$)/ }, ({ path, kind, pluginData }) => (pluginData === OWN ? undefined : build.resolve(path, { kind, resolveDir: ROOT, pluginData: OWN })));
      },
    });
  }

  if (parser) {
    plugins.push({
      name: 'parser',
      setup: (build) => {
        build.onResolve({ filter: /^@sveltekit-i18n\/parser-curly$/ }, async ({ path, kind, importer, resolveDir, pluginData }) => {
          if (pluginData === OWN || !importer.startsWith(dist)) return undefined;

          const real = await build.resolve(path, { kind, importer, resolveDir, pluginData: OWN });

          return real.errors.length ? undefined : { path: real.path, namespace: 'parser' };
        });
        build.onLoad({ filter: /./, namespace: 'parser' }, ({ path }) => ({ contents: parser(path), resolveDir: dirname(path), loader: 'js' }));
      },
    });
  }

  const { outputFiles: [output], metafile } = await esbuild.build({
    stdin: { contents, resolveDir: root, sourcefile: 'entry.js' },
    absWorkingDir: root,
    metafile: true,
    bundle: true,
    minify: shipped,
    write: false,
    format: 'esm',
    platform: generate === 'client' ? 'browser' : 'node',
    // A consumer's bundler builds an app for production; Svelte's own
    // `esm-env` reads it from this condition.
    conditions: ['production'],
    external: shipped ? ['svelte', 'svelte/*'] : [],
    packages: own ? 'external' : undefined,
    logLevel: 'silent',
    plugins,
  });

  const uncompiled = Object.keys(metafile.inputs).filter((input) => /\.svelte\.[cm]?[jt]s$/.test(input) && !compiled.has(resolve(root, input)));

  if (uncompiled.length) throw new Error(`A rune module reached the bundle uncompiled: ${uncompiled.join(', ')}.`);

  return output.text;
};
