import type { ParserOptions } from '@sveltekit-i18n/parser-default';

export type Loader = () => Promise<Record<any, any>>;

export type Route = string | RegExp;

export type LoaderModule = {
  key: string;
  locale: string;
  routes?: Route[];
  loader: Loader;
};

export type ConfigTranslations = { [locale: string]: Record<string, any> };

export type Config = {
  loaders?: LoaderModule[];
  translations?: ConfigTranslations;
  initLocale?: string;
  fallbackLocale?: string;
  parserOptions?: ParserOptions;
};