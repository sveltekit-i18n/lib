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
  // `loadTranslations` method works without route
  // `loadTranslations` method works for route
  // `addTranslations` method works
  // `addTranslations` prevents duplicit `loading`
});

describe('interpolation', () => {
  it('placeholders work', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.placeholder', { value: 'TEST_VALUE' })).toBe('VALUES: TEST_VALUE, TEST_VALUE, TEST_VALUE, TEST_VALUE');
  });
  it('placeholders in payload work', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.placeholder', { value: 'TEST_{{another}}', another: 'VALUE' })).toBe('VALUES: TEST_VALUE, TEST_VALUE, TEST_VALUE, TEST_VALUE');
  });
  it('default value works for placeholders', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.placeholder_default')).toBe('VALUES: DEFAULT_VALUE, DEFAULT_VALUE, DEFAULT_VALUE, DEFAULT_VALUE');
  });
  it('placeholders containing escaped values work', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.placeholder_escaped', { 'pl:ace;holder': 'TEST \\{\\{VALUE\\}\\}' })).toBe('TEST {{VALUE}}');
  });
  it('`eq` modifier works', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.modifier_eq', { value: 'option9' })).toBe('VALUES: DEFAULT VALUE, DEFAULT VALUE, DEFAULT VALUE, DEFAULT VALUE');
    expect($t('common.modifier_eq', { value: 'option2' })).toBe('VALUES: VALUE2, VALUE2, VALUE2, VALUE2');
    expect($t('common.modifier_eq')).toBe('VALUES: DEFAULT VALUE, DEFAULT VALUE, DEFAULT VALUE, DEFAULT VALUE');
  });
  it('`lt` modifier works', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.modifier_lt', { value: 10 })).toBe('DEFAULT VALUE');
    expect($t('common.modifier_lt', { value: 5 })).toBe('VALUE2');
    expect($t('common.modifier_lt')).toBe('DEFAULT VALUE');
  });
  it('`lte` modifier works', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.modifier_lte', { value: 10 })).toBe('VALUE2');
    expect($t('common.modifier_lte', { value: 5 })).toBe('VALUE2');
    expect($t('common.modifier_lte')).toBe('DEFAULT VALUE');
  });
  it('`gt` modifier works', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.modifier_gt', { value: 10 })).toBe('VALUE1');
    expect($t('common.modifier_gt', { value: 15 })).toBe('VALUE2');
    expect($t('common.modifier_gt')).toBe('DEFAULT VALUE');
  });
  it('`gte` modifier works', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.modifier_gte', { value: 10 })).toBe('VALUE2');
    expect($t('common.modifier_gte', { value: 15 })).toBe('VALUE2');
    expect($t('common.modifier_gte')).toBe('DEFAULT VALUE');
  });
  it('custom modifier works', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.modifier_custom', { data: 'TEST_STRING' })).toBe('TEST_STRING');
  });
  it('date modifier implementation works', async () => {
    const { t, loadConfig, locale, locales } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);
    const value = Date.now();
    const altLocale = get(locales).find((l) => l !== initLocale) || '';

    expect($t('common.modifier_date', { value })).toBe(customModifiers?.date(value, [], '', initLocale));
    locale.set(altLocale);
    expect($t('common.modifier_date', { value })).toBe(customModifiers?.date(value, [], '', altLocale));
  });
  it('modifiers containing escaped values work', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.modifier_escaped', { 'va:lue': 'option:1' })).toBe('VA;{{LUE}}:1');
    expect($t('common.modifier_escaped', { 'va:lue': 'option:2' })).toBe('VA;{{LUE}}:2');
    expect($t('common.modifier_escaped')).toBe('DEFAULT {{VALUE}};');
  });
});