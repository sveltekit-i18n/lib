<script>
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

  // if (savedData) {
  //   addTranslations(savedData.savedTranslations);
  //   initLocale = savedData.savedLocale;
  // }

    const promise = loadTranslations(initLocale);

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
  {#await promise}
    Loading...
  {:then}
    <p>{$t('common.info')}</p>
    
    <select bind:value="{$locale}">
      {#each $locales as locale}
      <option value="{locale}">{$t(`lang.${locale}`)}</option>
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