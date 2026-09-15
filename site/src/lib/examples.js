import { REPO } from './docs.js';

/** The groups and their order mirror `examples/README.md`, which stays the
 *  long-form reference — this page is the launcher index it links out to. */
export const GROUPS = ['routing', 'component', 'content'];

export const EXAMPLES = [
  { name: 'multi-page', group: 'routing', adapter: 'node' },
  { name: 'locale-param', group: 'routing', adapter: 'node' },
  { name: 'locale-router', group: 'routing', adapter: 'node' },
  { name: 'locale-router-static', group: 'routing', adapter: 'static' },
  { name: 'locale-router-advanced', group: 'routing', adapter: 'static' },
  { name: 'component-scoped-csr', group: 'component', adapter: 'node' },
  { name: 'component-scoped-ssr', group: 'component', adapter: 'node' },
  { name: 'mdsvex', group: 'content', adapter: 'static' },
];

const STACKBLITZ = REPO.replace('https://github.com/', 'https://stackblitz.com/github/');

/** The launcher `examples/README.md` carries: the dev server boots inside the
 *  browser tab and opens on that example's config. */
export const runHref = (name) => `${STACKBLITZ}/tree/master/examples/${name}?startScript=dev&file=src/lib/translations/index.js`;

export const sourceHref = (name) => `${REPO}/tree/master/examples/${name}`;
