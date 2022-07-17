<script context="module">
  import { loadTranslations, defaultLocale, locales } from '$lib/translations';
  
  /** @type {import('@sveltejs/kit').Load} */
  export const load = async ({ url }) => {
    const { pathname } = url;
    
    const supportedLocales = locales.get();

    const lang = supportedLocales.find((l) => `${l}`.toLowerCase() === `${pathname.match(/[^/]+?(?=\/|$)/)}`.toLowerCase()) || defaultLocale;

    const route = pathname.replace(new RegExp(`^/${lang}`), '');

    await loadTranslations(lang, route);

    return { stuff: { route, lang } };
  }
</script>

<slot />