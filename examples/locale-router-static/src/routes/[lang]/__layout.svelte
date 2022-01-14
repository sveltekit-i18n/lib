<script context="module">
  import { t, loadTranslations, locales, locale } from '$lib/translations';

  export const load = async ({ url, params }) => {
    const { pathname } = url;
    const { lang } = params;

    const route = pathname.replace(new RegExp(`^/${lang}`), '');

    await loadTranslations(lang, route);

    return { stuff: { route } };
  }
</script>


<script>
  import { page } from '$app/stores'
  import { goto } from '$app/navigation';
  import { writable } from 'svelte/store';

  const count = writable(2);

$: ({ route } = $page.stuff);
</script>

<a href="/{$locale}/">{$t('menu.home')}</a>
<a href="/{$locale}/about">{$t('menu.about')}</a>
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
<select on:change="{(e) => goto(e.target.value)}">
  {#each $locales as l}
    <option value="/{l}{route}" selected="{l === $locale}">{$t(`lang.${l}`)}</option>
  {/each}
</select>