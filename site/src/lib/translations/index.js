import cs from './cs.json';
import de from './de.json';
import en from './en.json';
import { DEFAULT_LOCALE, LOCALES } from '$lib/docs.js';

/**
 * The config, not an instance: a module is evaluated once per process, so an
 * instance here would be shared by every page being prerendered.
 *
 * The shell strings are inline rather than loaded — the error page renders
 * without any `load` having run, so anything it needs has to be present from
 * construction. The `docs` namespace is route-scoped to prove the other half.
 */
/** @type {import('sveltekit-i18n').Config} */
export const config = {
  fallbackLocale: DEFAULT_LOCALE,
  translations: { en, cs, de },
  loaders: LOCALES.map((locale) => ({
    locale,
    key: 'docs',
    // A string route is an exact match, so the whole documentation section
    // needs a pattern rather than '/docs'.
    routes: [/^\/docs(\/|$)/],
    loader: async () => (await import(`./docs/${locale}.json`)).default,
  })),
};
