<script lang="ts">
  import { page } from '$app/state';

  import { delocalize, get } from '#lib/translations/index.js';

  const i18n = get();

  // What the URL says: the locale its pathname belongs to, if any, and the
  // first locale of its host, if the map lists the host.
  const read = $derived(delocalize(page.url));
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
  <p><strong>{i18n.t('about.facts.host')}:</strong> <code>{page.url.host}</code></p>
  <p><strong>{i18n.t('about.facts.requested')}:</strong> <code>{page.url.pathname}</code></p>
  <p><strong>{i18n.t('about.facts.canonical')}:</strong> <code>{read.path}</code></p>
  <p><strong>{i18n.t('about.facts.locale')}:</strong> <code>{read.locale ?? '—'}</code></p>
  <p><strong>{i18n.t('about.facts.domain')}:</strong> <code>{read.domain ?? '—'}</code></p>
</section>
