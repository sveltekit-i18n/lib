<script>
  import { writable } from 'svelte/store';
  import { t, locales, locale } from '$lib/translations'; 

  const count = writable(2);
</script>

{$t('menu.notification', { count: $count })}<br />
<button on:click="{() => {if ($count) $count-=1}}">–</button>
<button on:click="{() => {$count+=1}}">+</button>
<hr />

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