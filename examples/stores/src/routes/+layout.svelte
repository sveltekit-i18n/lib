<script lang="ts">
  import '../app.css';
  import type { ChangeEventHandler } from 'svelte/elements';

  import { LOCALES, use } from '$lib/translations';

  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();

  // Provides the stores to every component below — the error page included,
  // which has no `load` of its own — and keeps the instance behind them on the
  // route and the locale the server answers as each navigation commits.
  const { t, locale, loading } = use(() => data);

  // Persisted for the next request. The switch itself is `bind:value`: setting
  // `$locale` switches right here, and the store emits once the new locale's
  // translations have loaded.
  const remember: ChangeEventHandler<HTMLSelectElement> = ({ currentTarget }) => {
    document.cookie = `lang=${currentTarget.value}; path=/; max-age=31536000; samesite=lax`;
  };
</script>

<header>
  <a class="brand" href="/">
    <strong>sveltekit-i18n</strong>
    <span>{$t('example.name')}</span>
  </a>

  <select aria-label={$t('nav.language')} aria-busy={$loading} bind:value={$locale} onchange={remember}>
    {#each LOCALES as option (option)}
      <option value={option}>{$t(`lang.${option}`)}</option>
    {/each}
  </select>
</header>

<main>
  {@render children()}
</main>

<footer>
  <a href="https://github.com/sveltekit-i18n/lib/tree/master/examples/stores">
    {$t('footer.source')}
  </a>
  ·
  <a href="https://sveltekit-i18n.github.io/docs">{$t('footer.docs')}</a>
</footer>
