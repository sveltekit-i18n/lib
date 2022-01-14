<script>
  import { t, locales, locale } from '$lib/translations';
  import { page } from '$app/stores'
  import { goto } from '$app/navigation';
  import { writable } from 'svelte/store';

  const count = writable(2);

  $: ({ route } = $page.stuff);
</script>

<a href="/{$locale}">{$t('menu.home')}</a>
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
<select on:change="{({ target }) => goto(target.value)}">
  {#each $locales as lc}
    <option value="/{lc}{route}" selected="{lc === $locale}">{$t(`lang.${lc}`)}</option>
  {/each}
</select>