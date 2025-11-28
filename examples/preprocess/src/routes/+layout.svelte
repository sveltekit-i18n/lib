<script>
  import favicon from '$lib/assets/favicon.svg';
  import { full, preserveArrays, none, custom } from '$lib/translations';
  const { t, locale, locales } = full;

  let { children } = $props();

  locale.subscribe((value) => {
    preserveArrays.setLocale(value);
    none.setLocale(value);
    custom.setLocale(value);
  });
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
