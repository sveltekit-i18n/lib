<script>
  import { t } from '$lib/translations'; 
  import { now } from 'svelte/internal';

  const link = 'https://kit.svelte.dev';
  const time = (10 * 60 * 1000);
</script>

<h1>{$t('content.title_built-in')}</h1>
<p>{$t('content.modifier_date', { value: Date.now() - time})}</p>
<p>{$t('content.modifier_ago', { value: Date.now() - time})}</p>
<h1>{$t('content.title_custom')}</h1>
<p>{$t('content.modifier_currency', { value: 100})}</p>
