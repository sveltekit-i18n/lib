<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';

  import { LOCALES, localeOf, pathOf, routeOf } from '$lib/locale';
  import { use } from '$lib/translations';

  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();

  // Provides the instance to every component below — the error page included,
  // which has no `load` of its own — and switches it to the path's locale as
  // each navigation commits, `<html lang>` along with it.
  const i18n = use(() => data);

  const current = $derived(localeOf(page.url.pathname));

  const route = $derived(routeOf(page.url.pathname));

  const href = (path: string, locale: string = current) => pathOf(path, locale);
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

  <nav aria-label={i18n.t('nav.language')}>
    {#each LOCALES as locale (locale)}
      <a
        href={href(route, locale)}
        aria-current={locale === current ? 'page' : undefined}
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
