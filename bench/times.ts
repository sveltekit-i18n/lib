// What the composed instance costs where an app pays for it: building it,
// with the parser this package fills in and the extension it prepends,
// reconfiguring it, `t` through it, and `defineI18n`. Compiled for the
// browser, where a tab builds its instance and renders every `t` again.
import { n, record, runtime, time, timeAsync, within } from './collect.ts';
import { key, loaders, log, placeholder, plain, table } from './data.ts';

const KEYS = 10_000;
const TIMEOUT = 120;

const { I18n, defineI18n } = await runtime('client');

const micro = (fn: () => unknown, inner = 2_000) => 1_000 * time(fn, { inner });

{
  // Seeded rather than loaded: a lookup is the same either way, and the core
  // takes seconds to load this many namespaces.
  const i18n = new I18n({ log, translations: { en: table(KEYS) } });

  await within(TIMEOUT, 'Activating the table', i18n.loadTranslations('en', '/'));

  const [hit, withParams] = [key(KEYS / 2), key(KEYS / 2 + 1)];

  // The parser fails soft, and a message it cannot render comes back raw,
  // faster than one it renders: the rows time only what renders.
  const rendered = [i18n.t(hit), i18n.t(withParams, { name: 'Ada' })];
  const expected = [plain(KEYS / 2), placeholder(KEYS / 2 + 1).replace('{{name}}', 'Ada')];

  if (JSON.stringify(rendered) !== JSON.stringify(expected)) throw new Error(`t renders ${JSON.stringify(rendered)}, not ${JSON.stringify(expected)}.`);

  record(`t, a hit (${n(KEYS)} keys)`, 'time', 'µs', micro(() => i18n.t(hit)));
  record(`t, a hit with a placeholder (${n(KEYS)} keys)`, 'time', 'µs', micro(() => i18n.t(withParams, { name: 'Ada' })));
}

{
  const config = { log, loaders: loaders(table(200)) };

  record(`new I18n, a config of ${config.loaders.length} loaders`, 'time', 'µs', micro(() => new I18n(config), 200));

  const i18n = new I18n(config);

  record(`loadConfig, a config of ${config.loaders.length} loaders`, 'time', 'µs', 1_000 * await within(TIMEOUT, 'The loadConfig row', timeAsync(() => i18n.loadConfig(config), { inner: 200 })));

  // A reconfiguration that dropped the parser would be cheaper, and the row
  // would read it as faster.
  await within(TIMEOUT, 'Loading after loadConfig', i18n.loadTranslations('en', '/'));

  if (i18n.t(key(1), { name: 'Ada' }) !== placeholder(1).replace('{{name}}', 'Ada')) throw new Error('loadConfig drops the parser.');

  record(`defineI18n, a config of ${config.loaders.length} loaders`, 'time', 'µs', micro(() => defineI18n(config), 200));
}
