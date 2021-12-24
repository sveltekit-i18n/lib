import { Config } from '../../src';

export const CONFIG:Config = {
  initLocale: 'en',
  loaders: [
    {
      key: 'common',
      locale: 'en',
      loader: async () => (import('../data/translations/en/common.json')),
    },
    {
      key: 'route1',
      locale: 'en',
      routes: [/./],
      loader: async () => (import('../data/translations/en/route.json')),
    },
    {
      key: 'route2',
      locale: 'en',
      routes: ['/path#hash?a=b&c=d'],
      loader: async () => (import('../data/translations/en/route.json')),
    },
    {
      key: 'common',
      locale: 'cs',
      loader: async () => (import('../data/translations/cs/common.json')),
    },
  ],
  customModifiers: {
    test: (value) => value,
  },
};

export const TRANSLATIONS: Record<string, any> = {
  'en': {
    'common.no_placeholder': 'NO_PLACEHOLDER',
    'route1.key': 'value',
    'route2.key': 'value',
  },
  'cs': {
    'common.no_placeholder': 'NO_PLACEHOLDER',
  },
};