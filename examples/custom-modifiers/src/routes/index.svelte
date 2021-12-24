<script>
  import { t } from '$lib/translations'; 
  import { now } from 'svelte/internal';

  const link = 'https://kit.svelte.dev';
  const time = (10 * 60 * 1000);
</script>

<h1>{$t('content.title')}</h1>
<p>{@html $t('content.modifier_date', { value: Date.now() - time})}</p>
<p>{@html $t('content.modifier_ago', { value: Date.now() - time})}</p>
