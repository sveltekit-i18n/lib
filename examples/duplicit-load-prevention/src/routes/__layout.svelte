<script context="module">
  import { browser } from '$app/env';
  import { page } from '$app/stores';
  import { get, writable } from 'svelte/store';
  import { t, loading, locale, locales, addTranslations, getTranslationProps, loadTranslations } from '$lib/translations';

  export const load = async ({ url, fetch }) => {
    const { pathname } = url;
    const initialLocale = get(locale) || 'en'; // get the default from cookie or user session...

    // SvelteKit's fetch method prevents duplicit (SSR / CSR) load
    const { translationProps } = await (await fetch('/loadTranslations', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({initialLocale, pathname}),
    })).json();

    console.log('LOAD', translationProps);

    // add translations on client-side
    if (browser) addTranslations(...translationProps); 

    // `loadTranslations` method just sets proper locale and pathname in case translations are already added
    await loadTranslations(initialLocale, pathname);

    return {};
  }
</script>

<script>
  const handleLocaleChange = async ({currentTarget}) => {
    /**
     * We want to send client-side loaded (on locale change) translations to the server,
     * to prevent server-side load when user navigates out of this page and then back again.
    */
    const {value} = currentTarget;
    const {url} = $page;
    
    // get `translationProps` for newly added translations
    const translationProps = await getTranslationProps(value, url.pathname)

    // add `translationProps` to client
    addTranslations(...translationProps);

    // set appropriate locale
    if ($locale !== value) $locale = value;

    // send `translationProps` to server
    if (translationProps.length) {
      await fetch('/addTranslations', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          translationProps,
        }),
      });
    }
  };

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
<select on:change="{handleLocaleChange}">
  {#each $locales as locale}
    <option value="{locale}">{$t(`lang.${locale}`)}</option>
  {/each}
</select>