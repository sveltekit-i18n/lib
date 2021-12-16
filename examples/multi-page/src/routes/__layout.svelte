<script context="module">
  import { t, locale, locales, loadTranslations } from '$lib/translations';

  export const load = async ({ page }) => {
    const { path } = page;

    const locale = 'en'; // get from cookie or user session...
    await loadTranslations(locale, path);

    return {};
  }
</script>

<a href="/">{$t('menu.home')}</a>
<a href="/about">{$t('menu.about')}</a>
<br />
<slot />
<br />
<br />
<br />
<br />
<select bind:value="{$locale}">
  {#each $locales as locale}
    <option value="{locale}">{$t(`lang.${locale}`)}</option>
  {/each}
</select>