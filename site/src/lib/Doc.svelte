<script>
  import { getContext } from 'svelte';

  import { REPO } from '$lib/docs.js';

  const i18n = getContext('i18n');

  let { html, title, headings, file } = $props();
</script>

<svelte:head>
  <title>{title} · sveltekit-i18n</title>
</svelte:head>

<div class="doc">
  <article class="prose">
    {@html html}
  </article>

  <aside>
    {#if headings.length}
      <p class="label">{i18n.t('docs.onThisPage')}</p>
      <ul>
        {#each headings as heading (heading.id)}
          <li><a href="#{heading.id}">{heading.text}</a></li>
        {/each}
      </ul>
    {/if}

    <a class="edit" href="{REPO}/blob/master/docs/{file}" rel="noreferrer">
      {i18n.t('docs.edit')}
    </a>
  </aside>
</div>
