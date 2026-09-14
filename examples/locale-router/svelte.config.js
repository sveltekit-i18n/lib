import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  // Everything is prerendered, but the adapter is a server one: the pages are
  // served flat while anything added later can still render per request.
  kit: { adapter: adapter() },
};

export default config;
