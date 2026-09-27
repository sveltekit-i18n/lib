import parser from '@sveltekit-i18n/parser-curly';

import type { Config as BaseConfig, Extension, I18n as Base, Schema } from '@sveltekit-i18n/base';
import type { Parser } from '@sveltekit-i18n/parser-curly';
import type { Config } from './types';

/**
 * The base instance, with `loadConfig` also taking the parser-less config this
 * package accepts. An intersection, not an `Omit` rewrite: the instance type
 * carries private fields, so only an intersection stays assignable to it and
 * keeps `Extension.Operator` extensions resolving against it.
 */
export type Instance<C, P, M> =
  Base<Parser.Params<P, M>, string, Schema.FromConfig<C>, BaseConfig.LocalesFromConfig<C>>
  & { loadConfig: (config: Config<P, M>) => Promise<void> };

export type Piped<C, P, M> = Extension.Piped<Instance<C, P, M>, Extension.FromConfig<C>>;

export const withParser = ({ parserOptions, ...config }: Config<any, any> = {}): BaseConfig.T<any, any> => ({
  ...config,
  parser: parser({ onReport: null, ...parserOptions }),
});

// Prepended to the user's pipe, so every later extension copies the patched
// method. It returns its input, so it contributes nothing to the piped type.
export const withCurlyParser: Extension.T<Base, Base> = (i18n) => {
  const { loadConfig } = i18n;

  i18n.loadConfig = (config: Config<any, any>) => loadConfig(withParser(config));

  return i18n;
};
