import { derived, get, writable } from 'svelte/store';
import { getTranslation, toDotNotation, translate, useDefault as d } from './utils';

import type { Config, ConfigTranslations, LoaderModule, Translations } from './types';
import type { Readable, Writable } from 'svelte/store';

export { Config };

export default class {
  constructor(config?: Config) {
    if (config) this.loadConfig(config);
    
    this.locale.subscribe(this.loadTranslations);
  }
  
  private loadedKeys: Record<string, string[]> = {};
  
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
      if (!$locale) return `${locale || get(this.locales)[0] || ''}`.toLowerCase();

      return $locale;
    });
    
    if (loaders?.length) await this.loadTranslations();
  };

  private addTranslations = (translations: ConfigTranslations, keys?: Record<string, string[]>) => {
    const translationKeys = Object.keys(d(translations));

    this.translations.update((currentTranslations) => translationKeys.reduce(
      (acc, locale) => ({
        ...acc,
        [locale]: {
          ...d(acc[locale]),
          ...toDotNotation(translations[locale]),
        },
      }),
      currentTranslations,
    ));

    translationKeys.forEach(($locale) => {
      let localeKeys = Object.keys(translations[$locale]).map((k) => `${k}`.split('.')[0]);
      if (keys) localeKeys = keys[$locale];

      this.loadedKeys[$locale] = [...d(this.loadedKeys[$locale], []), ...d(localeKeys, [])];
    }); 
  };

  private loadTranslations = async () => {
    const $locale = get(this.locale);
    const $config = get(this.config);

    if (!$config || !$locale) return;

    const currentTranslations = get(this.translations);
    const currentTranslation = currentTranslations[$locale];

    const { loaders, route } = d<Config>($config);
    const filteredLoaders = d<LoaderModule[]>(loaders, [])
      .filter(({ locale }) => `${locale}`.toLowerCase() === `${$locale}`.toLowerCase())
      .filter(({ key }) => !currentTranslation || !d(this.loadedKeys[$locale], []).includes(key))
      // TODO: escape user regex
      .filter(({ routes }) => !routes || !route || d<any[]>(routes, []).some((r) => new RegExp(`^${r}$`, 'i').test(route))); 
    
    if (filteredLoaders.length) {
      this.loading.set(true);

      const translation = await getTranslation(filteredLoaders);
      this.addTranslations({ [$locale]: translation }, { [$locale]: filteredLoaders.map(({ key }) => key) });
      this.loading.set(false);
    }
  };
}
