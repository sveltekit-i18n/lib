<script>
  import { t } from '$lib/translations';
  import Component from '$lib/component/index.svelte';

  const link = 'https://kit.svelte.dev';

  let props = [
    {
      initLocale: 'cs',
      initTranslations: {},
    },
    {
      initLocale: 'de',
      initTranslations: {},
    },
  ];

  /** @type {import('./$types').Snapshot} */
  export const snapshot = {
    capture: () => props,
    restore: (value) => { props = value; },
  };
</script>

<h1>{$t('home.title')}</h1>
<p>{@html $t('home.text', { link })}</p>

<Component bind:initLocale={props[0].initLocale} bind:initTranslations={props[0].initTranslations} />
<Component bind:initLocale={props[1].initLocale} bind:initTranslations={props[1].initTranslations} />