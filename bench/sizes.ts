// What an app ships to the browser for what it imports from this package,
// minified: the whole of it, the core and the parser included, and this
// package's own code alone.
import { gzipSync } from 'node:zlib';

import { bundle } from './bundle.ts';
import { record, TREE } from './collect.ts';

const ENTRIES = [
  ['I18n from the entry', "export { I18n } from './dist/index.js';"],
  ['defineI18n from /kit', "export { defineI18n } from './dist/kit.js';"],
];

const sizes = (id: string, text: string) => {
  record(`${id}, minified`, 'size', 'B', Buffer.byteLength(text));
  record(`${id}, minified and gzipped`, 'size', 'B', gzipSync(text).length);
};

/** The tree's parser module as it is, or with what no render reaches left out. */
const parser = (shaken: boolean) => (real: string) => [
  `export * from ${JSON.stringify(real)};`,
  `export { default } from ${JSON.stringify(real)};`,
  ...(shaken ? ['export const cst = undefined;', 'export const extractParamsFactory = undefined;'] : []),
].join('\n');

/**
 * A bundle with each name replaced by the order it first appears in: what a
 * symbol is called depends on every symbol the bundler saw, the ones it then
 * left out included.
 */
const canonical = (text: string) => {
  const names = new Map<string, string>();

  return text.replace(/[A-Za-z_$][\w$]*/g, (name) => {
    if (!names.has(name)) names.set(name, `$${names.size}`);

    return names.get(name) ?? name;
  });
};

for (const [name, contents] of ENTRIES) {
  sizes(`browser bundle of ${name}`, await bundle({ tree: TREE, contents, generate: 'client', shipped: true }));

  // The package re-exports the parser's `cst` and `extractParamsFactory`,
  // which no render reaches, so a bundle of what an app renders with must ship
  // nothing of them: it comes out as it does with both left out, but for the
  // names the bundler picks.
  const [kept, shaken] = await Promise.all([false, true].map(async (leftOut) => canonical(await bundle({ tree: TREE, contents, generate: 'client', shipped: true, parser: parser(leftOut) }))));

  if (kept !== shaken) throw new Error(`A bundle of ${name} ships part of cst or extractParamsFactory.`);
}

// Everything but the tree's own `dist/` left out, as a bare import.
for (const [name, contents] of ENTRIES) {
  sizes(`browser bundle of ${name}, this package's code alone`, await bundle({ tree: TREE, contents, generate: 'client', shipped: true, own: true }));
}
