<script context="module">
  import { browser } from '$app/env';
  import { get, writable } from 'svelte/store';
  import { t, locale, locales, addTranslations, loadTranslations, initialized } from '$lib/translations';
  
  export const load = async ({ page, fetch }) => {
    const { path } = page;
    const initialLocale = 'en'; // get from cookie or user session...

    // fetch method prevents duplicit (SSR / CSR) load
    const { translations } = await fetch('/loadTranslations', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({initialLocale, path}),
    }).then((x) => x.json());

    if (browser) {
      addTranslations(translations);
      // `loadTranslations` method just sets proper locale and path in case translations are already loaded:
      await loadTranslations(initialLocale, path);
    }

    return {};
  }
</script>

<script>
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