import I18n from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-default';

import type { Config } from './types';

export { Config };

const normalizeConfig = ({ parserOptions = {}, ...rest }: Config) => ({
  ...rest,
  parser: parser(parserOptions),
});

export default class extends I18n {
  constructor(config?: Config) {
    super(config && normalizeConfig(config));
  }

  loadConfig = (config: Config) => config && super.configLoader(normalizeConfig(config));
}