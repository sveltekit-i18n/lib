import type { Config } from '../../src/types';
export { default as TRANSLATIONS } from './translations';

export const CONFIG:Config<
{} /* Add your payload props here */,
{} /* Add your modifier props here */
> = {
  initLocale: 'en',
  loaders: [
    {
      key: 'common',
      locale: 'EN',
      loader: async () => (import('../data/translations/en/common.json')),
    },
    {
      key: 'route1',
      locale: 'EN',
      routes: [/./],
      loader: async () => (import('../data/translations/en/route.json')),
    },
    {
      key: 'route2',
      locale: 'EN',
      routes: ['/path#hash?a=b&c=d'],
      loader: async () => (import('../data/translations/en/route.json')),
    },
    {
      key: 'common',
      locale: 'cs',
      loader: async () => (import('../data/translations/cs/common.json')),
    },
  ],
  parserOptions: {
    customModifiers: {
      test: (({ value }) => value),
    },
  },
};