<script>
  import { t } from '$lib/translations'; 

  const link = 'https://kit.svelte.dev'
</script>

<h1>{$t('home.title')}</h1>
<p>{@html $t('home.text', { link })}</p>
