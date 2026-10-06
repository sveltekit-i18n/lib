import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { median, type Kind } from './compare.ts';

import type { I18n } from '../src/index.ts';
import type { defineI18n } from '../src/kit.ts';

export type Row = { id: string; kind: Kind; unit: string; value: number };

// The tree measured, the runtime bundles `run.ts` built of it, and where its
// rows go.
const { BENCH_TREE, BENCH_LIB, BENCH_OUT, NODE_ENV } = process.env;

if (!BENCH_TREE || !BENCH_LIB || !BENCH_OUT) throw new Error('The benchmark runs through `pnpm run bench`.');

// Times and heap readings are only meaningful as an app ships the package.
if (NODE_ENV !== 'production') throw new Error('The benchmark runs with NODE_ENV=production; run it through `pnpm run bench`.');

export const TREE = BENCH_TREE;

/** What a runtime bundle of the tree exports, as `run.ts` builds it. */
export type Runtime = { I18n: typeof I18n; defineI18n: typeof defineI18n; parsersBuilt: () => number };

/**
 * A runtime bundle of the tree: compiled for the browser (`client`) or the
 * server, and `counted` when every parser the package builds is counted.
 */
export const runtime = async (bundle: 'client' | 'server' | 'client.counted' | 'server.counted'): Promise<Runtime> => import(pathToFileURL(join(BENCH_LIB, `${bundle}.js`)).href);

const rows: Row[] = [];

// Written once the project has run to its end; a project that throws writes
// none, and `run.ts` reads it as failed.
process.on('exit', (code) => {
  if (code !== 0) return;

  mkdirSync(dirname(BENCH_OUT), { recursive: true });
  writeFileSync(BENCH_OUT, JSON.stringify(rows));
});

export const record = (id: string, kind: Kind, unit: string, value: number) => {
  rows.push({ id, kind, unit, value });
};

/** A number as a row's name spells it. */
export const n = (value: number) => value.toLocaleString('en-US');

/**
 * The median duration of `fn` in milliseconds per call, over `samples` rounds
 * of `inner` calls each, after three rounds that warm up.
 */
export const time = (fn: () => unknown, { inner = 1, samples = 15 }: { inner?: number; samples?: number } = {}) => {
  for (let i = 0; i < 3 * inner; i++) fn();

  const durations: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = performance.now();

    for (let j = 0; j < inner; j++) fn();
    durations.push((performance.now() - start) / inner);
  }

  return median(durations);
};

/** `time` for an asynchronous `fn`, each call awaited before the next. */
export const timeAsync = async (fn: () => Promise<unknown>, { inner = 1, samples = 15 }: { inner?: number; samples?: number } = {}) => {
  for (let i = 0; i < 3 * inner; i++) await fn();

  const durations: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = performance.now();

    for (let j = 0; j < inner; j++) await fn();
    durations.push((performance.now() - start) / inner);
  }

  return median(durations);
};

/**
 * `work`, or an error once `seconds` pass: a project that waits on something
 * that never comes fails rather than holding the job.
 */
export const within = <T>(seconds: number, what: string, work: Promise<T>): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;

  return Promise.race([
    work,
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${what} took over ${seconds} s.`)), seconds * 1000); }),
  ]).finally(() => clearTimeout(timer));
};
