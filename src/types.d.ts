import { Readable } from 'svelte/store';

import type { CustomModifiers } from './parser/types';

export type LoadingStore = Readable<boolean> & { toPromise: () => Promise<void[]>, get: () => boolean };

export type Loader = () => Promise<Record<any, any>>;

export type Route = string | RegExp;

export type LoaderModule = {
  key: string;
  locale: string;
  routes?: Route[];
  loader: Loader;
};

export type DotNotationInput = Record<string, any> | null | undefined | any;

export type DotNotationOutput = Record<string, any>;

export type ToDotNotation = (input: DotNotationInput, parentKey?: string) => DotNotationOutput;

export type FetchTranslations = (loaders: LoaderModule[]) => Promise<Record<string, DotNotationOutput>>;

export type TranslationFunction = (key: string, vars?: Record<any, any>) => string;

export type LocalTranslationFunction = (locale: string, key: string, vars?: Record<any, any>) => string;

export type ExtendedStore<T, Get = () => T, Store = Readable<T>> = Store & { get: Get };

export type ConfigTranslations = { [locale: string]: Record<string, any> };

export type Translations = { [locale: string]: Record<string, string> };

export type Config = {
  loaders?: LoaderModule[];
  translations?: ConfigTranslations;
  initLocale?: string;
  fallbackLocale?: string;
  customModifiers?: CustomModifiers;
};

export type GetConfig = (...params: any) => Config;