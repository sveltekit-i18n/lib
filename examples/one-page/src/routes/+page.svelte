<script>
  import { t } from '$lib/translations';

  const link = 'https://kit.svelte.dev';
</script>

<h1>{$t('content.title')}</h1>
<p>{@html $t('content.text', { link })}</p>
