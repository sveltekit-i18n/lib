<script>
  import favicon from '$lib/assets/favicon.svg';
  import { t, locale, locales } from '$lib/translations';

  let { children } = $props();

  const handleChange = ({ currentTarget }) => {
    const { value } = currentTarget;
    document.cookie = `lang=${value} ;`;
  };

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
<select bind:value="{$locale}" onchange={handleChange}>
  {#each $locales as value}
    <option value="{value}">{$t(`lang.${value}`)}</option>
  {/each}
</select>
