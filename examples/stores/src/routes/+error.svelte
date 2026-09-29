<script lang="ts">
  import { page } from '$app/state';

  import { get } from '$lib/translations';

  // The error page renders without any `load` having run, so everything it
  // needs sits in `config.translations` rather than behind a loader.
  const { t } = get();

  const message = $derived(
    page.status === 404 ? $t('error.404') : $t('error.default'),
  );
</script>

<article class="error">
  <p class="status">{page.status}</p>
  <h1>{$t('error.title')}</h1>
  <p>{message}</p>
  <a href="/">{$t('error.home')}</a>
</article>
