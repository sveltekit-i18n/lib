<script>
  import { t, locale, locales } from '$lib/translations';

  const handleChange = ({ currentTarget }) => {
    const { value } = currentTarget;

    document.cookie = `lang=${value} ;`;
  };

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
<select bind:value="{$locale}" on:change={handleChange}>
  {#each $locales as value}
    <option value="{value}" selected="{$locale === value}">{$t(`lang.${value}`)}</option>
  {/each}
</select>