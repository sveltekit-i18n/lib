import type { IConfig } from '@sveltekit-i18n/base';
import type { IParser } from '@sveltekit-i18n/parser-default';

export interface Config extends Omit<IConfig.Config, 'parser'> {
  parserOptions?: IParser.Options;
}