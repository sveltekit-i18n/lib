<script context="module" lang="ts">
  import { t, loading, locales, locale } from '$lib/translations';

  /** @type {import('@sveltejs/kit').Load} */
  export const load = async () => {
    await loading.toPromise();

    return {};
  }
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