<script>
  import '../app.css';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';

  import { LOCALES, NPM, REPO, SPONSOR } from '$lib/docs.js';
  import { ICONS } from '$lib/icons.js';
  import { localeOf, prefixOf } from '$lib/locale.js';
  import { use } from '$lib/translations';

  let { data, children } = $props();

  const EXTERNAL = [{ key: 'github', url: REPO }, { key: 'npm', url: NPM }];

  const i18n = use(() => data);

  const current = $derived(localeOf(page.url.pathname));
  const prefix = $derived(prefixOf(current));

  // The path without its locale prefix, so the switcher can re-prefix it.
  const bare = $derived(page.url.pathname.slice(prefix.length) || '/');

  const href = (target) => `${prefixOf(target)}${bare === '/' ? '' : bare}` || '/';
</script>

<a class="skip" href="#main">Skip to content</a>

<a class="banner" href="{REPO}/tree/2.x" rel="noreferrer">
  {i18n.t('banner.v3', { branch: '2.x' })}
</a>

<header>
  <a class="brand" href={prefix || '/'}>
    <strong>sveltekit-i18n</strong>
    <span>{i18n.t('site.tagline')}</span>
  </a>

  <nav>
    <a href={prefix || '/'}>{i18n.t('nav.home')}</a>
    <a href="{prefix}/docs">{i18n.t('nav.docs')}</a>
    <a href="{prefix}/examples">{i18n.t('nav.examples')}</a>
    <a href="{prefix}/playground">{i18n.t('nav.playground')}</a>

    {#each EXTERNAL as { key, url } (key)}
      <a class="mark" href={url} target="_blank" rel="noreferrer" aria-label={i18n.t(`nav.${key}`)}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="currentColor" d={ICONS[key]} />
        </svg>
      </a>
    {/each}
  </nav>
</header>

<main id="main">
  {@render children()}
</main>

<footer>
  <a href="{REPO}/blob/master/LICENSE" rel="noreferrer">MIT</a>
  <a href="{REPO}/issues" rel="noreferrer">Issues</a>
  <div class="sponsor">
    <iframe
      src="{SPONSOR}/button"
      title="Sponsor sveltekit-i18n"
      height="32"
      width="114"
      loading="lazy"
    ></iframe>
  </div>

  <label class="language">
    {i18n.t('nav.language')}
    <select value={current} onchange={(event) => goto(href(event.currentTarget.value))}>
      {#each LOCALES as locale (locale)}
        <option value={locale}>{i18n.t(`lang.${locale}`)}</option>
      {/each}
    </select>
  </label>
</footer>
