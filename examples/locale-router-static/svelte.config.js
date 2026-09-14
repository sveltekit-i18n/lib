import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  // No fallback: every page is written out, and an unknown URL is answered by
  // whatever serves the files. locale-router-advanced takes the other option.
  kit: { adapter: adapter() },
};

export default config;
