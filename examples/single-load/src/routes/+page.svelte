<script>
  import { t, l, locales } from '$lib/translations';

  const link = 'https://kit.svelte.dev';
</script>

<h1>{$t('content.title')}</h1>
<p>{@html $t('content.info')}</p>
<br />
{#each $locales as locale}
  <p>{@html $l(locale, 'content.text', { link })}</p>
{/each}
