<script>
  import { goto } from '$app/navigation';
  import { t } from '$lib/translations';

  export let data;

  const redirectedRoute = '/about?something=else';
</script>

<h1>{$t('about.title')}</h1>
<p>{@html $t('about.text')}</p>

<br />
<br />

<button type="button" on:click={() => goto(redirectedRoute)}>Load additional content</button>

{#if data.route === redirectedRoute}
  <p><b>{$t('more.content')}</b></p>
{/if}