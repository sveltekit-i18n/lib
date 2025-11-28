<script>
  import favicon from '$lib/assets/favicon.svg';
  import { t, locales, locale } from '$lib/translations';

  let { children } = $props();

  let count = $state(2);
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{$t('menu.notification', { count })}<br />
<button onclick={() => {if (count) count -= 1;}}>–</button>
<button onclick={() => {count += 1;}}>+</button>
<hr />

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
