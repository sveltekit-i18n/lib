import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit()],
  ssr: {
    noExternal: true, // or ['@sveltekit-i18n/*', 'intl-messageformat', '@formatjs/*']
  },
};

export default config;