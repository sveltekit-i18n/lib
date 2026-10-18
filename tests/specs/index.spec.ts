import { describe, expect, it, vi } from 'vitest';
import i18n from '../../src';
import { CONFIG } from '../data';

import type { Extension, Logger, Parser, Report } from '../../src';

const { initLocale = 'en' } = CONFIG;

describe('instance', () => {
  it('exposes the core surface', () => {
    const instance = new i18n();

    [
      'loading', 'initialized', 'locale', 'locales', 'translations', 'rawTranslations',
      't', 'l', 'loadConfig', 'loadTranslations', 'addTranslations', 'setLocale',
      'setRoute', 'loadNamespace', 'invalidate', 'snapshot', 'hydrate', 'destroy',
    ].forEach((member) => expect(instance).toHaveProperty(member));
  });

  it('loads translations and activates the locale', async () => {
    const instance = new i18n(CONFIG);

    await instance.loadTranslations(initLocale);

    expect(instance.locale).toBe('en');
    expect(instance.locales).toContain('en');
    expect(instance.translations.en).toEqual(expect.objectContaining({ 'common.no_placeholder': 'NO_PLACEHOLDER' }));
  });

  it('renders a missing translation as its key', async () => {
    const instance = new i18n(CONFIG);

    await instance.loadTranslations(initLocale);

    // The seam neither half's suite covers: the core answers the miss and the
    // parser is not called, and the curly parser resolves a message it is not
    // given to the empty string. Composed, the key has to survive.
    expect(instance.t('common.nonexistent')).toBe('common.nonexistent');
  });

  it('reads a locale the call names through `l`', async () => {
    const instance = new i18n(CONFIG);

    await instance.loadTranslations('zh-Hans');

    expect(instance.l('zh-Hans', 'common.placeholder', { value: 'TEST' })).toBe('VALUE: TEST');
  });

  it('keeps raw and preprocessed translations in step', async () => {
    const instance = new i18n(CONFIG);

    await instance.loadTranslations(initLocale);

    expect(instance.rawTranslations.en.common.no_placeholder).toBe('NO_PLACEHOLDER');
    expect(instance.translations.en['common.no_placeholder']).toBe('NO_PLACEHOLDER');
  });

  it('builds an instance with the parser from a `null` config', () => {
    const instance = new i18n(null as unknown as undefined);

    instance.addTranslations({ [initLocale]: { a: 'VALUE: {{value}}' } });

    expect(instance.l(initLocale, 'a', { value: 'TEST' })).toBe('VALUE: TEST');
  });

  // v2 overrode `loadConfig` by calling the core's private config loader, which
  // skipped this guard; the v3 wiring patches the public method instead.
  it('keeps the core guard that ignores a call on a destroyed instance', async () => {
    const instance = new i18n();

    instance.destroy();
    await instance.loadConfig(CONFIG);

    expect(instance.initialized).toBe(false);
    expect(instance.locale).toBe(undefined);
  });

  // Residual difference to the v2 class, documented rather than fixed: the
  // constructor returns the core's instance, and `config.extensions` may
  // replace it again.
  it('is not an `instanceof` the exported constructor', () => {
    expect(new i18n(CONFIG) instanceof i18n).toBe(false);
  });
});

