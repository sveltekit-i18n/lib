<script>
  import { setContext } from 'svelte';

  import '../app.css';
  import { page } from '$app/state';

  import { DEFAULT_LOCALE, LOCALES } from '$lib/locale.js';

  let { data, children } = $props();

  // The error page has no `load` of its own, so it reads the instance here.
  setContext('i18n', data.i18n);

  const i18n = data.i18n;

  // Internal links carry the current locale, and the default one is the bare
  // URL rather than ?lang=en — the same page should not have two addresses.
  const href = (pathname, locale = data.locale) =>
    (locale === DEFAULT_LOCALE ? pathname : `${pathname}?lang=${locale}`);
</script>

<header>
  <a class="brand" href={href('/')}>
    <strong>sveltekit-i18n</strong>
    <span>{i18n.t('example.name')}</span>
  </a>

  <nav>
    <a href={href('/')} aria-current={page.url.pathname === '/' ? 'page' : undefined}>
      {i18n.t('nav.home')}
    </a>
    <a href={href('/about')} aria-current={page.url.pathname === '/about' ? 'page' : undefined}>
      {i18n.t('nav.about')}
    </a>
  </nav>

  <nav aria-label={i18n.t('nav.language')}>
    {#each LOCALES as locale (locale)}
      <a
        href={href(page.url.pathname, locale)}
        aria-current={locale === data.locale ? 'page' : undefined}
      >{locale}</a>
    {/each}
  </nav>
</header>

<main>
  {@render children()}
</main>

<footer>
  <a href="https://github.com/sveltekit-i18n/lib/tree/master/examples/locale-param">
    {i18n.t('footer.source')}
  </a>
  ·
  <a href="https://sveltekit-i18n.github.io/docs">{i18n.t('footer.docs')}</a>
</footer>
