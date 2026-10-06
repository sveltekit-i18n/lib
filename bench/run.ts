// Runs the benchmark: `pnpm run bench` measures this tree, and
// `pnpm run bench --compare <dir>` measures it against the package checked
// out and installed at `<dir>` (master, in CI), printing a table of both. Node
// runs this file as it is, so it imports nothing it would have to compile:
// Node's modules, esbuild and Svelte's compiler, which bundle the subjects,
// and modules of its own, which Node runs as they are too.
//
//   --compare <dir>   the package root to measure against, installed
//   --samples <n>     processes per side for the time and heap rows (default 11)
//   --report <file>   also writes the table, as Markdown, to <file>
//   --write           writes BENCH.md from this tree's rows
//
// Each tree is built by its own toolchain and bundled with the core and the
// parser its own install holds: what this package costs is mostly what it
// pins, so a change of a pin is a change measured.
//
// It exits with 1 when a project of this tree failed, and with 2 when only the
// comparison failed: a count grew, a row of the base is missing from this tree,
// or a project of the base failed. The `bench-accepted` label lets the second
// pass in CI.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { arch, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { bundle, ROOT, type Generate } from './bundle.ts';
import { change, flagOf, median, spreadOf, THRESHOLD, type Kind } from './compare.ts';

type Row = { id: string; kind: Kind; unit: string; value: number };
type Subject = 'master' | 'head';
type Project = 'build' | 'sizes' | 'counts' | 'checker' | 'times' | 'heap';
type Measured = { kind: Kind; unit: string; values: number[] };

const OUT = join(ROOT, 'bench/out');
const KINDS: Kind[] = ['count', 'size', 'time', 'heap'];

/** Whether a row of `kind` is read from samples of its own processes. */
const sampled = (kind: Kind) => kind === 'time' || kind === 'heap';

const { values: args } = parseArgs({
  // pnpm hands a script what follows its name, a `--` included.
  args: process.argv.slice(2).filter((arg, index) => index || arg !== '--'),
  options: {
    compare: { type: 'string' },
    samples: { type: 'string', default: '11' },
    report: { type: 'string' },
    write: { type: 'boolean', default: false },
  },
});

const samples = Number(args.samples);

if (!Number.isInteger(samples) || samples < 1) throw new Error(`--samples takes a positive integer, not ${args.samples}.`);

const manifest = (dir: string) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { name: string; version: string; dependencies?: Record<string, string> };
const pkg = manifest(ROOT);
const trees: Partial<Record<Subject, string>> = { head: ROOT };

if (args.compare) {
  const master = resolve(args.compare);

  if (!existsSync(join(master, 'node_modules'))) throw new Error(`${master} has no install: run \`pnpm install --frozen-lockfile --ignore-scripts\` there first.`);

  trees.master = master;
}

const subjects = Object.keys(trees) as Subject[];
const failed: Record<Subject, Set<Project>> = { master: new Set(), head: new Set() };
// A project a signal ended, its timeout's or a crash's, is not run again, so
// a hang costs one timeout; each is kept with the sample it ended in.
const hung: Record<Subject, Map<Project, number>> = { master: new Map(), head: new Map() };
const ONCE: Project[] = ['sizes', 'counts', 'checker'];
const where = (project: Project, sample: number) => (ONCE.includes(project) ? '' : ` in sample ${sample + 1} of ${samples}, and no later sample runs it`);

// The bundles the time, heap and count rows run, as a consumer's bundler
// builds the package for the browser and for the server: one exporting what
// an app imports, and one that also counts the parsers the package builds.
const BUNDLES: Record<string, { generate: Generate; counted: boolean }> = {
  client: { generate: 'client', counted: false },
  server: { generate: 'server', counted: false },
  'client.counted': { generate: 'client', counted: true },
  'server.counted': { generate: 'server', counted: true },
};

