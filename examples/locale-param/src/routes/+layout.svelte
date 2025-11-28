<script>
  import favicon from '$lib/assets/favicon.svg';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { t, locale, locales } from '$lib/translations';

  let { children } = $props();

  let count = $state(2);
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<a href="/">{$t('menu.home')}</a>
<a href="/about">{$t('menu.about')}</a>
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
<select onchange={({ currentTarget }) => goto(new URL(`?lang=${currentTarget.value}`, `${$page.url.href}`))}>
  {#each $locales as value}
    <option value="{value}" selected={value === $locale}>{$t(`lang.${value}`)}</option>
  {/each}
</select>
