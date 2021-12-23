import { Config } from '../../src';
import { ModifierOption } from '../../src/types';

const findOption = (options: ModifierOption[], key: string, defaultValue?: string) => options.find((option) => option.key === key)?.value || defaultValue as any;

export const CONFIG:Config = {
  initLocale: 'en',
  loaders: [
    {
      key: 'common',
      locale: 'en',
      loader: async () => (import('../data/translations/en/common.json')),
    },
    {
      key: 'common',
      locale: 'cs',
      loader: async () => (import('../data/translations/cs/common.json')),
    },
  ],
  customModifiers: {
    test: (value) => value,
    date: (value, options, defaultValue = '', locale = '') => (
      locale && new Intl.DateTimeFormat(locale, { dateStyle: findOption(options, 'dateStyle', 'medium'), timeStyle: findOption(options, 'timeStyle', 'short') }).format(+value || +defaultValue)
    ),
  },
};

export const TRANSLATIONS: Record<string, any> = {
  'en': {
    'common.no_placeholder': 'NO_PLACEHOLDER',
  },
  'cs': {
    'common.no_placeholder': 'NO_PLACEHOLDER',
  },
};