describe('parser wiring', () => {
  it('interpolates without the consumer supplying a parser', async () => {
    const instance = new i18n(CONFIG);

    await instance.loadTranslations(initLocale);

    expect(instance.t('common.placeholder', { value: 'TEST' })).toBe('VALUE: TEST');
    expect(instance.t('common.placeholder_default')).toBe('VALUE: DEFAULT_VALUE');
  });

  it('takes `parserOptions` through the constructor', async () => {
    const instance = new i18n({ ...CONFIG, parserOptions: { customModifiers: { test: ({ value }) => value } } });

    await instance.loadTranslations(initLocale);

    expect(instance.t('common.modifier_custom', { data: 'TEST_STRING' })).toBe('TEST_STRING');
  });

  it('takes `parserOptions` through `loadConfig`', async () => {
    const instance = new i18n();
    const value = 123456.78987;

    await instance.loadConfig({ ...CONFIG, parserOptions: { modifierDefaults: { number: { maximumFractionDigits: 4 } } } });

    expect(instance.t('common.modifier_number', { value })).toBe(
      new Intl.NumberFormat(initLocale, { maximumFractionDigits: 4 }).format(value),
    );
  });

  it('keeps the parser when a reconfiguration names no parser options', async () => {
    const instance = new i18n({ ...CONFIG, parserOptions: { customModifiers: { test: ({ value }) => value } } });

    await instance.loadConfig(CONFIG);

    expect(instance.t('common.placeholder', { value: 'TEST' })).toBe('VALUE: TEST');
  });

  // Every report the parser makes, unknown modifier and all, for a logger to see.
  const report = async (instance: { loadTranslations: (locale: string) => Promise<void>; t: (key: string, payload: object) => string }) => {
    await instance.loadTranslations(initLocale);
    instance.t('common.modifier_unknown', { value: 'TEST' });
  };

  const recorder = () => {
    const calls: [Logger.Level, string][] = [];
    const logger: Logger.T = {
      error: (message) => calls.push(['error', message]),
      warn: (message) => calls.push(['warn', message]),
      debug: (message) => calls.push(['debug', message]),
    };

    return { calls, logger };
  };

  it('sends reports to the configured logger at `warn` by default', async () => {
    const { calls, logger } = recorder();

    await report(new i18n({ ...CONFIG, log: { logger } }));

    expect(calls).toEqual([['warn', expect.stringMatching(/^\[i18n\]: .+ \(unknown-modifier in "common\.modifier_unknown": .+\)$/)]]);
  });

  it('sends reports to `console.warn` without a logger configured', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await report(new i18n({ ...CONFIG, log: undefined }));

    expect(spy).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('unknown-modifier'));
    spy.mockRestore();
  });

  it('keeps reports below the configured level silent', async () => {
    const { calls, logger } = recorder();

    await report(new i18n({ ...CONFIG, log: { logger, level: 'error' } }));

    expect(calls).toEqual([]);
  });

  it('discards reports when `parserOptions.onReport` is `null`', async () => {
    const { calls, logger } = recorder();

    await report(new i18n({ ...CONFIG, log: { logger }, parserOptions: { onReport: null } }));

    expect(calls).toEqual([]);
  });

  it('sends reports to the logger when `parserOptions.onReport` is `undefined`', async () => {
    const { calls, logger } = recorder();

    await report(new i18n({ ...CONFIG, log: { logger }, parserOptions: { onReport: undefined } }));

    expect(calls).toEqual([['warn', expect.stringContaining('unknown-modifier')]]);
  });

  it('writes a key with a line or paragraph separator on one line', async () => {
    const { calls, logger } = recorder();
    const instance = new i18n({ ...CONFIG, log: { logger } });

    await instance.loadTranslations(initLocale);
    instance.addTranslations({ [initLocale]: { 'a\u2028b\u2029c': '{{value:nosuch;}}' } });
    instance.t('a\u2028b\u2029c', { value: 'TEST' });

    expect(calls).toEqual([['warn', expect.stringContaining(' in "a\\u2028b\\u2029c": ')]]);
  });

  it('keeps the logger through a reconfiguration that names none', async () => {
    const { calls, logger } = recorder();
    const instance = new i18n({ log: { logger } });

    await instance.loadConfig({ ...CONFIG, log: undefined });
    await report(instance);

    expect(calls).toEqual([['warn', expect.stringContaining('unknown-modifier')]]);
  });

  it('takes the logger a reconfiguration names', async () => {
    const before = recorder();
    const after = recorder();
    const instance = new i18n({ log: { logger: before.logger } });

    await instance.loadConfig({ ...CONFIG, log: { logger: after.logger } });
    await report(instance);

    expect(before.calls).toEqual([]);
    expect(after.calls).toEqual([['warn', expect.stringContaining('unknown-modifier')]]);
  });

  it('fails soft on a reconfiguration without a config', async () => {
    const instance = new i18n(CONFIG);

    await expect(instance.loadConfig(undefined as never)).resolves.toBeUndefined();
  });

  it.each([undefined, null])('keeps the config through a reconfiguration with %s', async (missing) => {
    const instance = new i18n(CONFIG);
    const { locales } = instance;

    await instance.loadConfig(missing as never);

    expect(instance.locales).toEqual(locales);
  });

  it('routes reports to `parserOptions.onReport`', async () => {
    const reports: Report[] = [];
    const instance = new i18n({ ...CONFIG, parserOptions: { onReport: (report) => reports.push(report) } });

    await instance.loadTranslations(initLocale);
    instance.t('common.modifier_unknown', { value: 'TEST' });

    expect(reports).toEqual([expect.objectContaining({ code: 'unknown-modifier' })]);
  });

  // This package states `onReport` and nothing else, so every other option the
  // parser takes has to reach it exactly as the consumer spelled it.
  it('hands the payload-reading options on untouched', async () => {
    const suspects: Parser.Suspect[] = [];
    const instance = new i18n({
      ...CONFIG,
      parserOptions: { recognizeWrappers: false, onSuspectValue: (suspect) => { suspects.push(suspect); } },
    });

    await instance.loadTranslations(initLocale);

    // Wrappers off, a wrapper-shaped entry is data like any other and converts as one.
    expect(instance.t('common.placeholder', { value: { default: 'WRAPPED' } })).toBe('VALUE: {"default":"WRAPPED"}');
    // A value holding what version 1 read as syntax reaches the output as it stands.
    expect(instance.t('common.placeholder', { value: '{{value}}' })).toBe('VALUE: {{value}}');
    expect(suspects).toEqual([{ found: ['placeholder'], placeholder: '{{value}}', id: 'common.placeholder', text: '{{value}}' }]);
  });
});

describe('extensions', () => {
  const withMark: Extension.T = (instance) => Object.assign(instance, { marked: true });

  it('runs the consumer pipe over the configured instance', async () => {
    const instance = new i18n({ ...CONFIG, extensions: [withMark] });

    await instance.loadTranslations(initLocale);

    expect(instance.marked).toBe(true);
    expect(instance.t('common.placeholder', { value: 'TEST' })).toBe('VALUE: TEST');
  });

  it('hands the pipe an instance whose `loadConfig` already carries the parser', async () => {
    const instance = new i18n({ extensions: [withMark] });

    await instance.loadConfig(CONFIG);

    expect(instance.marked).toBe(true);
    expect(instance.t('common.placeholder', { value: 'TEST' })).toBe('VALUE: TEST');
  });
});
