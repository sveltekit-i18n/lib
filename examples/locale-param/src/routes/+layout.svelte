<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';

  import { DEFAULT_LOCALE, LOCALES, use } from '#lib/translations/index.js';

  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();

  // Provides the instance to every component below — the error page included,
  // which has no `load` of its own — and switches it to the locale the server
  // read off `?lang=` as each navigation commits.
  const i18n = use(() => data);

  // Internal links carry the current locale, and the default one is the bare
  // URL rather than ?lang=en — the same page should not have two addresses.
  const href = (pathname: string, locale = i18n.locale) => {
    return locale === DEFAULT_LOCALE ? pathname : `${pathname}?lang=${locale}`;
  };
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
        aria-current={locale === i18n.locale ? 'page' : undefined}
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
