<script lang="ts">
  import { page } from '$app/state';

  import { DEFAULT_LOCALE, get } from '$lib/translations';

  // The error page renders without any `load` having run, so everything it
  // needs sits in `config.translations` rather than behind a loader.
  const i18n = get();

  const message = $derived(
    page.status === 404 ? i18n.t('error.404') : i18n.t('error.default'),
  );

  // The failing URL's locale has to survive the link: a bare `/` is another
  // locale's page.
  const home = $derived(i18n.locale === DEFAULT_LOCALE ? '/' : `/?lang=${i18n.locale}`);
</script>

<article class="error">
  <p class="status">{page.status}</p>
  <h1>{i18n.t('error.title')}</h1>
  <p>{message}</p>
  <a href={home}>{i18n.t('error.home')}</a>
</article>
