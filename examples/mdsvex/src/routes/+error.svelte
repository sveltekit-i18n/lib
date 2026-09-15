<script>
  import { getContext } from 'svelte';
  import { page } from '$app/state';

  // The error page renders without any `load` having run, so everything it
  // needs sits in `config.translations` rather than behind a loader.
  const i18n = getContext('i18n');

  const message = $derived(
    page.status === 404 ? i18n.t('error.404') : i18n.t('error.default'),
  );

  // The failing URL's locale has to survive the link: a bare `/` is another
  // locale's page, and hovering it preloads that locale onto the instance
  // this page is still rendering from.
  const home = $derived(`/${page.data.locale}`);
</script>

<article class="error">
  <p class="status">{page.status}</p>
  <h1>{i18n.t('error.title')}</h1>
  <p>{message}</p>
  <a href={home}>{i18n.t('error.home')}</a>
</article>
