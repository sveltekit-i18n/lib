import i18n, { Parser } from '../../src/index';
import { CONFIG } from '../data';

const { initLocale = '' } = CONFIG;

describe('Default parser', () => {
  it('returns a key string if not defined', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.undefined')).toBe('common.undefined');
  });
  it('key returns proper value', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.no_placeholder')).toBe('NO_PLACEHOLDER');
  });
  it('placeholders work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.placeholder', { value: 'TEST_VALUE' })).toBe('VALUES: TEST_VALUE, TEST_VALUE, TEST_VALUE, TEST_VALUE');
  });
  it('placeholders in payload work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any, another: string }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.placeholder', { value: 'TEST_{{another}}', another: 'VALUE' })).toBe('VALUES: TEST_VALUE, TEST_VALUE, TEST_VALUE, TEST_VALUE');
  });
  it('default value works for placeholders', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.placeholder_default')).toBe('VALUES: DEFAULT_VALUE, DEFAULT_VALUE, DEFAULT_VALUE , DEFAULT_VALUE');
  });
  it('dynamic default works for placeholders', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.placeholder_unknown', { default: 'DYNAMIC_DEFAULT_VALUE' })).toBe('DYNAMIC_DEFAULT_VALUE');
  });
  it('placeholders containing escaped values work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ 'pl:ace;holder'?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.placeholder_escaped', { 'pl:ace;holder': 'TEST \\{\\{VALUE\\}\\}' })).toBe('TEST {{VALUE}}');
  });
  it('`eq` modifier works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.modifier_eq', { value: 'option9' })).toBe('VALUES: DEFAULT VALUE, DEFAULT VALUE , DEFAULT VALUE, DEFAULT VALUE  ');
    expect($t('common.modifier_eq', { value: 'option2' })).toBe('VALUES: VALUE2, VALUE2 , VALUE2, VALUE2  ');
    expect($t('common.modifier_eq')).toBe('VALUES: DEFAULT VALUE, DEFAULT VALUE , DEFAULT VALUE, DEFAULT VALUE  ');
  });
  it('`ne` modifier works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.modifier_ne', { value: 10 })).toBe('DEFAULT VALUE');
    expect($t('common.modifier_ne', { value: 5 })).toBe('VALUE2');
    expect($t('common.modifier_ne', { value: 15 })).toBe('VALUE2');
    expect($t('common.modifier_ne')).toBe('VALUE2');
  });
  it('`lt` modifier works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.modifier_lt', { value: 10 })).toBe('DEFAULT VALUE');
    expect($t('common.modifier_lt', { value: 5 })).toBe('VALUE2');
    expect($t('common.modifier_lt')).toBe('DEFAULT VALUE');
  });
  it('`lte` modifier works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.modifier_lte', { value: 10 })).toBe('VALUE2');
    expect($t('common.modifier_lte', { value: 5 })).toBe('VALUE2');
    expect($t('common.modifier_lte')).toBe('DEFAULT VALUE');
  });
  it('`gt` modifier works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.modifier_gt', { value: 10 })).toBe('VALUE1');
    expect($t('common.modifier_gt', { value: 15 })).toBe('VALUE2');
    expect($t('common.modifier_gt')).toBe('DEFAULT VALUE');
  });
  it('`gte` modifier works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.modifier_gte', { value: 10 })).toBe('VALUE2');
    expect($t('common.modifier_gte', { value: 15 })).toBe('VALUE2');
    expect($t('common.modifier_gte')).toBe('DEFAULT VALUE');
  });
  it('`number` modifier works', async () => {
    const { t, locales, locale, loadConfig, loadTranslations } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const value = 123456.789;
    const altLocale = locales.get().find((l) => l !== initLocale) || '';

    expect(t.get('common.modifier_number', { value })).toBe(new Intl.NumberFormat(initLocale, { maximumFractionDigits: 2 }).format(value));

    locale.set(altLocale);
    await loadTranslations(altLocale);

    expect(t.get('common.modifier_number', { value })).toBe(new Intl.NumberFormat(altLocale, { maximumFractionDigits: 2 }).format(value));
  });
  it('`number` props work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);

    const value = 123456.78987686643;

    expect(t.get('common.modifier_number', { value }, { number: { maximumFractionDigits: 4 } })).toBe(new Intl.NumberFormat(initLocale, { maximumFractionDigits: 4 }).format(value));
  });
  it('`number` defaults work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig({ ...CONFIG, parserOptions: { modifierDefaults: { number: { maximumFractionDigits: 4 } } } });
    const value = 123456.78987686643;

    expect(t.get('common.modifier_number', { value })).toBe(new Intl.NumberFormat(initLocale, { maximumFractionDigits: 4 }).format(value));
  });
  it('`date` modifier works', async () => {
    const { t, loadConfig, loadTranslations, locale, locales } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const value = Date.now();
    const altLocale = locales.get().find((l) => l !== initLocale) || '';

    expect(t.get('common.modifier_date', { value })).toBe(new Intl.DateTimeFormat(initLocale, {}).format(value));

    locale.set(altLocale);
    await loadTranslations(altLocale);

    expect(t.get('common.modifier_date', { value })).toBe(new Intl.DateTimeFormat(altLocale, {}).format(value));
  });
  it('`date` props work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const value = Date.now();

    expect(t.get('common.modifier_date', { value }, { date: { year: '2-digit', month: 'numeric', day: 'numeric' } })).toBe(new Intl.DateTimeFormat(initLocale, { year: '2-digit', month: 'numeric', day: 'numeric' }).format(value));
  });
  it('`date` defaults work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig({ ...CONFIG, parserOptions: { modifierDefaults: { date: { timeStyle: 'full' } } } });
    const value = Date.now();

    expect(t.get('common.modifier_date', { value })).toBe(new Intl.DateTimeFormat(initLocale, { timeStyle: 'full' }).format(value));
  });
  it('`ago` modifier works', async () => {
    const { t, loadConfig, loadTranslations, locale, locales } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const value = -1000 * 60 * 30;
    const altLocale = locales.get().find((l) => l !== initLocale) || '';

    expect(t.get('common.modifier_ago', { value })).toBe(new Intl.RelativeTimeFormat(initLocale).format(-30, 'minute'));

    locale.set(altLocale);
    await loadTranslations(altLocale);

    expect(t.get('common.modifier_ago', { value })).toBe(new Intl.RelativeTimeFormat(altLocale).format(-30, 'minute'));
  });
  it('`ago` props work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const value = -1000 * 60 * 60 * 24 * 7;

    expect(t.get('common.modifier_ago', { value }, { ago: { format: 'day' } })).toBe(new Intl.RelativeTimeFormat(initLocale).format(-7, 'day'));
    expect(t.get('common.modifier_ago', { value }, { ago: { format: 'week' } })).not.toBe(new Intl.RelativeTimeFormat(initLocale).format(-7, 'day'));
  });
  it('`ago` defaults work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    const value = -1000 * 60 * 60 * 24 * 7;

    await loadConfig({ ...CONFIG, parserOptions: { modifierDefaults: { ago: { format: 'days' } } } });
    expect(t.get('common.modifier_ago', { value })).toBe(new Intl.RelativeTimeFormat(initLocale).format(-7, 'day'));

    await loadConfig({ ...CONFIG, parserOptions: { modifierDefaults: { ago: { format: 'week' } } } });
    expect(t.get('common.modifier_ago', { value })).not.toBe(new Intl.RelativeTimeFormat(initLocale).format(-7, 'day'));
  });
  it('custom modifier works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ data?: any }>>();

    await loadConfig({
      ...CONFIG, parserOptions: {
        customModifiers: {
          test: ({ value }) => value,
        },
      },
    });
    const $t = t.get;

    expect($t('common.modifier_custom', { data: 'TEST_STRING' })).toBe('TEST_STRING');
  });
  it('modifiers containing escaped values work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ 'va:lue'?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.modifier_escaped', { 'va:lue': 'option:1' })).toBe('VA;{{LUE}}:1');
    expect($t('common.modifier_escaped', { 'va:lue': 'option:2' })).toBe('VA;{{LUE}}:2');
    expect($t('common.modifier_escaped')).toBe('DEFAULT {{VALUE}};');
  });
  it('with user-defined locale works', async () => {
    const { t, l, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $l = l.get;
    const $t = t.get;

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