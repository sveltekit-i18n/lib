<script context="module">
  import { t, locales, locale } from '$lib/translations'; 

  /**
   * IF YOU ARE USING THIS APPROACH OF `$locale` INITIALIZATION,
   * YOU CAN REMOVE `config` IN YOUR `$lib/translations`
  */

  /* export const load = async () => {

    const initialLocale ='en'; // get from cookie / url / fetch from server...
    locale.set(initialLocale);

    return {};
  } */
</script>

<slot />
<br />
<br />
<br />
<br />
<select bind:value="{$locale}">
  {#each $locales as locale}
    <option value="{locale}">{$t(`lang.${locale}`)}</option>
  {/each}
</select>