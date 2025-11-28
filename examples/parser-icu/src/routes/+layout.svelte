<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import { t, locales, locale } from '$lib/translations';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
<br />
<br />
<br />
<br />
<select bind:value="{$locale}">
  {#each $locales as value}
    <option value="{value}">{$t(`lang.${value}`)}</option>
  {/each}
</select>
