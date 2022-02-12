import type { Config as C } from '@sveltekit-i18n/base';
import type { Parser } from '@sveltekit-i18n/parser-default';

export type Config<Payload = {}, Props = {}> = {
  parserOptions?: Parser.Options<any, Props>;
} & Omit<C.T<Parser.Params<Payload, Props>>, 'parser'>;
