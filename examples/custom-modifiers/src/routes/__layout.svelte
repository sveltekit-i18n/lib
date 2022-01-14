<script context="module">
  import { t, locales, locale, loadConfig, config } from '$lib/translations';

  export const load = async () => {
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
  {#each $locales as value}
    <option value="{value}">{$t(`lang.${value}`)}</option>
  {/each}
</select>