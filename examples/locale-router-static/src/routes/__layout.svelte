<script context="module">
  import { t, loadTranslations, locales, locale } from '$lib/translations';
  
  /** @type {import('@sveltejs/kit').Load} */
  export const load = async ({ url, params }) => {
    const { pathname } = url;

    const lang = `${pathname.match(/\w+?(?=\/|$)/) || ''}`;

    const route = pathname.replace(new RegExp(`^/${lang}`), '');

    await loadTranslations(lang, route);

    return { stuff: { route, lang } };
  }
</script>

<slot />