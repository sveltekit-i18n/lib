<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import init from './translations';
  
  export let initLocale = 'en';

  const { t, locale, locales, translations, loadTranslations, addTranslations } = init();

  /**
  * NOTE: IF YOU WANT TO REINIT COMPONENT WITH THE CURRENT VALUES ON NEXT LOAD:
  * 
  * 1) Uncomment `if (savedData)` block
  * 2) Uncomment `onDestroy` block
  * 3) Implement your storing mechanism
  * 
  * */

  let initLoading = true;

  // if (savedData) {
  //   addTranslations(savedData.savedTranslations);
  //   $locale = savedData.savedLocale;
  //   initLoading = false;
  // }
  
  const loading = writable(initLoading);

  onMount(async () => {
    if (initLoading) {
      await loadTranslations(initLocale);
      $loading = false;
    }
  });
  
  // onDestroy(() => {
  //   const savedData = {
  //     savedTranslations: $translations,
  //     savedLocale: $locale,
  //   }
  //   console.log('Data to store...', savedData);
  // });
</script>


<div>
  {JSON.stringify($translations)}
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