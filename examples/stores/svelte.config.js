import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  // The locale is negotiated per request from a cookie and `Accept-Language`,
  // so this example needs a server at runtime.
  kit: { adapter: adapter() },
};

export default config;
