<script context="module" lang="ts">
  import { t, locales, locale } from '$lib/translations';
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