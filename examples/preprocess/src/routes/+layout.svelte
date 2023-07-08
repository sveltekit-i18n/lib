<script>
  import { full, preserveArrays, none, custom } from '$lib/translations';
  const { t, locale, locales } = full;

  locale.subscribe((value) => {
    preserveArrays.setLocale(value);
    none.setLocale(value);
    custom.setLocale(value);
  });
</script>

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