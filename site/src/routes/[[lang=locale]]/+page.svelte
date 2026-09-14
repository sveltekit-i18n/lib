<script>
  import { getContext } from 'svelte';

  import { REPO } from '$lib/docs.js';

  const i18n = getContext('i18n');

  let { data } = $props();
</script>

<article class="prose">
  <h1>sveltekit-i18n</h1>
  <p>{i18n.t('site.tagline')}</p>

  <pre><code>npm install sveltekit-i18n</code></pre>

  <p>
    <a href="{data.prefix}/docs">{i18n.t('nav.docs')}</a>
    ·
    <a href={REPO} rel="noreferrer">{i18n.t('nav.github')}</a>
  </p>
</article>
