<script lang="ts">
  import { I18n, type Snapshot } from 'sveltekit-i18n';

  import { config } from './translations';

  let { locale, snapshot }: { locale: string | undefined; snapshot: Snapshot.Envelope } = $props();

  // Hydrated with the payload the page's `load` produced: the snapshot's locale
  // is active at once and its records mark its loaders as run, so the first
  // render is complete and no loader runs to produce it.
  const i18n = new I18n(config);

  // svelte-ignore state_referenced_locally
  i18n.hydrate(snapshot);

  const ROWS = [
    { key: 'standard', days: 4 },
    { key: 'express', days: 1 },
  ] as const;

  // Still reactive afterwards: switching the language in the browser loads the
  // component's own lexicon for the new locale.
  $effect(() => {
    if (locale) i18n.loadTranslations(locale);
  });

  $effect(() => () => i18n.destroy());
</script>

<section class="panel">
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
</style>
