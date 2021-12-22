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
      key: 'common',
      locale: 'cs',
      loader: async () => (import('../data/translations/cs/common.json')),
    },
  ],
  customModifiers: {
    test: () => 'TEST_STRING',
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