<script>
  import init from './translations';
  const { t, locale, locales, translations, addTranslations, loadTranslations } = init();

  export let initLocale;
  export let initTranslations;

  addTranslations(initTranslations);
  const promise = loadTranslations(initLocale);

  $: (initTranslations = $translations);
  $: ($locale = initLocale);
</script>

<div>
  {JSON.stringify($translations)}
  {#await promise}
    Loading...
  {:then}
    <p>{$t('common.info')}</p>

    <select bind:value={initLocale} on:input={() => locale.set(initLocale)}>
      {#each $locales as l}
      <option value="{l}">{$t(`lang.${l}`)}</option>
      {/each}
    </select>
  {/await}
</div>

<style>
  div {
    border: 2px solid red;
    display: inline-block;
    padding: 20px;
  }
</style>