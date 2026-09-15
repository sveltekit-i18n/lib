export const LOCALES = ['en', 'cs', 'de'];

export const DEFAULT_LOCALE = 'en';

/** Slug -> source file in `docs/`. The slug is the site route; the file is the source of truth. */
export const PAGES = {
  'getting-started': 'GETTING_STARTED.md',
  'api': 'README.md',
  'architecture': 'ARCHITECTURE.md',
  'best-practices': 'BEST_PRACTICES.md',
  'troubleshooting': 'TROUBLESHOOTING.md',
};

export const INDEX_FILE = 'INDEX.md';

/** Inverse of `PAGES`, plus the index, for rewriting inter-document links. */
export const ROUTE_OF_FILE = {
  [INDEX_FILE]: '/docs',
  ...Object.fromEntries(Object.entries(PAGES).map(([slug, file]) => [file, `/docs/${slug}`])),
};

export const REPO = 'https://github.com/sveltekit-i18n/lib';

export const SPONSOR = 'https://github.com/sponsors/sveltekit-i18n';
