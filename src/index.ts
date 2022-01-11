import { derived, get, writable } from 'svelte/store';
import { getTranslation, testRoute, toDotNotation, translate } from './utils';
import { useDefault as d } from './utils/common';

import type { Config, ConfigTranslations, CustomModifiers, LoaderModule, LoadingStore, LocalTranslationFunction, Route, TranslationFunction, Translations, TranslationStore } from './types';
import type { Readable, Writable } from 'svelte/store';

export { Config };

export default class {
  constructor(config?: Config) {
    if (config) this.loadConfig(config);

    this.loaderTrigger.subscribe(() => this.translationLoader());
  }

  private loadedKeys: Record<string, string[]> = {};

  private currentRoute: Writable<string> = writable();

  private config: Writable<Config> = writable({});

  private isLoading: Writable<boolean> = writable(false);

  private promises: Promise<void>[] = [];

  loading: LoadingStore = { subscribe: this.isLoading.subscribe, toPromise: () => Promise.all(this.promises) };

  private privateTranslations: Writable<Translations> = writable({});

  translations: Readable<Translations> = { subscribe: this.privateTranslations.subscribe };

  locales: Readable<string[]> = derived([this.config, this.privateTranslations], ([$config, $translations]) => {
    const { loaders = [] } = $config;

    const loaderLocales = loaders.map(({ locale }) => `${locale}`.toLowerCase());
    const translationLocales = Object.keys($translations).map((l) => `${l}`.toLowerCase());

    return ([...new Set([...loaderLocales, ...translationLocales])]);
  }, []);

  private internalLocale: Writable<string> = writable();

  locale: Writable<string> = {
    ...this.internalLocale,
    ...derived(this.internalLocale, ($locale, set) => {
      const value = $locale && `${$locale}`.toLowerCase();
      if (value !== get(this.locale)) set(value);
    }),
  };

  private loaderTrigger = derived([this.locale, this.currentRoute], ([$locale, $currentRoute], set) => {
    if ($locale !== undefined && $currentRoute !== undefined) set([$locale, $currentRoute]);
  }, [] as string[]);

  initialized: Readable<boolean> = derived(this.privateTranslations, ($translations) => {
    if (!get(this.initialized)) return !!Object.keys($translations).length;

    return true;
  }, false);

  private translation: Readable<Record<string, string>> = derived([this.privateTranslations, this.locale, this.isLoading], ([$translations, $locale, $loading], set) => {
    const translation = $translations[$locale];
    if (translation && Object.keys(translation).length && !$loading) set(translation);
  }, {});

  t: TranslationStore<TranslationFunction> = {
    ...derived(
      [this.translation, this.config],
      ([$translation, { customModifiers, fallbackLocale }]): TranslationFunction => (key, vars) => translate({
        translation: $translation,
        translations: get(this.translations),
        key,
        vars,
        customModifiers: d<CustomModifiers>(customModifiers),
        locale: get(this.locale),
        fallbackLocale,
      }),
    ),
    get: (...props) => get(this.t)(...props),
  };

  l: TranslationStore<LocalTranslationFunction> = {
    ...derived(
      [this.translations, this.config],
      ([$translations, { customModifiers, fallbackLocale }]): LocalTranslationFunction => (locale, key, vars) => translate({
        translation: $translations[locale],
        translations: $translations,
        key,
        vars,
        customModifiers: d<CustomModifiers>(customModifiers),
        locale: get(this.locale),
        fallbackLocale,
      }),
    ),
    get: (...props) => get(this.l)(...props),
  };

  private getLocale = (inputLocale?: string): string => {
    const $locales = get(this.locales);
    const localeFromLoaders = $locales.find(
      (l) => `${l}`.toLowerCase() === `${inputLocale}`.toLowerCase(),
    ) || '';

    return `${localeFromLoaders}`.toLowerCase();
  };

  initLocale = async (locale?:string) => {
    if (!locale) return;

    const loaderLocale = this.getLocale(locale);

    if (!loaderLocale) return;

    let $locale = get(this.locale);

    if (!$locale) {
      this.locale.set(loaderLocale);
    }

    await this.loading.toPromise();
  };

  setRoute = async (route: string) => {
    if (route !== get(this.currentRoute)) this.currentRoute.set(route);
    await this.loading.toPromise();
  };

  loadConfig = async (config: Config) => {
    if (!config) throw new Error('No config!');

    this.config.set(config);
    const { initLocale = '' } = config;

    await this.loadTranslations(initLocale);
  };

  addTranslations = (translations?: ConfigTranslations, keys?: Record<string, string[]>) => {
    if (!translations) return;

    const translationLocales = Object.keys(d(translations));

    this.privateTranslations.update(($translations) => translationLocales.reduce(
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

      this.loadedKeys[$locale] = Array.from(new Set([
        ...d(this.loadedKeys[$locale], []),
        ...d(localeKeys, []),
      ]));
    });
  };

  getTranslationProps = async ($locale = get(this.locale), $route = get(this.currentRoute)): Promise<[ConfigTranslations, Record<string, string[]>] | []> => {
    const $config = get(this.config);

    if (!$config || !$locale) return [];

    const $translations = get(this.privateTranslations);

    const { loaders, fallbackLocale = '' } = d<Config>($config);

    const lowerLocale = `${$locale}`.toLowerCase();
    const lowerFallbackLocale = fallbackLocale && `${fallbackLocale}`.toLowerCase();

    const translationForLocale = $translations[lowerLocale];
    const translationForFallbackLocale = $translations[lowerFallbackLocale];

    const filteredLoaders = d<LoaderModule[]>(loaders, [])
      .map(({ locale, ...rest }) => ({ ...rest, locale: `${locale}`.toLowerCase() }))
      .filter(({ routes }) => !routes || d<Route[]>(routes, []).some(testRoute($route)))
      .filter(({ key, locale }) => locale === lowerLocale && (
        !translationForLocale || !d(this.loadedKeys[lowerLocale], []).includes(key)
      ) || (
        fallbackLocale && locale === lowerFallbackLocale && (
          !translationForFallbackLocale ||
            !d(this.loadedKeys[lowerFallbackLocale], []).includes(key)
        )),
      );

    if (filteredLoaders.length) {
      this.isLoading.set(true);

      const translations = await getTranslation(filteredLoaders);

      this.isLoading.set(false);

      const keys = filteredLoaders.reduce<Record<string, any>>(
        (acc, { key, locale }) => ({ ...acc, [locale]: [...(acc[locale] || []), key] }), {},
      );

      return [translations, keys];
    }
    return [];
  };

  private translationLoader = async (locale?: string) => {
    this.promises.push(new Promise(async (res) => {
      const props = await this.getTranslationProps(locale);
      if (props.length) this.addTranslations(...props);
      res();
    }));

    await this.loading.toPromise();
  };

  loadTranslations = async (locale: string, route = get(this.currentRoute) || '') => {
    if (!locale) return;
    this.setRoute(route);
    this.initLocale(locale);

    await this.loading.toPromise();
  };
}
