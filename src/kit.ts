import { defineI18n as defineCore } from '@sveltekit-i18n/base/kit';

import { withCurlyParser, withParser } from './curly';

import type { Kit } from '@sveltekit-i18n/base/kit';
import type { Modifier, Parser } from '@sveltekit-i18n/parser-curly';
import type { Piped } from './curly';
import type { Config } from './types';

export type { Kit };

/**
 * Wires SvelteKit to an instance of `config`, with the curly parser filled in:
 * a `handle` hook, the root layout's `load`, and `use()` / `get()` for
 * components. The core's `defineI18n` builds every instance, so the parser
 * rides in the config it is handed, and `withCurlyParser` leads the pipe it
 * runs, so a reconfiguration through the instance keeps the parser too.
 */
export const defineI18n = <const C extends Config<P, M>, P = Parser.PayloadDefault, M = Modifier.DefaultProps>(
  config: C,
  options?: Kit.Options,
): Kit.T<Piped<C, P, M>> => defineCore({
  ...withParser(config),
  extensions: [withCurlyParser, ...(config.extensions ?? [])],
}, options) as unknown as Kit.T<Piped<C, P, M>>;
