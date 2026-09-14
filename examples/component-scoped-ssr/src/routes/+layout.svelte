<script>
  import { setContext } from 'svelte';

  import '../app.css';
  import { page } from '$app/state';

  import { LOCALES } from '$lib/locale.js';

  let { data, children } = $props();

  // The error page has no `load` of its own, so it reads the instance here.
  setContext('i18n', data.i18n);

  const i18n = data.i18n;

  const select = async ({ currentTarget }) => {
    const locale = currentTarget.value;

    // Persisted for the next request; the switch itself happens right here.
    document.cookie = `lang=${locale}; path=/; max-age=31536000; samesite=lax`;

    await i18n.setLocale(locale);

    document.documentElement.lang = locale;
  };
</script>

<header>
  <a class="brand" href="/">
    <strong>sveltekit-i18n</strong>
    <span>{i18n.t('example.name')}</span>
  </a>

  <nav>
    <a href="/" aria-current={page.url.pathname === '/' ? 'page' : undefined}>
      {i18n.t('nav.home')}
    </a>
    <a href="/about" aria-current={page.url.pathname === '/about' ? 'page' : undefined}>
      {i18n.t('nav.about')}
    </a>
  </nav>

  <select aria-label={i18n.t('nav.language')} value={i18n.locale} onchange={select}>
    {#each LOCALES as locale (locale)}
      <option value={locale}>{i18n.t(`lang.${locale}`)}</option>
    {/each}
  </select>
</header>

<main>
  {@render children()}
</main>

<footer>
  <a href="https://github.com/sveltekit-i18n/lib/tree/master/examples/component-scoped-ssr">
    {i18n.t('footer.source')}
  </a>
  ·
  <a href="https://sveltekit-i18n.github.io/docs">{i18n.t('footer.docs')}</a>
</footer>
