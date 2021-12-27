<script context="module">
  import { t, locales, locale, loadConfig, config } from '$lib/translations';

  export const load = async ({ page }) => {
    await loadConfig(config);

    return {};
  }
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