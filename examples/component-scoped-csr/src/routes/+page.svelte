<script>
  import { t } from '$lib/translations';
  import Component from '$lib/component/index.svelte';

  const link = 'https://kit.svelte.dev';
</script>

<h1>{$t('home.title')}</h1>
<p>{@html $t('home.text', { link })}</p>

<Component initLocale="en" />
<Component initLocale="de" />