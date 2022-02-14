<script context="module">
  import { t, locale, locales, loadTranslations } from '$lib/translations';

  /** @type {import('@sveltejs/kit').Load} */
  export const load = async ({ url }) => {
    const { pathname } = url;

     const defaultLocale = 'en'; // get from cookie / user session etc...

    const initLocale = locale.get() || defaultLocale; 

    await loadTranslations(initLocale, pathname);

    locale.set(initLocale); // <== keep this just before the `return` – see https://github.com/sveltekit-i18n/lib/issues/32

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
  {#each $locales as value}
    <option value="{value}">{$t(`lang.${value}`)}</option>
  {/each}
</select>