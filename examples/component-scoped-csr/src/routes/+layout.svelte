<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import type { ChangeEventHandler } from 'svelte/elements';

  import { LOCALES, use } from '$lib/translations';

  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();

  // Provides the instance to every component below — the error page included,
  // which has no `load` of its own — and keeps it on the route and the locale
  // the server answers as each navigation commits.
  const i18n = use(() => data);

  const select: ChangeEventHandler<HTMLSelectElement> = async ({ currentTarget }) => {
    const locale = currentTarget.value;

    // Persisted for the next request; the switch itself happens right here.
    document.cookie = `lang=${locale}; path=/; max-age=31536000; samesite=lax`;

    await i18n.setLocale(locale);
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
  <a href="https://github.com/sveltekit-i18n/lib/tree/master/examples/component-scoped-csr">
    {i18n.t('footer.source')}
  </a>
  ·
  <a href="https://sveltekit-i18n.github.io/docs">{i18n.t('footer.docs')}</a>
</footer>
