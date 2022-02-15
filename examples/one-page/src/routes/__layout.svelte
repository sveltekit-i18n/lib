<script context="module">
  import { t, locales, locale, loadTranslations } from '$lib/translations'; 

  /** @type {import('@sveltejs/kit').Load} */
  export const load = async () => {

    const initialLocale ='en'; // get from cookie / url / fetch from server...

    await loadTranslations(initialLocale); // keep this just before the `return`

    return {};
  }
</script>

<script>
  import { writable } from 'svelte/store';

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
  {#each $locales as value}
    <option value="{value}">{$t(`lang.${value}`)}</option>
  {/each}
</select>