<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { t, locale, locales } from '$lib/translations';

  $: count = 2;
</script>

<a href="/">{$t('menu.home')}</a>
<a href="/about">{$t('menu.about')}</a>
<br/>
<br/>
{$t('menu.notification', { count })}<br />
<button on:click="{() => {if (count) count -= 1;}}">–</button>
<button on:click="{() => {count += 1;}}">+</button>
<hr />
<slot />
<br />
<br />
<br />
<br />
<select on:change="{({ currentTarget }) => goto(new URL(`?lang=${currentTarget.value}`, `${$page.url.href}`))}" >
  {#each $locales as value}
    <option value="{value}" selected={value === $locale}>{$t(`lang.${value}`)}</option>
  {/each}
</select>