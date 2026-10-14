<script lang="ts">
  import '../app.css';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import type { Path } from '$app/types';

  import { LOCALES, delocalize, localizePath, use } from '#lib/translations/index.js';

  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();

  // Provides the instance to every component below — the error page included,
  // which has no `load` of its own — and switches it to the locale of the
  // pathname as each navigation commits.
  const i18n = use(() => data);

  // The canonical pathname of the page shown, without the query a visitor
  // sent: `/about` at `/cs/o-nas?ref=x`.
  const path = $derived(delocalize(page.url).path.split(/[?#]/)[0]);

  // `localizePath` gives a path without `basePath`; `resolve()` adds it. Its
  // type admits only the app's own pathnames, which a translated one is not.
  const href = (canonical: string, locale = i18n.locale) => resolve(localizePath(canonical, locale).slice(1) as Path);

  // Each locale's pathname of the page, for search engines. A pathname that
  // belongs to another locale says nothing of this one, and an error page has
  // no alternates.
  const alternates = $derived.by(() => {
    if (page.error) return [];

    return LOCALES.flatMap((locale) => {
      const url = new URL(href(path, locale), page.url.href);

      return delocalize(url).locale === locale ? [[locale, url.href]] : [];
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

  <!-- A link per locale to the page shown: the pathname gives the locale, so
       the navigation switches it. -->
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
  <a href="https://github.com/sveltekit-i18n/lib/tree/master/examples/translated-paths">
    {i18n.t('footer.source')}
  </a>
  ·
  <a href="https://sveltekit-i18n.github.io/docs">{i18n.t('footer.docs')}</a>
</footer>
