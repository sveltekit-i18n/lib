import { Readable } from 'svelte/store';

export type Loading = Readable<boolean> & { toPromise: () => Promise<void[]> };

export type Loader = () => Promise<Record<any, any>> | Record<any, any>;

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

export type GetTranslation = (loaders: LoaderModule[]) => Promise<DotNotationOutput>;

export type Translate = (translation: Record<any, any>, key: string, vars?: Record<any, any>, customModifiers?: CustomModifiers, locale?: string) => string;

export type TranslationFunction = (key: string, vars?: Record<any, any>) => string;

export type LocalTranslationFunction = (locale: string, key: string, vars?: Record<any, any>) => string;

export type TranslationStore<T> = Readable<T> & { get: T };

export type ConfigTranslations = Record<string, Record<string, any>>;

export type Translations = Record<string, Record<string, string>>;

export type Config = {
  loaders?: LoaderModule[];
  initLocale?: string;
  customModifiers?: CustomModifiers;
};

export type GetConfig = (...params: any) => Config;

export type ModifierKey = 'lt' | 'lte' | 'eq' | 'gte' | 'gt';

export type ModifierOption =  Record<'key' | 'value', string>;

export type Modifier = (value: any, options:ModifierOption[], defaultValue?: string, locale?: string) => string;

export type DefaultModifiers = Record<ModifierKey, Modifier>;

export type CustomModifiers = Record<string, Modifier>;