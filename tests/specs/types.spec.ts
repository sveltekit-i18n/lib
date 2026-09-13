import { describe, expect, it } from 'vitest';
import i18n from '../../src';

import type { Config, Extension } from '../../src';

const TRANSLATIONS = { en: { greeting: 'Hi {{name}}!' }, cs: { greeting: 'Ahoj {{name}}!' } };

// The assertion in this suite IS the compilation: `pnpm test` runs
// `tsc --noEmit` over it first, so a closure that stops typechecking — or a
// `@ts-expect-error` that stops being an error — fails the run. The closures
// are never invoked.
const compiles = (check: () => unknown) => expect(check).toBeInstanceOf(Function);

describe('config typing', () => {
  it('needs no parser', () => {
    compiles(() => new i18n({ initLocale: 'en', translations: TRANSLATIONS }));
  });

  it('takes parser options without stating a report channel', () => {
    compiles(() => new i18n({ parserOptions: { modifierDefaults: { number: { maximumFractionDigits: 2 } } } }));
  });

  it('takes a report channel where the app wants one', () => {
    compiles(() => new i18n({ parserOptions: { onReport: (report) => [report.code, report.message] } }));
  });

  it('rejects the core parser slot, which this package fills', () => {
    compiles(() => new i18n({
      // @ts-expect-error - the parser is this package's to supply
      parser: { parse: (value: unknown) => value },
    }));
  });
});

// One payload type for every message is stated through the type arguments;
// per-key payloads come from `config.schema` below.
describe('payload typing', () => {
  type Payload = { name: string };

  const config: Config<Payload> = { initLocale: 'en', translations: TRANSLATIONS };

  it('accepts the keys the stated payload names', () => {
    compiles(() => new i18n<Config<Payload>, Payload>(config).t('greeting', { name: 'Jarda' }));
  });

  it('rejects a typo against the stated payload', () => {
    // @ts-expect-error - `nmae` is not a key of the stated payload
    compiles(() => new i18n<Config<Payload>, Payload>(config).t('greeting', { nmae: 'Jarda' }));
  });
});

describe('schema typing', () => {
  it('narrows keys and payloads', () => {
    compiles(() => {
      const instance = new i18n({
        initLocale: 'en',
        translations: TRANSLATIONS,
        schema: {} as { greeting: { name: string } },
      });

      instance.t('greeting', { name: 'Jarda' });

      // @ts-expect-error - the schema does not carry this key
      instance.t('nosuch');

      // @ts-expect-error - the schema requires `name`
      return instance.t('greeting', {});
    });
  });
});

describe('locale typing', () => {
  it('completes the locales the config spells without closing the set', () => {
    compiles(async () => {
      const instance = new i18n({ initLocale: 'en', translations: TRANSLATIONS });

      await instance.setLocale('cs');
      // A locale can arrive from a URL or an `Accept-Language` header, so the
      // union is a completion hint rather than a constraint.
      await instance.setLocale('de');

      return instance.locale;
    });
  });
});

describe('the retyped `loadConfig`', () => {
  it('takes the parser-less config', () => {
    compiles(() => new i18n().loadConfig({ initLocale: 'en', translations: TRANSLATIONS, parserOptions: {} }));
  });

  it('is still visible through the extension pipe', () => {
    interface WithMark extends Extension.Operator {
      readonly output: this['input'] & { marked: true };
    }

    const withMark: Extension.Generic<WithMark> = (instance) => Object.assign(instance, { marked: true as const });

    compiles(async () => {
      const instance = new i18n({ extensions: [withMark] });

      await instance.loadConfig({ initLocale: 'en', translations: TRANSLATIONS, parserOptions: {} });

      return instance.marked;
    });
  });
});
