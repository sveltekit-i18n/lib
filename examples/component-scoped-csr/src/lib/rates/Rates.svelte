<script>
  import { I18n } from 'sveltekit-i18n';

  import { config } from './translations.js';

  let { locale } = $props();

  // A component has no `load` of its own, so the instance is created here and
  // its loaders run in the browser. Until they resolve there is nothing to
  // render — which is the trade-off this example exists to show.
  const i18n = new I18n(config);

  const ROWS = [
    { key: 'standard', days: 4 },
    { key: 'express', days: 1 },
  ];

  // `loadTranslations` rather than `setLocale`: it settles the route as well,
  // and a component has no route of its own for `initialized` to wait on.
  $effect(() => {
    i18n.loadTranslations(locale);
  });

  $effect(() => () => i18n.destroy());
</script>

<section class="panel">
  {#if i18n.initialized}
    <h2>{i18n.t('rates.title')}</h2>
    <p>{i18n.t('rates.lead')}</p>

    <ul class="rows">
      {#each ROWS as { key, days } (key)}
        <li>
          <span>{i18n.t(`rates.${key}`)}</span>
          <strong>{i18n.t('rates.days', { days })}</strong>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="skeleton" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>
  {/if}
</section>

<style>
  .rows {
    margin: 1rem 0 0;
    padding: 0;
    list-style: none;
  }

  .rows li {
    display: flex;
    justify-content: space-between;
    padding: 0.6rem 0;
    border-top: 1px solid var(--line);
  }

  .skeleton {
    display: grid;
    gap: 0.6rem;
  }

  .skeleton span {
    height: 0.9rem;
    border-radius: 6px;
    background: var(--line);
  }

  .skeleton span:first-child { width: 40%; }
  .skeleton span:last-child { width: 70%; }
</style>
