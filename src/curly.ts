import parser from '@sveltekit-i18n/parser-curly';
import { loggerFactory } from '@sveltekit-i18n/base/utils';

import type { Config as BaseConfig, Extension, I18n as Base, Logger, Schema } from '@sveltekit-i18n/base';
import type { Parser, Report } from '@sveltekit-i18n/parser-curly';
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

// The key is quoted as JSON, U+2028 and U+2029 escaped as well, so no line
// terminator in it can forge a line; `message` and `text` come escaped from the
// parser.
const quote = (id: string) =>
  JSON.stringify(id).replace(/[\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16)}`);

const describe = ({ code, id, message, text }: Report) =>
  `${message} (${code}${id === undefined ? '' : ` in ${quote(id)}`}: ${text})`;

// The logger is built on the first report, so a config that never reports
// builds none.
const reportTo = (log: Logger.FactoryProps | undefined): Parser.OnReport => {
  let logger: Logger.T | undefined;

  return (report) => (logger ??= loggerFactory(log)).warn(describe(report));
};

// `log` is the logger options the reports go to: the config's own, or, for a
// reconfiguration that names none, those the instance had before it.
export const withParser = (config?: Config<any, any> | null, log = config?.log): BaseConfig.T<any, any> => {
  const { parserOptions, ...rest } = config ?? {};

  return {
    ...rest,
    parser: parser({
      ...parserOptions,
      onReport: parserOptions?.onReport === undefined ? reportTo(log) : parserOptions.onReport,
    }),
  };
};

// Prepended to the user's pipe, so every later extension copies the patched
// method. It returns its input, so it contributes nothing to the piped type.
// `log` is kept per instance: `defineI18n` runs one pipe for many of them.
export const withCurlyParser = (initial: Logger.FactoryProps | undefined): Extension.T<Base, Base> => (i18n) => {
  const { loadConfig } = i18n;
  let log = initial;

  i18n.loadConfig = (config: Config<any, any>) => {
    // The core refuses a missing config and keeps the one it has.
    if (!config) return loadConfig(config);

    log = config.log ?? log;

    return loadConfig(withParser(config, log));
  };

  return i18n;
};
