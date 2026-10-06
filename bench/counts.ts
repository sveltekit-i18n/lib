// The parsers this package builds: it fills the core's parser slot with one of
// its own, for each instance, each reconfiguration and each `defineI18n`.
// The instances `/kit` builds per page render reuse the one their config
// carries, so a render builds none.
import { record, runtime, within } from './collect.ts';
import { loaders, log, serverEvent, table } from './data.ts';

const RENDERS = 100;

const config = { log, loaders: loaders(table(1_000), ['en', 'cs']) };
const client = await runtime('client.counted');

/** The parsers `act` built. */
const built = async ({ parsersBuilt }: { parsersBuilt: () => number }, act: () => unknown) => {
  const before = parsersBuilt();

  await within(60, 'A counted act', Promise.resolve(act()));

  return parsersBuilt() - before;
};

const i18n = new client.I18n(config);

record('parsers built, new I18n', 'count', 'parsers', await built(client, () => new client.I18n(config)));
record('parsers built, loadConfig', 'count', 'parsers', await built(client, () => i18n.loadConfig(config)));

const server = await runtime('server.counted');

record(`parsers built, defineI18n and ${RENDERS} page renders through its server and universal loads`, 'count', 'parsers', await built(server, async () => {
  const { load } = server.defineI18n(config);

  for (let render = 0; render < RENDERS; render++) {
    const data = await load(serverEvent());
    const { i18n: rendered } = await load({ url: new URL('https://x.test/'), params: {}, route: { id: '/' }, data });

    if (rendered.locale !== 'cs') throw new Error(`A page render negotiated ${rendered.locale}, not cs.`);
  }
}));
