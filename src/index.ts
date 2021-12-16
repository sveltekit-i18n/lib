import { derived, get, writable } from 'svelte/store';
import { getTranslation, testRoute, toDotNotation, translate, useDefault as d } from './utils';

import type { Config, ConfigTranslations, LoaderModule, Route, Translations } from './types';
import type { Readable, Writable } from 'svelte/store';

export { Config };

export default class {
  constructor(config?: Config) {
    if (config) this.loadConfig(config);

    this.locale.subscribe(this.loadTranslations);
  }

  private loadedKeys: Record<string, string[]> = {};

  private currentRoute: Writable<string> = writable('');

  private config: Writable<Config> = writable({});

  private isLoading: Writable<boolean> = writable(false);

  loading: Readable<boolean> = { subscribe: this.isLoading.subscribe };

  private translations: Writable<Translations> = writable({});

  locales: Readable<string[]> = derived([this.config, this.translations], ([$config, $translations]) => {
    const { loaders = [] } = $config;

    const loaderLocales = loaders.map(({ locale }) => locale);
    const translationLocales = Object.keys($translations).map((l) => `${l}`.toLowerCase());

    return ([...new Set([...loaderLocales, ...translationLocales])]);
  }, []);

  locale: Writable<string> = writable('');

  initialized: Readable<boolean> = derived(this.translations, ($translations) => {
    if (!get(this.initialized)) return !!Object.keys($translations).length;

    return true;
  }, false);

  private translation: Readable<Record<string, string>> = derived([this.translations, this.locale, this.isLoading], ([$translations, $locale, $loading]) => {
    const translation = $translations[$locale];
    if (translation && Object.keys(translation).length && !$loading) return translation;

    return get(this.translation);
  }, {});

  t: Readable<(key: any, vars?: any) => string> = derived(
    this.translation, ($translation) => (key: string, vars: Record<any, any>) => translate($translation, key, vars),
  );

  private getLocale = (inputLocale?: string): string => {
    const $locales = get(this.locales);
    const localeFromLoaders = $locales.find(
      (l) => `${l}`.toLowerCase() === `${inputLocale}`.toLowerCase(),
    ) || '';

    return `${localeFromLoaders}`.toLowerCase();
  };

  loadConfig = async (config: Config) => {
    if (!config) throw new Error('No config!');

    this.config.set(config);
    const { initLocale = '' } = config;

    await this.loadTranslations(initLocale);
  };

  addTranslations = (translations: ConfigTranslations, keys?: Record<string, string[]>) => {
    const translationLocales = Object.keys(d(translations));

    this.translations.update(($translations) => translationLocales.reduce(
      (acc, locale) => ({
        ...acc,
        [locale]: {
          ...d(acc[locale]),
          ...toDotNotation(translations[locale]),
        },
      }),
      $translations,
    ));

    translationLocales.forEach(($locale) => {
      let localeKeys = Object.keys(translations[$locale]).map((k) => `${k}`.split('.')[0]);
      if (keys) localeKeys = keys[$locale];

      this.loadedKeys[$locale] = [...d(this.loadedKeys[$locale], []), ...d(localeKeys, [])];
    });

    this.locale.update(($locale) => {
      if (!$locale) {
        const { initLocale } = get(this.config);

        return this.getLocale(initLocale);
      }

      return $locale;
    });
  };

  loadTranslations = async (locale: string, route = get(this.currentRoute)) => {
    const $config = get(this.config);
    const loaderLocale = this.getLocale(locale);

    if (!$config || !loaderLocale) return;

    let $locale = get(this.locale);

    if (!$locale) {
      this.locale.set(loaderLocale);
      $locale = loaderLocale;
    }

    if (route) this.currentRoute.set(route);

    const $translations = get(this.translations);
    const translationForLocale = $translations[$locale];

    const { loaders } = d<Config>($config);
    const filteredLoaders = d<LoaderModule[]>(loaders, [])
      .filter(({ locale }) => `${locale}`.toLowerCase() === `${$locale}`.toLowerCase())
      .filter(({ key }) => !translationForLocale || !d(this.loadedKeys[$locale], []).includes(key))
      .filter(({ routes }) => !routes || d<Route[]>(routes, []).some(testRoute(route)));

    if (filteredLoaders.length) {
      this.isLoading.set(true);

      const translation = await getTranslation(filteredLoaders);
      this.addTranslations({ [$locale]: translation }, { [$locale]: filteredLoaders.map(({ key }) => key) });

      this.isLoading.set(false);
    }
  };
}
