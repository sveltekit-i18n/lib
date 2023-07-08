<script>
  import { page } from '$app/stores';
  import { t, locale } from '$lib/translations';

  const { status } = $page;
</script>

<div class="content">
  <h1>{$t('error.shit.happens')} ({status})</h1>
  <p>{$t(`error.${status}`, { default: $t('error.default') })}</p>
  <br>
  <br>
  {$locale} – {$t(`lang.${$locale}`)}
</div>