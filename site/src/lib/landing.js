export const INSTALL = `npm install sveltekit-i18n

# bun add sveltekit-i18n
# deno add npm:sveltekit-i18n`;

export const CONFIG = `// src/lib/i18n.js
import { defineI18n } from 'sveltekit-i18n/kit';

export const config = {
  fallbackLocale: 'en',
  loaders: [
    {
      locale: ['en', 'cs'],
      namespace: 'common',
      loader: async ({ locale, namespace }) => (await import(\`./translations/\${locale}/\${namespace}.json\`)).default,
    },
  ],
};

export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => event.cookies?.get('lang'),
});

// src/hooks.server.js — fills <html lang="%lang%" dir="%dir%"> in src/app.html
export { handle } from '$lib/i18n';

// src/routes/+layout.server.js and src/routes/+layout.js
export { load } from '$lib/i18n';`;

export const USE = `<!-- src/routes/+layout.svelte -->
<script>
  import { use } from '$lib/i18n';

  let { data, children } = $props();

  use(() => data);
</script>

{@render children()}

<!-- any component below it -->
<script>
  import { get } from '$lib/i18n';

  const i18n = get();
</script>

<h1>{i18n.t('common.greeting', { name: 'World' })}</h1>

<button onclick={() => { i18n.locale = 'cs'; }}>
  {i18n.t('common.switch')}
</button>`;

export const FEATURES = ['sveltekit', 'install', 'lazy', 'runes', 'types', 'extensions'];
