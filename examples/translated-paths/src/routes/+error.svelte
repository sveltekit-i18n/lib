<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import type { Path } from '$app/types';

  import { get, localizePath } from '#lib/translations/index.js';

  // The error page renders without any `load` having run, so everything it
  // needs sits in `config.translations` rather than behind a loader. Its
  // locale is the pathname's: `/cs/nic` is a Czech 404.
  const i18n = get();

  const message = $derived(
    page.status === 404 ? i18n.t('error.404') : i18n.t('error.default'),
  );
</script>

<article class="error">
  <p class="status">{page.status}</p>
  <h1>{i18n.t('error.title')}</h1>
  <p>{message}</p>
  <a href={resolve(localizePath('/', i18n.locale).slice(1) as Path)}>{i18n.t('error.home')}</a>
</article>
