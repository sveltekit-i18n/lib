export const INSTALL = `npm install sveltekit-i18n

# bun add sveltekit-i18n
# deno add npm:sveltekit-i18n`;

export const CONFIG = `// src/lib/translations/index.js
import { I18n } from 'sveltekit-i18n';

export const config = {
  loaders: [
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
  ],
};

export const i18n = new I18n(config);`;

export const USE = `<script>
  import { i18n } from '$lib/translations';
</script>

<h1>{i18n.t('common.greeting', { name: 'World' })}</h1>

<button onclick={() => { i18n.locale = 'cs'; }}>
  {i18n.t('common.switch')}
</button>`;

export const FEATURES = ['sveltekit', 'install', 'lazy', 'runes', 'types', 'extensions'];
