import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  // The locale is read from the query string before rendering, so this example
  // needs a server at runtime.
  kit: { adapter: adapter() },
};

export default config;
