<script context="module">
  import { dev } from '$app/env';
  import { t, locale, loadTranslations } from '$lib/translations';
  import Error from '../../__error.svelte';

  /** @type {import('@sveltejs/kit').Load} */
  export const load = async ({ params, stuff }) => {
    const { error, lang } = params;

    let status = parseInt(error);

    if (Number.isNaN(status)) status = 404;

    await loadTranslations(lang, 'error');

    return {
      props: { status },
      /**
       * NOTE: The `status` prop redirects us to `__error.svelte` in dev mode with correct error code,
       * but for build returns 200 and renders this page (imported `__error.svelte` with status prop).
      */
      status: dev ? status : 200,
      stuff: { status }
    };
  }
</script>

<script>
  export let status;
</script>

<Error {status} />