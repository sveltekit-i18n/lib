<script>
  import { getContext } from 'svelte';
  import { page } from '$app/state';

  import { routeOf } from '$lib/locale.js';
  import { NAMESPACES } from '$lib/translations';

  const i18n = getContext('i18n');

  // The shell strings sit in `config.translations` under their own flat keys;
  // only the configured namespaces were actually loaded.
  const loaded = $derived(NAMESPACES
    .map(({ key }) => key)
    .filter((key) => Object.hasOwn(i18n.rawTranslations[i18n.locale] ?? {}, key))
    .join(', '));
</script>

<svelte:head>
  <title>{i18n.t('about.title')}</title>
</svelte:head>

<section class="hero">
  <span class="badge">{i18n.t('about.badge')}</span>
  <h1>{i18n.t('about.title')}</h1>
  <p>{i18n.t('about.lead')}</p>
</section>

<section class="panel">
  <p><strong>{i18n.t('about.facts.locale')}:</strong> <code>{i18n.locale}</code></p>
  <p><strong>{i18n.t('about.facts.loaded')}:</strong> <code>{loaded}</code></p>
  <p><strong>{i18n.t('about.facts.route')}:</strong> <code>{routeOf(page.url.pathname)}</code></p>
</section>