const ENTRY = [
  "export { I18n } from './dist/index.js';",
  "export { defineI18n } from './dist/kit.js';",
  'export const parsersBuilt = () => globalThis.parsersBuilt ?? 0;',
].join('\n');

/** The tree's parser module, counting each parser it builds. */
const counting = (real: string) => [
  `import parser from ${JSON.stringify(real)};`,
  `export * from ${JSON.stringify(real)};`,
  'export default (options) => { globalThis.parsersBuilt = (globalThis.parsersBuilt ?? 0) + 1; return parser(options); };',
].join('\n');

/**
 * Builds a tree as it ships, with its own toolchain, then bundles it. Returns
 * where the bundles landed, or nothing when the tree cannot be built, and then
 * every project of it fails.
 */
const build = async (subject: Subject): Promise<string | undefined> => {
  const tree = trees[subject]!;
  const lib = join(OUT, 'lib', subject);
  // Under `pnpm run`, pnpm is the one that started this; otherwise the one on
  // the path.
  const pnpm = process.env.npm_execpath;
  const { status } = pnpm
    ? spawnSync(process.execPath, [pnpm, 'run', 'build'], { cwd: tree, stdio: ['ignore', 'inherit', 'inherit'] })
    : spawnSync('pnpm', ['run', 'build'], { cwd: tree, stdio: ['ignore', 'inherit', 'inherit'], shell: platform() === 'win32' });

  rmSync(lib, { recursive: true, force: true });

  if (status !== 0) return undefined;

  try {
    mkdirSync(lib, { recursive: true });

    for (const [name, { generate, counted }] of Object.entries(BUNDLES)) {
      writeFileSync(join(lib, `${name}.js`), await bundle({ tree, contents: ENTRY, generate, parser: counted ? counting : undefined }));
    }

    return lib;
  } catch (error) {
    console.error(`The ${subject} tree does not bundle: ${(error as Error).message}`);

    return undefined;
  }
};

const libs: Partial<Record<Subject, string>> = {};

for (const subject of subjects) {
  libs[subject] = await build(subject);
  if (!libs[subject]) failed[subject].add('build');
}

// The heap rows read the heap after collecting it, and leave every tier of
// V8's above its interpreter out, which would compile code between two reads.
// V8 also drops the bytecode of a function that has not run for a number of
// collections, so the code that ran once, before the curve, would leave it
// some megabytes at a point no row can foresee.
const FLAGS: Partial<Record<Project, string[]>> = { heap: ['--expose-gc', '--max-opt=0', '--no-flush-bytecode'] };

/** Runs one project against one subject in a process of its own and reads back its rows. */
const run = (subject: Subject, project: Project, sample: number): Row[] => {
  const out = join(OUT, subject, `${project}-${sample}.json`);
  const lib = libs[subject];

  rmSync(out, { force: true });

  const { status, signal, error } = lib && !hung[subject].has(project)
    ? spawnSync(process.execPath, [...FLAGS[project] ?? [], join(ROOT, 'bench', `${project}.ts`)], {
      cwd: ROOT,
      stdio: ['ignore', 'inherit', 'inherit'],
      // A project takes seconds; one that never exits fails, and with each
      // project of both sides timing out once, the report still posts within
      // the job's time.
      timeout: 180_000,
      env: { ...process.env, NODE_ENV: 'production', BENCH_TREE: trees[subject], BENCH_LIB: lib, BENCH_OUT: out },
    })
    : { status: 1, signal: null, error: undefined };

  if (status !== 0) failed[subject].add(project);
  if (signal) {
    hung[subject].set(project, sample);
    console.error(`The ${project} project of ${subject} ended by ${signal}${error ? ` (${error.message})` : ''}${where(project, sample)}.`);
  }

  return status === 0 && existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) as Row[] : [];
};

const measured: Record<Subject, Map<string, Measured>> = { master: new Map(), head: new Map() };

