import { get } from 'svelte/store';
import i18n from '../../src/index';
import { CONFIG, TRANSLATIONS } from '../data';

const { initLocale = '', loaders, customModifiers } = CONFIG;

describe('i18n instance', () => {
  it('exports all properties and methods', () => {
    const instance = new i18n();

    const { toHaveProperty } = expect(instance);

    toHaveProperty('loading');
    toHaveProperty('initialized');
    toHaveProperty('locale');
    toHaveProperty('locales');
    toHaveProperty('translations');
    toHaveProperty('t');
    toHaveProperty('l');
    toHaveProperty('loadConfig');
    toHaveProperty('loadTranslations');
    toHaveProperty('addTranslations');
  });
  it('initializes properly with `initLocale`', async () => {
    const { initialized, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $initialized = get(initialized);

    expect($initialized).toBe(true);
  });
  it('does not initialize without `initLocale`', async () => {
    const { initialized, loadConfig } = new i18n();

    await loadConfig({ loaders, customModifiers });
    const $initialized = get(initialized);

    expect($initialized).toBe(false);
  });
  it('loading works correctly', () => {
    const { loading, loadConfig } = new i18n();

    expect(get(loading)).toBe(false);

    loadConfig(CONFIG).then(() => expect(get(loading)).toBe(false));

    expect(get(loading)).toBe(true);

  });
  it('includes locales after config load', async () => {
    const { locales, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $locales = get(locales);

    expect($locales).toContain(initLocale);
  });
  it('includes current locale value', async () => {
    const { locale, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $locale = get(locale);

    expect($locale).toBe(initLocale);
  });
  it('includes translations for `initLocale` only after config load', async () => {
    const { translations, locales, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $translations = get(translations);
    const $locales = get(locales);

    $locales.forEach((locale) => {
      expect($translations[locale]).toEqual(
        (locale === initLocale) ? expect.objectContaining(TRANSLATIONS[locale]) : expect.not.objectContaining(TRANSLATIONS[locale]),
      );
    });

  });
});

describe('interpolation', () => {
  it('custom modifier works', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.custom_modifier', { data: 'TEST_STRING' })).toBe('TEST_STRING');
  });
  it('date implementation works', async () => {
    const { t, loadConfig, locale } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.date_modifier', { value: '660385200000' })).toBe('Dec 5, 1990, 8:20 AM');
    locale.set('cs');
    expect($t('common.date_modifier', { value: '660385200000' })).toBe('5. 12. 1990 8:20');

  });
});