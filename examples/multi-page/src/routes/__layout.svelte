<script context="module">
  import { t, locale, locales, loadTranslations } from '$lib/translations';
  
  export const load = async ({ url }) => {
    const { pathname } = url;
    
    const locale = 'en'; // get from cookie or user session...
    await loadTranslations(locale, pathname);
    
    return {};
  }
</script>

<script>
  import { writable } from 'svelte/store';

  const count = writable(2);
</script>

<a href="/">{$t('menu.home')}</a>
<a href="/about">{$t('menu.about')}</a>
<br/>
<br/>
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