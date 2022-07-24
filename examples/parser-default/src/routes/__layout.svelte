<script context="module" lang="ts">
  import type { Load } from '@sveltejs/kit';
  import { t, loading, locales, locale } from '$lib/translations';

  export const load: Load = async () => {
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