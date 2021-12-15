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

  private config: Writable<Config> = writable();

  private isLoading: Writable<boolean> = writable(false);
  
  loading: Readable<boolean> = { subscribe: this.isLoading.subscribe };

  private derivedLocales: Writable<string[]> = writable([]);

  locales: Readable<string[]> = { subscribe: this.derivedLocales.subscribe };

  locale: Writable<string> = writable('');

  private translations: Writable<Translations> = writable({});

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
    const $locales = get(this.derivedLocales);
    const localeFromLoaders = $locales.find(
      (l) => `${l}`.toLowerCase() === `${inputLocale}`.toLowerCase(),
    ) || '';

    return `${localeFromLoaders}`.toLowerCase();
  };

  loadConfig = async (config: Config) => {
    if (!config) throw new Error('No config!');

    this.config.set(config);
    const { loaders, initialLocale = '' } = config;

    this.derivedLocales.update(($locales) => {
      if (!$locales.length) {
        const loaderLocales = d<[]>(loaders, []).map(({ locale }) => `${locale}`.toLowerCase());
        return ([...new Set(loaderLocales)]);
      }
      return $locales;
    });

    this.locale.update(($locale) => {
      if (!$locale) return this.getLocale(initialLocale);

      return $locale;
    });

    await this.loadTranslations(initialLocale);
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
      this.isLoading.set(true);

      const translation = await getTranslation(filteredLoaders);
      this.addTranslations({ [$locale]: translation }, { [$locale]: filteredLoaders.map(({ key }) => key) });

      this.isLoading.set(false);
    }
  };
}
