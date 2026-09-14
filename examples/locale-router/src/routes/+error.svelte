<script>
  import { getContext } from 'svelte';
  import { page } from '$app/state';

  // The error page renders without any `load` having run, so everything it
  // needs sits in `config.translations` rather than behind a loader.
  const i18n = getContext('i18n');

  const message = $derived(
    page.status === 404 ? i18n.t('error.404') : i18n.t('error.default'),
  );
</script>

<article class="error">
  <p class="status">{page.status}</p>
  <h1>{i18n.t('error.title')}</h1>
  <p>{message}</p>
  <a href="/">{i18n.t('error.home')}</a>
</article>
