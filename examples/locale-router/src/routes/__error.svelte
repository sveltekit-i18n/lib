<script context="module">
  import { loadTranslations } from '$lib/translations';
  
  /** @type {import('@sveltejs/kit').Load} */
  export const load = async ({ stuff, props }) => {

    await loadTranslations(stuff.lang, 'error');

    return {};
  }
</script>


<script>
  import { t, locale } from '$lib/translations';
  import { page } from '$app/stores';

  export let status = $page.status;
</script>

<div class="content">
  <h1>{$t('error.shit.happens')} ({status})</h1>
  <p>{$t(`error.${status}.some.info`)}</p>
  <br>
  <br>
  {$locale} – {$t(`lang.${$locale}`)}
</div>