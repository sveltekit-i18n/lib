import type { Config } from '@sveltekit-i18n/base';
import type { Parser } from '@sveltekit-i18n/parser-default';

export interface Config extends Omit<Config.T, 'parser'> {
  parserOptions?: Parser.Options;
}