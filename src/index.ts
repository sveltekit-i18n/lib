import { I18n as Base } from '@sveltekit-i18n/base';

import { withCurlyParser, withParser } from './curly';

import type { Cst, Modifier, Parser, Report } from '@sveltekit-i18n/parser-curly';
import type { Piped } from './curly';
import type { Config } from './types';

export type { Config, Cst, Modifier, Parser, Report };

// The parser contract's build-time halves, which no render reaches:
// `extractParamsFactory` reports the parameters a message names, for a schema
// generator reading a catalogue; `cst` describes a message's syntax, for an
// editor drawing or checking one. Named exports rather than members of the
// parser object, so a bundle that reaches neither drops both.
export { cst, extractParamsFactory } from '@sveltekit-i18n/parser-curly';

// Everything the core exports, so nothing this package builds on has to be
// installed beside it. `Config` and `Parser` already name this package's own
// types, so the core's namespaces of those names carry a `Base` prefix.
export type { Config as BaseConfig, Parser as BaseParser, Extension, Loader, Logger, Schema, Snapshot, Translations } from '@sveltekit-i18n/base';

interface I18nConstructor {
  new <const C extends Config<P, M>, P = Parser.PayloadDefault, M = Modifier.DefaultProps>(
    config?: C,
  ): Piped<C, P, M>;
}

class I18nCurlyParser {
  constructor(config?: Config<any, any>) {
    return new Base({
      ...withParser(config),
      extensions: [withCurlyParser, ...(config?.extensions ?? [])],
    });
  }
}

const I18n = I18nCurlyParser as unknown as I18nConstructor;

export { I18n };
export default I18n;
