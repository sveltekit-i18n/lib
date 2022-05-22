import Base from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-default';

import type { Parser, Modifier } from '@sveltekit-i18n/parser-default';
import type { Config } from './types';

export type { Config, Parser, Modifier };

const normalizeConfig = <P = Parser.PayloadDefault, M = Modifier.DefaultProps>({ parserOptions = {}, ...rest }: Config<P, M>) => ({
  ...rest,
  parser: parser(parserOptions),
});

class I18n<Params extends Parser.Params<P, M>, P = Parser.PayloadDefault, M = Modifier.DefaultProps> extends Base<Params> {
  constructor(config?: Config<P, M>) {
    super(config && normalizeConfig(config));
  }

  loadConfig = (config: Config<P, M>) => super.configLoader(normalizeConfig<P, M>(config));
}

export default I18n;
