import type { Config } from '../../src/types';
export { default as getTranslations } from './translations';

export const CONFIG: Config<
{} /* Add your payload props here */,
{} /* Add your modifier props here */
> = {
  initLocale: 'en',
  log: {
    level: 'error',
  },
  loaders: [
    {
      key: 'common',
      locale: 'EN',
      loader: async () => (await import('../data/translations/en/common.json')).default,
    },
    {
      key: 'route1',
      locale: 'EN',
      routes: [/./],
      loader: async () => (await import('../data/translations/en/route.json')).default,
    },
    {
      key: 'route2',
      locale: 'EN',
      routes: ['/path#hash?a=b&c=d'],
      loader: async () => (await import('../data/translations/en/route.json')).default,
    },
    {
      key: 'common',
      locale: 'zh-Hans',
      loader: async () => (await import('../data/translations/zh-Hans/common.json')).default,
    },
  ],
};