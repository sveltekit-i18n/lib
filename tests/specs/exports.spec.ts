import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { cst, extractParamsFactory } from '../../src';
import { sanitizeLocales, toDotNotation } from '../../src/utils';

const require = createRequire(import.meta.url);

// The core's namespaces that this package exports under a name of its own,
// because `Config` and `Parser` already name this package's types.
const RENAMED: Record<string, string> = {
  Config: 'BaseConfig',
  Parser: 'BaseParser',
};

const declarationsOf = (specifier: string) => require.resolve(specifier).replace(/\.js$/, '.d.ts');

const exportsOf = (entry: string) => {
  const program = ts.createProgram([entry], {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    skipLibCheck: true,
  });

  const source = program.getSourceFile(entry);

  if (!source) throw new Error(`No declarations at ${entry}`);

  const symbol = program.getTypeChecker().getSymbolAtLocation(source);

  if (!symbol) throw new Error(`${entry} declares no module`);

  return program.getTypeChecker().getExportsOfModule(symbol).map((exported) => exported.getName());
};

// Issue #228: a consumer of this package must never have a reason to install
// the core beside it, which holds only while every name the core publishes is
// reachable from here. A new export in the core fails this.
describe('re-export surface', () => {
  it('carries every export of the core entry', () => {
    const reexported = exportsOf(`${import.meta.dirname}/../../dist/index.d.ts`);

    exportsOf(declarationsOf('@sveltekit-i18n/base')).forEach((name) => {
      expect(reexported).toContain(RENAMED[name] ?? name);
    });
  });

  it('carries every export of the core `utils` subpath', () => {
    const reexported = exportsOf(`${import.meta.dirname}/../../dist/utils.d.ts`);

    exportsOf(declarationsOf('@sveltekit-i18n/base/utils')).forEach((name) => {
      expect(reexported).toContain(RENAMED[name] ?? name);
    });
  });

  it('serves the helpers the `utils` subpath re-exports', () => {
    expect(toDotNotation({ user: { name: 'Name' } })).toEqual({ 'user.name': 'Name' });
    expect(sanitizeLocales('en-us', null)).toEqual(['en-US']);
  });

  // The parser's build-time half. A generator filling `config.schema` needs it
  // beside the instance it types, so it has to be reachable without depending
  // on the parser package.
  it('serves the parameter extractor the parser contributes', () => {
    expect(extractParamsFactory()('Hi {{name}}, you owe {{amount:number;}}.')).toEqual([
      { name: 'name', kind: 'unknown', optional: false },
      { name: 'amount', kind: 'number', optional: false },
    ]);

    // Built from the options the parser beside it is built from: a message is
    // read the way the app's own parser would read it.
    expect(extractParamsFactory({ customModifiers: { upper: ({ value }) => value } })('{{word:upper; default:none;}}'))
      .toEqual([{ name: 'word', kind: 'unknown', optional: true }]);
  });

  // The parser's other build-time half, for an editor describing a message.
  it('serves the describer the parser contributes', () => {
    const { type, start, end, nodes } = cst('Hi {{name}}!');

    expect({ type, start, end }).toEqual({ type: 'message', start: 0, end: 12 });
    expect(nodes.map((node) => [node.type, node.start, node.end])).toEqual([
      ['text', 0, 3],
      ['placeholder', 3, 11],
      ['text', 11, 12],
    ]);
  });
});