const add = (subject: Subject, rows: Row[]) => rows.forEach(({ id, kind, unit, value }) => {
  const entry = measured[subject].get(id) ?? { kind, unit, values: [] };

  entry.values.push(value);
  measured[subject].set(id, entry);
});

// Counts and sizes are the same on every run, so one run of each side does.
for (const subject of subjects) {
  for (const project of ONCE) add(subject, run(subject, project, 0));
}

// Times and heap readings alternate between the sides, each sample in a fresh
// process, so a drift of the machine lands on both.
for (let sample = 0; sample < samples; sample++) {
  const order = sample % 2 ? [...subjects].reverse() : subjects;

  for (const subject of order) {
    for (const project of ['times', 'heap'] as const) add(subject, run(subject, project, sample));
  }
}

const format = (value: number, unit: string) => {
  if (unit === 'ms' || unit === 'µs') return `${value.toLocaleString('en-US', { maximumSignificantDigits: 3 })} ${unit}`;

  return `${(Math.round(value) || 0).toLocaleString('en-US')} ${unit}`;
};

const spread = ({ values, unit }: Measured) => (values.length > 1 ? spreadOf(values).map((bound) => format(bound, unit)).join(' to ') : '');

type Line = { id: string; kind: Kind; master?: Measured; head?: Measured; flag: string; delta: string };

const compare = (id: string): Line => {
  const master = measured.master.get(id);
  const head = measured.head.get(id);
  const kind = (head ?? master)!.kind;

  if (!head) return { id, kind, master, flag: 'missing', delta: '' };

  if (!master) return { id, kind, head, flag: args.compare ? 'new' : '', delta: '' };

  const [from, to] = [median(master.values), median(head.values)];
  const share = change(from, to);
  // A heap reading can sit at zero, where a share means nothing.
  const delta = from === to ? '0' : `${to > from ? '+' : ''}${format(to - from, head.unit)}${Number.isFinite(share) && kind !== 'heap' ? ` (${to > from ? '+' : ''}${(100 * share).toFixed(1)}%)` : ''}`;

  return { id, kind, master, head, delta, flag: flagOf(kind, master.values, head.values) };
};

const ids = [...new Set([...measured.head.keys(), ...measured.master.keys()])];
const lines = KINDS.flatMap((kind) => ids.map(compare).filter((line) => line.kind === kind));

const grew = lines.filter(({ flag }) => flag === 'grew, fails');
const missing = lines.filter(({ flag }) => flag === 'missing');
const review = lines.filter(({ flag }) => flag.endsWith('review'));

const cell = (text: string) => text.replaceAll('|', '\\|');
const value = (entry?: Measured) => (entry ? format(median(entry.values), entry.unit) : 'n/a');

const table = args.compare
  ? [
    '| Row | Kind | Master | Head | Delta | Spread (master; head) | Flag |',
    '| --- | --- | ---: | ---: | ---: | --- | --- |',
    ...lines.map((line) => `| ${cell(line.id)} | ${line.kind} | ${value(line.master)} | ${value(line.head)} | ${line.delta} | ${sampled(line.kind) ? [line.master, line.head].map((entry) => (entry ? spread(entry) : 'n/a')).join('; ') : ''} | ${line.flag} |`),
  ]
  : [
    '| Row | Kind | Value | Spread |',
    '| --- | --- | ---: | --- |',
    ...lines.map((line) => `| ${cell(line.id)} | ${line.kind} | ${value(line.head)} | ${line.head ? spread(line.head) : ''} |`),
  ];

const compared = failed.master.size + missing.length + grew.length;

