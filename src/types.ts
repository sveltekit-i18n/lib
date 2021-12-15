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

export type GetTranslation = (loaders: LoaderModule[]) => Promise<DotNotationOutput>;

export type Translate = (translation: Record<any, any>, key: string, vars: Record<any, any>) => string;

export type ConfigTranslations = Record<string, Record<string, any>>;

export type Translations = Record<string, Record<string, string>>;

export type Config = {
  loaders: LoaderModule[];
  initialLocale?: string;
};

export type GetConfig = (...params: any) => Config;