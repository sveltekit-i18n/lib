import { type Config, I18n } from 'sveltekit-i18n';

/**
 * The component's own lexicon, kept beside the component rather than in the
 * application's translations. Nothing outside this directory names these keys.
 */
export const LOCALES = ['en', 'cs', 'de'] as const;

/**
 * The application's generated schema is registered for every instance whose
 * config states none, and this lexicon is not in it — so the component states
 * its own. Only the type is read.
 */
type RatesSchema = {
  'rates.title': never;
  'rates.lead': never;
  'rates.standard': never;
  'rates.express': never;
  'rates.days': { days: number };
};

export const config = {
  schema: {} as RatesSchema,
  fallbackLocale: 'en',
  loaders: [
    {
      locale: LOCALES,
      namespace: 'rates',
      loader: async ({ locale }) => (await import(`./translations/${locale}.json`)).default,
    },
  ],
} as const satisfies Config;

/**
 * A component has no `load` of its own, so it exports this instead and the
 * parent page calls it. A throwaway instance per request, the same way the
 * application builds one — the result is the payload the component is handed.
 * The records name the loaders that delivered it, so the component's instance
 * does not run them again.
 */
export const snapshot = async (locale: string | undefined) => {
  const i18n = new I18n(config);

  if (locale) await i18n.loadTranslations(locale);

  return i18n.snapshot({ records: true });
};
