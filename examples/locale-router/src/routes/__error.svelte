<script context="module">
  import { t, locale, loadTranslations } from '$lib/translations';

  /** @type {import('@sveltejs/kit').Load} */
  export const load = async ({ stuff, props }) => {

    await loadTranslations(stuff.lang, 'error');

    return {};
  }
</script>


<script>
  import { page } from '$app/stores';

  export let status = $page.status;
</script>

<div class="content">
  <h1>{$t('error.shit.happens')} ({status})</h1>
  <p>{$t(`error.${status}`, { default: $t('error.default') })}</p>
  <br>
  <br>
  {$locale} – {$t(`lang.${$locale}`)}
</div>