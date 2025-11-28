<script>
  import favicon from '$lib/assets/favicon.svg';
  import { t, locales, locale } from '$lib/translations';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let { children } = $props();

  let count = $state(2);

  let route = $derived($page.data.route);
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<a href="/{$locale}">{$t('menu.home')}</a>
<a href="/{$locale}/about">{$t('menu.about')}</a>
<br/>
<br/>
{$t('menu.notification', { count })}<br />
<button onclick={() => {if (count) count -= 1;}}>–</button>
<button onclick={() => {count += 1;}}>+</button>
<hr />
{@render children()}
<br />
<br />
<br />
<br />
<select
  onchange={({ target }) => {
    goto(`/${target.value}${route}`);
    document.querySelector('html').setAttribute('lang', target.value);
  }}
>
  {#each $locales as lc}
    <option value={lc} selected={lc === $locale}>{$t(`lang.${lc}`)}</option>
  {/each}
</select>
