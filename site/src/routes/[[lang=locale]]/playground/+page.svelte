<script>
  import { getContext } from 'svelte';

  import Fallback from '$lib/playground/Fallback.svelte';
  import Loaders from '$lib/playground/Loaders.svelte';
  import Parser from '$lib/playground/Parser.svelte';
  import Preprocess from '$lib/playground/Preprocess.svelte';

  const i18n = getContext('i18n');

  let { data } = $props();
</script>

<svelte:head>
  <title>{i18n.t('playground.title')} – sveltekit-i18n</title>
  <meta name="description" content={i18n.t('playground.lead')} />
</svelte:head>

<div class="playground">
  <h1>{i18n.t('playground.title')}</h1>
  <p class="lead">{i18n.t('playground.lead')}</p>

  <Parser code={data.code.parser} />
  <Preprocess code={data.code.preprocess} />
  <Loaders code={data.code.loaders} />
  <Fallback code={data.code.fallback} />
</div>
