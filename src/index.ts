import Base from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-default';

import type { IParser } from '@sveltekit-i18n/parser-default';
import type { Config } from './types';

export { Config };

const normalizeConfig = ({ parserOptions = {}, ...rest }: Config) => ({
  ...rest,
  parser: parser(parserOptions),
});

class I18n extends Base<IParser.Params> {
  constructor(config?: Config) {
    super(config && normalizeConfig(config));
  }

  loadConfig = (config: Config) => super.configLoader(normalizeConfig(config));
}

export default I18n;