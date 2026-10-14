import type { Config as BaseConfig } from '@sveltekit-i18n/base';
import type { Modifier, Parser } from '@sveltekit-i18n/parser-curly';

/**
 * base's config with the parser slot replaced by the curly parser's options.
 * `onReport` is relaxed to optional here: the parser package requires the key
 * to be stated, and this package states it, sending each report to the logger
 * `log` configures, at `warn`. A consumer states it to send reports elsewhere,
 * or as `null` to discard them.
 */
export type Config<P = Parser.PayloadDefault, M = Modifier.DefaultProps> =
  Omit<BaseConfig.T<Parser.Params<P, M>, string>, 'parser'>
  & { parserOptions?: Omit<Parser.Options<string, M>, 'onReport'> & { onReport?: Parser.OnReport | null } };
