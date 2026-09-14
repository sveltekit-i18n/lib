import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // `.svx` has to be a page extension as well, or the router never looks at it.
  extensions: ['.svelte', '.svx'],
  // `smartypants` rewrites quotes in the Markdown body, and a `{i18n.t('key')}`
  // inside a heading is Markdown body — it would reach the compiler with curly
  // quotes and fail to parse.
  preprocess: [vitePreprocess(), mdsvex({ extensions: ['.svx'], smartypants: false })],
  kit: { adapter: adapter() },
};

export default config;
