import { describe, expect, it, vi } from 'vitest';
import i18n from '../../src';
import { CONFIG } from '../data';

import type { Extension, Parser, Report } from '../../src';

const { initLocale = 'en' } = CONFIG;

describe('instance', () => {
  it('exposes the core surface', () => {
    const instance = new i18n();

    [
      'loading', 'initialized', 'locale', 'locales', 'translations', 'rawTranslations',
      't', 'l', 'loadConfig', 'loadTranslations', 'addTranslations', 'setLocale',
      'setRoute', 'invalidate', 'snapshot', 'destroy',
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

  it('writes no report anywhere by default', async () => {
    const instance = new i18n(CONFIG);
    const spies = (['error', 'warn', 'info', 'debug', 'log'] as const).map((level) => vi.spyOn(console, level).mockImplementation(() => {}));

    await instance.loadTranslations(initLocale);
    instance.t('common.modifier_unknown', { value: 'TEST' });

    spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
    spies.forEach((spy) => spy.mockRestore());
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
