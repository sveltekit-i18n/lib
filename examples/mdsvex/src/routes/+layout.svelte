<script>
  import { setContext } from 'svelte';

  import '../app.css';
  import { page } from '$app/state';

  import { LOCALES, routeOf } from '$lib/locale.js';

  let { data, children } = $props();

  // The error page has no `load` of its own, so it reads the instance here.
  setContext('i18n', data.i18n);

  const i18n = data.i18n;

  const route = $derived(routeOf(page.url.pathname));

  // A navigation between locales never reaches the server hook that wrote
  // `<html lang>`, so the switch is repeated here.
  $effect(() => {
    document.documentElement.lang = i18n.locale;
  });

  const href = (path, locale = data.locale) => `/${locale}${path === '/' ? '' : path}`;
</script>

<header>
  <a class="brand" href={href('/')}>
    <strong>sveltekit-i18n</strong>
    <span>{i18n.t('example.name')}</span>
  </a>

  <nav>
    <a href={href('/')} aria-current={route === '/' ? 'page' : undefined}>
      {i18n.t('nav.home')}
    </a>
    <a href={href('/guide')} aria-current={route === '/guide' ? 'page' : undefined}>
      {i18n.t('nav.guide')}
    </a>
  </nav>

  <!-- Preloading these would run their load and switch this page's locale
       without a navigation ever happening. -->
  <nav aria-label={i18n.t('nav.language')} data-sveltekit-preload-data="off">
    {#each LOCALES as locale (locale)}
      <a
        href={href(route, locale)}
        aria-current={locale === data.locale ? 'page' : undefined}
      >{locale}</a>
    {/each}
  </nav>
</header>

<main>
  {@render children()}
</main>

<footer>
  <a href="https://github.com/sveltekit-i18n/lib/tree/master/examples/mdsvex">
    {i18n.t('footer.source')}
  </a>
  ·
  <a href="https://sveltekit-i18n.github.io/docs">{i18n.t('footer.docs')}</a>
</footer>
