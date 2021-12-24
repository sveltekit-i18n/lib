<script>
  import { t } from '$lib/translations'; 
  import { now } from 'svelte/internal';

  const time = Date.now() - (10 * 60 * 1000);
  const currency = 100;
</script>

<h1>{$t('content.title_built-in')}</h1>
<p>{$t('content.modifier_date', { value: time})}</p>
<p>{$t('content.modifier_ago', { value: time})}</p>
<h1>{$t('content.title_custom')}</h1>
<p>{$t('content.modifier_currency', { value: currency})}</p>
