<script>
  import { page } from '$app/state';

  import { FEATURES } from '$lib/landing.js';
  import { REPO } from '$lib/docs.js';
  import { localeOf, prefixOf } from '$lib/locale.js';
  import { get } from '$lib/translations';

  const i18n = get();

  let { data } = $props();

  const prefix = $derived(prefixOf(localeOf(page.url.pathname)));
</script>

<svelte:head>
  <title>sveltekit-i18n</title>
  <meta name="description" content={i18n.t('site.tagline')} />
</svelte:head>

<section class="hero">
  <h1>sveltekit-i18n</h1>
  <p class="tagline">{i18n.t('site.tagline')}</p>

  {@html data.install}

  <p class="cta">
    <a class="button" href="{prefix}/docs">{i18n.t('home.read')}</a>
    <a href={REPO} rel="noreferrer">{i18n.t('nav.github')}</a>
  </p>

  <p class="requirements">{i18n.t('home.requirements')}</p>
</section>

<section class="features">
  <h2>{i18n.t('home.why')}</h2>

  <ul>
    {#each FEATURES as feature (feature)}
      <li>
        <strong>{i18n.t(`home.feature.${feature}.title`)}</strong>
        <span>{i18n.t(`home.feature.${feature}.text`)}</span>
      </li>
    {/each}
  </ul>
</section>

<section class="start">
  <h2>{i18n.t('home.start')}</h2>

  <ol>
    <li>
      <p>{i18n.t('home.step.config')}</p>
      {@html data.config}
    </li>
    <li>
      <p>{i18n.t('home.step.use')}</p>
      {@html data.use}
    </li>
  </ol>

  <p><a href="{prefix}/docs/getting-started">{i18n.t('home.more')}</a></p>
</section>
