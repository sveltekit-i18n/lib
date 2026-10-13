<script lang="ts">
  import { page } from '$app/state';

  import { delocalize, get } from '#lib/translations/index.js';

  const i18n = get();

  // `page.url` keeps the pathname the visitor requested; `page.route.id` is
  // the route `reroute` served it from.
  const canonical = $derived(delocalize(page.url));
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
  <p><strong>{i18n.t('about.facts.requested')}:</strong> <code>{page.url.pathname}</code></p>
  <p><strong>{i18n.t('about.facts.route')}:</strong> <code>{page.route.id}</code></p>
  <p><strong>{i18n.t('about.facts.canonical')}:</strong> <code>{canonical.path}</code></p>
  <p><strong>{i18n.t('about.facts.locale')}:</strong> <code>{canonical.locale}</code></p>
</section>
