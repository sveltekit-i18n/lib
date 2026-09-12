import type { Config as BaseConfig } from '@sveltekit-i18n/base';
import type { Modifier, Parser } from '@sveltekit-i18n/parser-curly';

/**
 * base's config with the parser slot replaced by the curly parser's options.
 * `onReport` is relaxed to optional here: the parser package requires the key
 * to be stated, this package states it, so a consumer need not.
 */
export type Config<P = Parser.PayloadDefault, M = Modifier.DefaultProps> =
  Omit<BaseConfig.T<Parser.Params<P, M>, string>, 'parser'>
  & { parserOptions?: Omit<Parser.Options<string, M>, 'onReport'> & { onReport?: Parser.OnReport | null } };
