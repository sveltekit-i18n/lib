import { derived, get, writable } from 'svelte/store';
import { getTranslation, testRoute, toDotNotation, translate } from './utils';
import { useDefault as d } from './utils/common';

import type { Config, ConfigTranslations, CustomModifiers, LoaderModule, LoadingStore, LocalTranslationFunction, Route, TranslationFunction, Translations, TranslationStore } from './types';
import type { Readable, Writable } from 'svelte/store';

export { Config };

export default class {
  constructor(config?: Config) {
    if (config) this.loadConfig(config);

    this.loaderTrigger.subscribe(this.translationLoader);
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

  locale: Writable<string> = writable();

  private loaderTrigger = derived([this.locale, this.currentRoute], ([$locale, $currentRoute], set) => {
    if ($locale !== undefined && $currentRoute !== undefined) set([$locale, $currentRoute]);
  }, [] as string[]);

  initialized: Readable<boolean> = derived(this.privateTranslations, ($translations) => {
    if (!get(this.initialized)) return !!Object.keys($translations).length;

    return true;
  }, false);

  private translation: Readable<Record<string, string>> = derived([this.privateTranslations, this.locale, this.isLoading], ([$translations, $locale, $loading]) => {
    const translation = $translations[$locale];
    if (translation && Object.keys(translation).length && !$loading) return translation;

    return get(this.translation);
  }, {});

  t: TranslationStore<TranslationFunction> = {
    ...derived(
      [this.translation, this.config],
      ([$translation, { customModifiers }]): TranslationFunction => (key, vars) => translate(
        $translation,
        key,
        vars,
        d<CustomModifiers>(customModifiers),
        get(this.locale)),
    ),
    get: (...props) => get(this.t)(...props),
  };

  l: TranslationStore<LocalTranslationFunction> = {
    ...derived(
      [this.translations, this.config],
      ([$translations, { customModifiers }]): LocalTranslationFunction => (locale, key, vars) => translate(
        $translations[locale],
        key,
        vars,
        d<CustomModifiers>(customModifiers),
        get(this.locale),
      ),
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
    const translationForLocale = $translations[$locale];

    const { loaders } = d<Config>($config);
    const filteredLoaders = d<LoaderModule[]>(loaders, [])
      .filter(({ key }) => !translationForLocale || !d(this.loadedKeys[$locale], []).includes(key))
      .filter(({ locale }) => `${locale}`.toLowerCase() === `${$locale}`.toLowerCase())
      .filter(({ routes }) => !routes || d<Route[]>(routes, []).some(testRoute($route)));

    if (filteredLoaders.length) {
      this.isLoading.set(true);

      const translation = await getTranslation(filteredLoaders);

      this.isLoading.set(false);

      return [{ [$locale]: translation }, { [$locale]: filteredLoaders.map(({ key }) => key) }];
    }
    return [];
  };

  private translationLoader = async () => {
    this.promises.push(new Promise(async (res) => {
      const props = await this.getTranslationProps();
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
