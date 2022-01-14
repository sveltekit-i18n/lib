<script lang="ts">
  import { t } from '$lib/translations';
  import { page } from '$app/stores';

  const { code, lang } = $page.params;
</script>

<div class="content">
  <h1>{$t('shit.happens')} ({code})</h1>
  <br>
  <br>
  {lang}
</div>