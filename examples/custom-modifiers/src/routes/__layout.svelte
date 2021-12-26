<script>
  import { t, locales, locale } from '$lib/translations'; 
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