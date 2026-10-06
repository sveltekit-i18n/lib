// What the composed instance leaves behind once dropped, as a tab builds it,
// and what a page render leaves behind on a server, which builds one per pass,
// each with the extension this package prepends, so anything kept per
// instance is kept per request. Read as the difference between two points of
// one curve, so whatever is allocated once cancels.
import { n, record, runtime, within } from './collect.ts';
import { loaders, log, serverEvent, table } from './data.ts';

const WARM = 1_500;
const COUNT = 3_000;
const TIMEOUT = 120;

const gc = (globalThis as { gc?: () => void }).gc;

if (!gc) throw new Error('The heap rows need --expose-gc: run them through `pnpm run bench`.');

// Typed, so a read allocates no number of its own.
const heap = new Float64Array(2);

const tick = () => new Promise((resolve) => setImmediate(resolve));

// The heap in use once the tasks already queued have run and two collections
// have freed what they can: a queued task keeps what it references until it
// runs, and a second collection still frees a little the first one leaves.
// What a collection leaves for a task to free (on Node 22, what loading one
// of Node's own modules leaves, as the first `Request` loads fetch's) is freed
// before the reading, so it lands ahead of the first point instead of between
// the two.
const read = async (point: number) => {
  await tick();
  gc();
  await tick();
  gc();
  gc();
  heap[point] = process.memoryUsage().heapUsed;
};

/** The heap `act` retains per call, from the `WARM`th call to the `WARM + COUNT`th. */
const retained = async (what: string, act: () => Promise<unknown>) => {
  const repeat = async (count: number) => {
    for (let i = 0; i < count; i++) await act();
  };

  await within(TIMEOUT, what, repeat(WARM));
  await read(0);
  await within(TIMEOUT, what, repeat(COUNT));
  await read(1);

  return (heap[1] - heap[0]) / COUNT;
};

const config = { log, loaders: loaders(table(200), ['en', 'cs']) };

{
  const { I18n } = await runtime('client');

  record(`heap retained per instance built, loaded and dropped, from ${n(WARM)} to ${n(WARM + COUNT)} instances`, 'heap', 'B', await retained('Building instances', () => new I18n(config).loadTranslations('en', '/')));
}

{
  const { defineI18n } = await runtime('server');
  const { load } = defineI18n(config);

  record(`heap retained per page render through the server and universal loads, from ${n(WARM)} to ${n(WARM + COUNT)} renders`, 'heap', 'B', await retained('Rendering pages', async () => {
    const data = await load(serverEvent());

    return load({ url: new URL('https://x.test/'), params: {}, route: { id: '/' }, data });
  }));
}
