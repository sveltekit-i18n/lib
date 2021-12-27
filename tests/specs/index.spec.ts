import { get } from 'svelte/store';
import i18n from '../../src/index';
import { CONFIG, TRANSLATIONS } from '../data';
import { filterTranslationKeys } from '../utils';

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
  it('`setRoute` method does not trigger loading if locale is not set', async () => {
    const { initialized, setRoute, loading, locale } = new i18n({ loaders });

    setRoute('/');
    const $initialized = get(initialized);
    const $loading = get(loading);
    const $locale = get(locale);

    expect($locale).toBe(undefined);
    expect($initialized).toBe(false);
    expect($loading).toBe(false);
  });
  it('`setRoute` method does trigger loading if locale is set', async () => {
    const { initialized, setRoute, initLocale: setLocale, loading } = new i18n({ loaders });

    await setLocale(initLocale);
    setRoute('/');
    const $loading = get(loading);
    expect($loading).toBe(true);

    const $initialized = get(initialized);
    expect($initialized).toBe(false);
  });
  it('`initLocale` method does not trigger loading when route is not set', async () => {
    const { initLocale: setLocale, loading } = new i18n({ loaders });

    setLocale(initLocale);

    const $loading = get(loading);
    expect($loading).toBe(false);
  });
  it('`initLocale` method triggers loading when route is set', async () => {
    const { initLocale: setLocale, setRoute, loading } = new i18n({ loaders });

    await setRoute('');
    setLocale(initLocale);

    const $loading = get(loading);
    expect($loading).toBe(true);
  });
  it('`initLocale` does not set `unknown` locale', async () => {
    const { initLocale: setLocale, loading, locale } = new i18n({ loaders });

    setLocale('unknown');

    const $loading = get(loading);
    const $locale = get(locale);

    expect($loading).toBe(false);
    expect($locale).toBe(undefined);
  });
  it('setting `locale` does not initialize `translations` if route is not set', async () => {
    const { loading, locale, initialized } = new i18n({ loaders });

    locale.set(initLocale);

    const $loading = get(loading);
    expect($loading).toBe(false);

    await loading.toPromise();

    const $initialized = get(initialized);
    expect($initialized).toBe(false);

  });
  it('setting `locale` initializes `translations` if route is set', async () => {
    const { loading, locale, setRoute, initialized } = new i18n({ loaders });
    await setRoute('');
    locale.set(initLocale);

    const $loading = get(loading);
    expect($loading).toBe(true);

    await loading.toPromise();

    const $initialized = get(initialized);
    expect($initialized).toBe(true);

  });
  it('`getTranslationProps` method works', async () => {
    const { initialized, getTranslationProps } = new i18n({ loaders });

    const [translations = {}] = await getTranslationProps(initLocale);
    const $initialized = get(initialized);

    const keys = (loaders || []).filter(({ routes }) => !routes).map(({ key }) => key);

    expect(translations[initLocale]).toEqual(
      expect.objectContaining(filterTranslationKeys(TRANSLATIONS[initLocale], keys)),
    );

    expect($initialized).toBe(false);
  });
  it('`addTranslations` method works', async () => {
    const { addTranslations, translations } = new i18n();

    addTranslations(TRANSLATIONS);
    const $translations = get(translations);

    expect($translations).toEqual(
      expect.objectContaining(TRANSLATIONS),
    );
  });
  it('`addTranslations` prevents duplicit `loading`', async () => {
    const { addTranslations, loadTranslations, loading } = new i18n({ loaders, customModifiers });

    addTranslations(TRANSLATIONS);
    loadTranslations(initLocale);

    expect(get(loading)).toBe(false);
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
  it('`loading` works correctly', async () => {
    const { loading, loadConfig } = new i18n();

    const testArray = [false, true, false];
    const outputArray: boolean[] = [];

    loading.subscribe(($loading) => {
      outputArray.push($loading);
    });

    await loadConfig(CONFIG).then(() => expect(get(loading)).toBe(false));

    testArray.forEach((value, index) => {
      expect(value).toBe(testArray[index]);
    });
  });
  it('includes `locales` after config load', async () => {
    const { locales, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $locales = get(locales);

    expect($locales).toContain(initLocale);
  });
  it('includes current `locale` value', async () => {
    const { locale, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $locale = get(locale);

    expect($locale).toBe(initLocale);
  });
  it('includes `translations` for `initLocale` only after config load', async () => {
    const { translations, locales, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $translations = get(translations);
    const $locales = get(locales);

    const keys = (loaders || []).filter(({ routes }) => !routes).map(({ key }) => key);

    $locales.forEach((locale) => {
      expect($translations[locale]).toEqual(
        (locale === initLocale) ? expect.objectContaining(filterTranslationKeys(TRANSLATIONS[locale], keys)) : expect.not.objectContaining(TRANSLATIONS[locale]),
      );
    });
  });
  it('includes `translations` only for loaders without routes', async () => {
    const { translations, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $translations = get(translations);

    const keys = (loaders || []).filter(({ routes }) => !!routes).map(({ key }) => key);

    expect($translations[initLocale]).toEqual(
      expect.not.objectContaining(filterTranslationKeys(TRANSLATIONS[initLocale], keys)),
    );
  });
  it('`loadTranslations` method works without route', async () => {
    const { initialized, loadConfig, loadTranslations } = new i18n();

    await loadConfig({ loaders, customModifiers });
    expect(get(initialized)).toBe(false);

    await loadTranslations(initLocale);
    expect(get(initialized)).toBe(true);
  });
  it('`loadTranslations` method works for given routes only', async () => {
    const { loadTranslations, translations } = new i18n({ loaders, customModifiers });
    const url = '/path#hash?a=b&c=d';
    const keys = (loaders || []).filter(({ routes }) => routes?.includes(url)).map(({ key }) => key);

    await loadTranslations(initLocale, '/');
    expect(get(translations)[initLocale]).toEqual(
      expect.not.objectContaining(filterTranslationKeys(TRANSLATIONS[initLocale], keys)),
    );

    await loadTranslations(initLocale, url);
    expect(get(translations)[initLocale]).toEqual(
      expect.objectContaining(TRANSLATIONS[initLocale]),
    );
  });
});

describe('translation', () => {
  it('returns a key string if not defined', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.undefined')).toBe('common.undefined');
  });
  it('key returns proper value', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.no_placeholder')).toBe('NO_PLACEHOLDER');
  });
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
  it('`ne` modifier works', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.modifier_ne', { value: 10 })).toBe('DEFAULT VALUE');
    expect($t('common.modifier_ne', { value: 5 })).toBe('VALUE2');
    expect($t('common.modifier_ne', { value: 15 })).toBe('VALUE2');
    expect($t('common.modifier_ne')).toBe('VALUE2');
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
  it('`number` modifier works', async () => {
    const { t, locales, locale, loadConfig, loadTranslations } = new i18n();

    await loadConfig(CONFIG);
    const value = 123456.789;
    const altLocale = get(locales).find((l) => l !== initLocale) || '';

    expect(get(t)('common.modifier_number', { value })).toBe(new Intl.NumberFormat(initLocale, { maximumFractionDigits: 2 }).format(value));

    locale.set(altLocale);
    await loadTranslations(altLocale);

    expect(get(t)('common.modifier_number', { value })).toBe(new Intl.NumberFormat(altLocale, { maximumFractionDigits: 2 }).format(value));
  });
  it('`date` modifier works', async () => {
    const { t, loadConfig, loadTranslations, locale, locales } = new i18n();

    await loadConfig(CONFIG);
    const value = Date.now();
    const altLocale = get(locales).find((l) => l !== initLocale) || '';

    expect(get(t)('common.modifier_date', { value })).toBe(new Intl.DateTimeFormat(initLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(value));

    locale.set(altLocale);
    await loadTranslations(altLocale);

    expect(get(t)('common.modifier_date', { value })).toBe(new Intl.DateTimeFormat(altLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(value));
  });
  it('`ago` modifier works', async () => {
    const { t, loadConfig, loadTranslations, locale, locales } = new i18n();

    await loadConfig(CONFIG);
    const value = Date.now() - 1000 * 60 * 30;
    const altLocale = get(locales).find((l) => l !== initLocale) || '';

    expect(get(t)('common.modifier_ago', { value })).toBe(new Intl.RelativeTimeFormat(initLocale).format(-30, 'minute'));

    locale.set(altLocale);
    await loadTranslations(altLocale);

    expect(get(t)('common.modifier_ago', { value })).toBe(new Intl.RelativeTimeFormat(altLocale).format(-30, 'minute'));
  });
  it('custom modifier works', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.modifier_custom', { data: 'TEST_STRING' })).toBe('TEST_STRING');
  });
  it('modifiers containing escaped values work', async () => {
    const { t, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $t = get(t);

    expect($t('common.modifier_escaped', { 'va:lue': 'option:1' })).toBe('VA;{{LUE}}:1');
    expect($t('common.modifier_escaped', { 'va:lue': 'option:2' })).toBe('VA;{{LUE}}:2');
    expect($t('common.modifier_escaped')).toBe('DEFAULT {{VALUE}};');
  });
  it('with user-defined locale works', async () => {
    const { t, l, loadConfig } = new i18n();

    await loadConfig(CONFIG);
    const $l = get(l);
    const $t = get(t);

    const tests: Array<[string, any]> = [
      ['common.undefined', undefined],
      ['common.no_placeholder', undefined],
      ['common.placeholder', { value: 'TEST_VALUE' }],
      ['common.modifier_gte', { value: 10 }],
      ['common.modifier_custom', { data: 'TEST_STRING' }],
      ['common.modifier_escaped', { 'va:lue': 'option:2' }],
    ];

    tests.forEach((options) => {
      expect($l(initLocale, ...options)).toBe($t(...options));
    });
  });
});