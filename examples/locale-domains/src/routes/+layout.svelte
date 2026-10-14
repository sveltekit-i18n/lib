<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';

  import { LOCALES, delocalize, localizeHref, use } from '#lib/translations/index.js';

  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();

  // Provides the instance to every component below — the error page included,
  // which has no `load` of its own — and switches it to the locale of the
  // host and the pathname as each navigation commits.
  const i18n = use(() => data);

  // The canonical pathname of the page shown, without the query a visitor
  // sent: `/about` at `example.cz/o-nas?ref=x`.
  const path = $derived(delocalize(page.url).path.replace(/[?#].*/s, ''));

  // `localizeHref` carries `basePath`, so it takes no `resolve()`. Given the
  // page's URL, it adds an origin only where the link leaves its host: a link
  // to the Czech page is a full page load to `example.cz`.
  const href = (canonical: string, locale = i18n.locale) => localizeHref(canonical, locale, page.url);

  // Each locale's page for search engines, at the origin the map spells for
  // it, whatever host renders this one. A pathname that belongs to no locale
  // belongs to its host's first, and an error page has no alternates.
  const alternates = $derived.by(() => {
    if (page.error) return [];

    return LOCALES.flatMap((locale) => {
      const url = new URL(localizeHref(path, locale), page.url.href);
      const { locale: own, domain } = delocalize(url);

      return (own ?? domain) === locale ? [[locale, url.href]] : [];
    });
  });
</script>

<svelte:head>
  {#each alternates as [locale, url] (locale)}
    <link rel="alternate" hreflang={locale} href={url} />
  {/each}
</svelte:head>

<header>
  <a class="brand" href={href('/')}>
    <strong>sveltekit-i18n</strong>
    <span>{i18n.t('example.name')}</span>
  </a>

  <nav>
    <a href={href('/')} aria-current={path === '/' ? 'page' : undefined}>
      {i18n.t('nav.home')}
    </a>
    <a href={href('/about')} aria-current={path === '/about' ? 'page' : undefined}>
      {i18n.t('nav.about')}
    </a>
  </nav>

  <!-- A link per locale to the page shown, on the host that serves it: the
       host and the pathname give the locale, so the navigation switches it. -->
  <nav aria-label={i18n.t('nav.language')}>
    {#each LOCALES as locale (locale)}
      <a
        href={href(path, locale)}
        hreflang={locale}
        aria-current={locale === i18n.locale ? 'page' : undefined}
      >{locale}</a>
    {/each}
  </nav>
</header>

<main>
  {@render children()}
</main>

<footer>
  <a href="https://github.com/sveltekit-i18n/lib/tree/master/examples/locale-domains">
    {i18n.t('footer.source')}
  </a>
  ·
  <a href="https://sveltekit-i18n.github.io/docs">{i18n.t('footer.docs')}</a>
</footer>
