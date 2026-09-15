<script>
  import { setContext } from 'svelte';

  import '../app.css';
  import { page } from '$app/state';

  import { LOCALES } from '$lib/locale.js';

  let { data, children } = $props();

  // The error page has no `load` of its own, so it reads the instance here.
  setContext('i18n', data.i18n);

  const i18n = data.i18n;

  let cookieBlocked = $state(false);

  const select = async ({ currentTarget }) => {
    const locale = currentTarget.value;

    // Persisted for the next request; the switch itself happens right here.
    document.cookie = `lang=${locale}; path=/; max-age=31536000; samesite=lax`;

    // A `SameSite=Lax` cookie never lands in a cross-site frame, so the next
    // full load would negotiate the old locale again.
    cookieBlocked = !document.cookie.includes(`lang=${locale}`);

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

{#if cookieBlocked}
  <p class="notice" role="status">{i18n.t('notice.cookie')}</p>
{/if}

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

<style>
  .notice {
    margin: 0;
    padding: 0.85rem 1.5rem;
    border-bottom: 1px solid var(--line);
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 0.9rem;
  }
</style>
