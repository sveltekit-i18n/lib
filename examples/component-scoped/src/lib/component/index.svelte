<script>
  import init from './translations';
  export let initLocale = 'en';

  const { t, locale, locales, translations, loading } = init({ initLocale });
</script>


<div>
  {JSON.stringify(translations)}
{#if $loading}
  Loading...
{:else}
  <p>{$t('common.info')}</p>
  
  <select bind:value="{$locale}">
    {#each $locales as locale}
    <option value="{locale}">{$t(`lang.${locale}`)}</option>
    {/each}
  </select>
  {/if}
</div>

<style>
  div {
    border: 2px solid red;
    display: inline-block;
    padding: 20px;
  }
</style>