const verdict = [
  ...[...failed.head].map((project) => `- **Failed:** the ${project} project of this branch. The job fails.`),
  ...[...failed.master].map((project) => `- **Failed on the base:** the ${project} project; its rows hold only the samples it completed, and a row it did not measure reads n/a.`),
  ...subjects.flatMap((subject) => [...hung[subject]].map(([project, sample]) => `- **Ended by a signal${subject === 'master' ? ' on the base' : ''}:** the ${project} project${where(project, sample)}.`)),
  ...missing.map(({ id }) => `- **Missing on head:** ${id}.`),
  grew.length ? `- **${grew.length} count${grew.length === 1 ? '' : 's'} grew.**` : '',
  compared && !failed.head.size ? '- The job fails on the comparison unless the PR carries the `bench-accepted` label.' : '',
  review.length ? `- ${review.length} row${review.length === 1 ? '' : 's'} to review: a size that grew, a time beyond its spread by ${100 * THRESHOLD}% or more, or a heap reading that grew beyond its spread. None of them fails the job.` : '',
].filter(Boolean);

/** The runtime dependencies a tree was measured with, at the versions its install holds. */
const dependencies = (dir: string) => Object.keys(manifest(dir).dependencies ?? {}).map((dependency) => {
  const installed = join(dir, 'node_modules', dependency, 'package.json');

  return `${dependency} ${existsSync(installed) ? manifest(dirname(installed)).version : 'not installed'}`;
}).join(', ') || 'none';

const environment = [
  `Node ${process.version}, ${platform()} ${arch()}; times and heap readings are medians of ${samples} process${samples === 1 ? '' : 'es'}${args.compare ? ' per side' : ''}, a time each the median of its rounds; a spread leaves out the lowest and the highest quarter of them, rounded down. Sizes include the core and the parser, and leave out \`svelte\`, which is the app's.`,
  ...subjects.map((subject) => `${args.compare ? `${subject[0].toUpperCase()}${subject.slice(1)} runs on ` : 'Dependencies: '}${dependencies(trees[subject]!)}.`),
].join('\n');

const report = [
  `<!-- bench:${pkg.name} -->`,
  `## Benchmark: \`${pkg.name}\``,
  '',
  args.compare ? 'This branch against its base.' : 'This tree.',
  environment,
  '',
  ...(verdict.length ? [...verdict, ''] : args.compare ? ['No count grew, and no size, time or heap reading changed beyond its threshold.', ''] : []),
  ...table,
  '',
].join('\n');

console.log(`\n${report}`);

if (args.report) writeFileSync(resolve(args.report), report);

if (args.write) {
  const section = (kind: Kind, title: string, blurb: string) => {
    const rows = lines.filter((line) => line.kind === kind && line.head);

    return [
      `## ${title}`,
      '',
      blurb,
      '',
      ...(sampled(kind) ? ['| Row | Median | Spread |', '| --- | ---: | --- |'] : ['| Row | Value |', '| --- | ---: |']),
      ...rows.map((line) => `| ${cell(line.id)} | ${value(line.head)} |${sampled(kind) ? ` ${spread(line.head!)} |` : ''}`),
      '',
    ];
  };

  writeFileSync(join(ROOT, 'BENCH.md'), [
    '# Benchmark',
    '',
    `What \`pnpm run bench\` measured on \`${pkg.name}\` ${pkg.version}, written by the release that published it. A pull request compares its branch with its base in a comment; this file keeps the figures of each release beside its code.`,
    '',
    environment,
    '',
    ...section('count', 'Counts', 'Parsers built and checker instantiations: the same on every machine. A pull request that grows one fails its benchmark job unless it carries the `bench-accepted` label.'),
    ...section('size', 'Sizes', 'Bytes of a browser bundle: the same on every machine.'),
    ...section('time', 'Times', 'Microseconds, of one machine at one time: compare them only with figures measured beside them.'),
    ...section('heap', 'Heap', 'Bytes of heap retained, read in a process of their own without V8\'s optimizing compilers: they move by a few bytes from process to process, differ from one Node version to another, and a reading near zero, on either side of it, means nothing retained.'),
  ].join('\n'));
}

if (failed.head.size) process.exitCode = 1;
else if (compared) process.exitCode = 2;
