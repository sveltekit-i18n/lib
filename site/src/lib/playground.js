/**
 * The playground's fixtures and the source it shows beside each panel.
 *
 * Every panel drives a real instance through the public API, so a panel that
 * stops matching the library is a panel that stops working. The snippets here
 * are what each panel actually does, trimmed to the line that matters.
 */

export const PANELS = ['parser', 'preprocess', 'loaders', 'fallback'];

/** Which message format the parser panel is resolving. */
export const FLAVOURS = ['curly', 'icu', 'mf2', 'i18next'];

export const MESSAGES = {
  curly: 'You have {{count:number;}} {{count; 1:message; default:messages;}}.',
  icu: 'You have {count, plural, one {# message} other {# messages}}.',
  mf2: '.input {$count :number}\n.match $count\none {{You have {$count} message.}}\n* {{You have {$count} messages.}}',
  // i18next selects a plural form by key suffix, which a single message cannot carry.
  i18next: 'You have {{count, number}} messages.',
};

export const PAYLOAD = '{\n  "count": 1234\n}';

/** The key every panel resolves, so the panels read as one example. */
export const KEY = 'inbox';

export const PREPROCESS_MODES = ['full', 'preserveArrays', 'none'];

export const TRANSLATIONS = `{
  "nav": { "home": "Home", "about": "About" },
  "tags": ["new", "beta"]
}`;

/**
 * The three shapes `routes` can take. A loader with no `routes` matches every
 * route — that is the single-load shape; a string is an exact match, so a whole
 * section needs a pattern.
 */
export const LOADERS = [
  { namespace: 'common', routes: undefined, shape: 'every' },
  { namespace: 'home', routes: ['/'], shape: 'exact' },
  { namespace: 'docs', routes: [/^\/docs(\/|$)/], shape: 'pattern' },
];

export const ROUTES = ['/', '/docs', '/docs/getting-started', '/about'];

/** The locales the loader fixtures below carry. */
export const LOADER_LOCALES = ['en', 'cs'];

/** What each loader resolves to, keyed by namespace and locale. */
export const LOADED = {
  common: { en: { brand: 'sveltekit-i18n' }, cs: { brand: 'sveltekit-i18n' } },
  home: { en: { title: 'Home' }, cs: { title: 'Domů' } },
  docs: { en: { title: 'Documentation' }, cs: { title: 'Dokumentace' } },
};

/** A complete default locale and a partial one, so the fallback is visible. */
export const FALLBACK = {
  en: { title: 'Translations', subtitle: 'Loaded per route', cta: 'Read the docs' },
  cs: { title: 'Překlady' },
};

export const FALLBACK_KEYS = ['title', 'subtitle', 'cta'];

export const SOURCE = {
  parser: {
    curly: `import { I18n } from 'sveltekit-i18n';

const i18n = new I18n({
  initLocale: locale,
  translations: { [locale]: { ${KEY}: message } },
  parserOptions: { onReport: (report) => reports.push(report) },
});

i18n.t('${KEY}', payload);`,
    ...Object.fromEntries(FLAVOURS.filter((name) => name !== 'curly').map((name) => [name, `import { I18n } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-${name}';

const i18n = new I18n({
  initLocale: locale,
  translations: { [locale]: { ${KEY}: message } },
  parser: parser({ onReport: (report) => reports.push(report) }),
});

i18n.t('${KEY}', payload);`])),
  },
  preprocess: Object.fromEntries(PREPROCESS_MODES.map((mode) => [mode, `const i18n = new I18n({ initLocale: 'en', preprocess: '${mode}' });

i18n.addTranslations({ en: input });

i18n.translations.en;`])),
  loaders: `const i18n = new I18n({
  initLocale: 'en',
  loaders: [
    // No routes: every route, so it loads once and never again.
    { locale, namespace: 'common', loader },
    // A string route is an exact match.
    { locale, namespace: 'home', routes: ['/'], loader },
    // A whole section needs a pattern.
    { locale, namespace: 'docs', routes: [/^\\/docs(\\/|$)/], loader },
  ],
});

await i18n.loadTranslations(locale, route);`,
  fallback: `const i18n = new I18n({
  initLocale: 'cs',
  fallbackLocale: 'en',
  translations: { en: complete, cs: partial },
});

i18n.t('subtitle'); // the English text: 'cs' has no such key`,
};

/** `JSON.parse`, with the message a panel shows instead of a thrown error. */
export const parsePayload = (text) => {
  if (!text.trim()) return { value: undefined };

  try {
    return { value: JSON.parse(text) };
  } catch (error) {
    return { error: error.message };
  }
};
