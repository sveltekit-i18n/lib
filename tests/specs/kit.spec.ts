import { describe, expect, it } from 'vitest';
import { defineI18n } from '../../src/kit';

import type { Extension } from '../../src';

// This package's own wiring only: the core's `/kit` suite covers negotiation,
// the hand-off and the commit. What is left is that every instance the core
// builds here carries the curly parser, and that the core's `browser` split
// survives being reached through this package.
const config = {
  log: { level: 'error' as const },
  loaders: [
    { namespace: 'common', locale: 'en', loader: () => Promise.resolve({ greeting: 'Hi {{name}}!' }) },
    { namespace: 'common', locale: 'cs', loader: () => Promise.resolve({ greeting: 'Ahoj {{name}}!' }) },
  ],
};

const url = (path: string) => new URL(`https://x.test${path}`);

const serverEvent = (path: string, lang: string) => ({
  url: url(path),
  params: {},
  route: { id: path },
  isDataRequest: false,
  cookies: { get: () => undefined },
  request: new Request(`https://x.test${path}`, { headers: { 'accept-language': lang } }),
});

const universalEvent = (path: string, data: Record<string, any> | null) => ({ url: url(path), params: {}, route: { id: path }, data });

describe('/kit', () => {
  it('builds instances that interpolate without the consumer supplying a parser', async () => {
    const { load } = defineI18n(config);

    const { i18n } = await load(universalEvent('/', { i18n: { locale: 'cs', route: '/' } }));

    expect(i18n.locale).toBe('cs');
    expect(i18n.t('common.greeting', { name: 'Jarda' })).toBe('Ahoj Jarda!');
  });

  it('hands the consumer pipe an instance whose `loadConfig` keeps the parser', async () => {
    const seen: unknown[] = [];
    const spy: Extension.T = (instance) => {
      seen.push(instance);

      return instance;
    };

    const { load } = defineI18n({ ...config, extensions: [spy] });
    const { i18n } = await load(universalEvent('/', { i18n: { locale: 'en', route: '/' } }));

    expect(seen).toEqual([i18n]);

    await i18n.loadConfig({ ...config, parserOptions: {}, initLocale: 'en' });

    expect(i18n.t('common.greeting', { name: 'Jarda' })).toBe('Hi Jarda!');
  });

  it('runs the server half in the server compile only', async ({ task }) => {
    const { handle, load } = defineI18n(config);
    const event = serverEvent('/', 'cs');

    if (task.file.projectName === 'client') {
      // The core resolves its `#kit-server` import by the `browser` condition
      // to a stub, which it reaches through its own package here.
      expect(() => handle({ event, resolve: () => new Response() })).toThrow('run on the server only');
      expect(() => load(event)).toThrow('run on the server only');

      return;
    }

    let html = '';

    await handle({
      event,
      resolve: (_event, options) => {
        html = options?.transformPageChunk?.({ html: '<html lang="%lang%">', done: true }) ?? '';

        return new Response(html);
      },
    });

    expect(html).toBe('<html lang="cs">');

    const data = await load(event);
    const { i18n } = await load(universalEvent('/', data));

    expect(i18n.t('common.greeting', { name: 'Jarda' })).toBe('Ahoj Jarda!');
  });
});
