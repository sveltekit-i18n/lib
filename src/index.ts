import { derived, get, writable } from 'svelte/store';
import { getTranslation, testRoute, toDotNotation, translate, useDefault as d } from './utils';

import type { Config, ConfigTranslations, LoaderModule, Route, Translations } from './types';
import type { Readable, Writable } from 'svelte/store';

export { Config };

export default class {
  constructor(config: Config) {
    this.loadConfig(config);
    this.locale.subscribe(this.loadTranslations);
  }

  private loadedKeys: Record<string, string[]> = {};

  private currentRoute: Writable<string> = writable('');

  config: Writable<Config> = writable();

  loading: Writable<boolean> = writable(false);

  locales: Writable<string[]> = writable([]);

  locale: Writable<string> = writable();

  translations: Writable<Translations> = writable({});

  translation: Readable<Record<string, string>> = derived([this.translations, this.locale, this.loading], ([$translations, $locale, $loading]) => {
    const translation = $translations[$locale];
    if (translation && Object.keys(translation).length && !$loading) return translation;

    return get(this.translation);
  }, {});

  t: Readable<(key: any, vars?: any) => string> = derived(
    this.translation, ($translation) => (key: string, vars: Record<any, any>) => translate($translation, key, vars),
  );

  getLocale = (inputLocale?: string): string => {
    const $locales = get(this.locales);
    const localeFromLoaders = $locales.find(
      (l) => `${l}`.toLowerCase() === `${inputLocale}`.toLowerCase(),
    ) || '';

    return `${localeFromLoaders}`.toLowerCase();
  };

  loadConfig = async (config: Config) => {
    if (!config) throw new Error('No config!');

    this.config.set(config);
    const { loaders, locale } = config;

    this.locales.update(($locales) => {
      if (!$locales.length) {
        const loaderLocales = d<[]>(loaders, []).map(({ locale }) => `${locale}`.toLowerCase());
        return ([...new Set(loaderLocales)]);
      }
      return $locales;
    });

    this.locale.update(($locale) => {
      if (!$locale) return this.getLocale(locale);

      return $locale;
    });

    await this.loadTranslations(locale || '');
  };

  addTranslations = (translations: ConfigTranslations, keys?: Record<string, string[]>) => {
    const translationLocales = Object.keys(d(translations));

    this.translations.update((currentTranslations) => translationLocales.reduce(
      (acc, locale) => ({
        ...acc,
        [locale]: {
          ...d(acc[locale]),
          ...toDotNotation(translations[locale]),
        },
      }),
      currentTranslations,
    ));

    translationLocales.forEach(($locale) => {
      let localeKeys = Object.keys(translations[$locale]).map((k) => `${k}`.split('.')[0]);
      if (keys) localeKeys = keys[$locale];

      this.loadedKeys[$locale] = [...d(this.loadedKeys[$locale], []), ...d(localeKeys, [])];
    }); 
  };

  loadTranslations = async (locale: string, route = get(this.currentRoute)) => {
    const $config = get(this.config);
    const loaderLocale = this.getLocale(locale);

    if (!$config || !loaderLocale || !route) return;

    let $locale = get(this.locale);

    if (!$locale) {
      this.locale.set(loaderLocale);
      $locale = loaderLocale;
    }
    
    this.currentRoute.set(route);

    const currentTranslations = get(this.translations);
    const currentTranslation = currentTranslations[$locale];

    const { loaders } = d<Config>($config);
    const filteredLoaders = d<LoaderModule[]>(loaders, [])
      .filter(({ locale }) => `${locale}`.toLowerCase() === `${$locale}`.toLowerCase())
      .filter(({ key }) => !currentTranslation || !d(this.loadedKeys[$locale], []).includes(key))
      .filter(({ routes }) => !routes || d<Route[]>(routes, []).some(testRoute(route)));
    
    if (filteredLoaders.length) {
      this.loading.set(true);

      const translation = await getTranslation(filteredLoaders);
      this.addTranslations({ [$locale]: translation }, { [$locale]: filteredLoaders.map(({ key }) => key) });

      this.loading.set(false);
    }
  };
}
