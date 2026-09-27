import type { Config } from '../../src/types';

export const CONFIG: Config = {
  initLocale: 'en',
  log: {
    level: 'error',
  },
  loaders: [
    {
      namespace: 'common',
      locale: 'EN',
      loader: async () => (await import('./translations/en/common.json')).default,
    },
    {
      namespace: 'route',
      locale: 'EN',
      routes: ['/path'],
      loader: async () => (await import('./translations/en/route.json')).default,
    },
    {
      namespace: 'common',
      locale: 'zh-Hans',
      loader: async () => (await import('./translations/zh-Hans/common.json')).default,
    },
  ],
};
