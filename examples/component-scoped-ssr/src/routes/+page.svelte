<script>
  import Component from '$lib/component/index.svelte';
  import { t } from '$lib/translations';

  export let data;

  const link = 'https://kit.svelte.dev';

</script>

<h1>{$t('home.title')}</h1>
<p>{@html $t('home.text', { link })}</p>

<Component bind:props={data.cs}/>
<Component bind:props={data.de} />