import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const run = promisify(execFile);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// The compiler's own entry, run by the runtime running the suite. The
// `node_modules/.bin` shim is an extensionless shell script on Windows, which
// `execFile` cannot spawn at all; Deno runs a script only with permissions.
const TSC = resolve(ROOT, 'node_modules/typescript/bin/tsc');
const RUNTIME_ARGS = 'Deno' in globalThis ? ['run', '-A'] : [];

/** Compiles the fixture program and returns what `tsc` reported. */
const compile = async (project: string): Promise<string> => {
  try {
    await run(process.execPath, [...RUNTIME_ARGS, TSC, '-p', resolve(ROOT, project)]);

    return '';
  } catch (failure) {
    const reported = `${(failure as { stdout?: string }).stdout ?? ''}`.trim();

    // `tsc` reports on stdout and exits non-zero. A rejection carrying nothing
    // is the compiler failing to run, and reading that as a clean compile
    // would pass the case silently.
    if (!reported) throw failure;

    return reported;
  }
};

// The fixture registers a schema in `SvelteKitI18n.Register`, which types
// every schema-less instance of the program it is part of, so it is a program
// of its own, compiled against this package's build (`pretest` builds it). A
// case that stops narrowing fails on its unused `@ts-expect-error`.
describe('the type registry', () => {
  it('types a schema-less instance by the registered schema, and yields to a stated one', async () => {
    expect(await compile('tests/types/registry/tsconfig.json')).toBe('');
  }, 60_000);
});
