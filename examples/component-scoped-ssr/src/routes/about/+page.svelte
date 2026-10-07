<script lang="ts">
  import { page } from '$app/state';

  import { NAMESPACES, get } from '#lib/translations/index.js';

  const i18n = get();

  const raw = $derived(i18n.locale ? i18n.rawTranslations[i18n.locale] : undefined);

  // The shell strings sit in `config.translations` under their own flat keys;
  // only the configured namespaces were actually loaded.
  const loaded = $derived(NAMESPACES
    .map(({ namespace }) => namespace)
    .filter((namespace) => Object.hasOwn(raw ?? {}, namespace))
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
  <p><strong>{i18n.t('about.facts.route')}:</strong> <code>{page.url.pathname}</code></p>
</section>
