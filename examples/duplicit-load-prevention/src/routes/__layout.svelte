<script context="module">
  import { browser } from '$app/env';
  import { get, writable } from 'svelte/store';
  import { t, loading, locale, locales, addTranslations, loadTranslations, translations } from '$lib/translations';

  export const load = async ({ page, fetch }) => {
    const { path } = page;
    const initialLocale = get(locale) || 'en'; // get from cookie or user session...

    // fetch method prevents duplicit (SSR / CSR) load
    const { translationProps } = await fetch('/loadTranslations', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({initialLocale, path}),
    }).then((x) => x.json());

    if (browser) addTranslations(...translationProps); // add translations in client
    // `loadTranslations` method just sets proper locale and path in case translations are already added:
    await loadTranslations(initialLocale, path);

    return {};
  }
</script>

<script>
  const count = writable(2);


  const handleLocaleChange = async ({currentTarget}) => {
    const {value} = currentTarget;
    $locale = value;
    await loading.toPromise();

    await fetch('/addTranslations', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        translations: $translations
      }),
    });
  };
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