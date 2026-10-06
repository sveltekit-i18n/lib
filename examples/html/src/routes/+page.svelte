<script lang="ts">
  import { BLOCK_ELEMENTS } from '@sveltekit-i18n/extension-html';

  import Link from '$lib/Link.svelte';
  import { get } from '$lib/translations';

  const i18n = get();

  let name = $state('<b>Ann</b>');
</script>

<svelte:head>
  <title>{i18n.t('home.title')}</title>
</svelte:head>

<section class="hero">
  <span class="badge">{i18n.t('home.badge')}</span>
  <h1>{i18n.t('home.title')}</h1>
  <p><i18n.T key="home.lead" /></p>
</section>

<section class="panel">
  <h2>{i18n.t('home.payload.title')}</h2>
  <label>
    {i18n.t('home.payload.label')}
    <input bind:value={name} />
  </label>
  <!-- The key's payload is checked as `t()`'s is: `name` is required here. -->
  <p><i18n.T key="home.payload.text" params={{ name }} /></p>
  <p>{i18n.t('home.payload.note')}</p>
</section>

<section class="panel">
  <h2>{i18n.t('home.component.title')}</h2>
  <p><i18n.T key="home.component.text" components={{ a: Link }} /></p>
  <p><i18n.T key="home.component.note" /></p>
</section>

<section class="panel">
  <h2>{i18n.t('home.blocks.title')}</h2>
  <!-- A `div` can hold a list; a `p` could not, so the list is enabled here only. -->
  <div><i18n.T key="home.blocks.text" components={BLOCK_ELEMENTS} /></div>
</section>

<section class="panel">
  <h2>{i18n.t('home.blocked.title')}</h2>
  <p><i18n.T key="home.blocked.text" /></p>
  <p>{i18n.t('home.blocked.note')}</p>
</section>

<section class="panel">
  <h2>{i18n.t('home.string.title')}</h2>
  <p>{i18n.t('home.string.text')}</p>
  <p><code>{i18n.t('home.payload.text', { name })}</code></p>
</section>

<style>
  /* The shared stylesheet styles the `select`; this page alone has an input. */
  input {
    margin-left: 0.5rem;
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--bg);
    color: inherit;
    font: inherit;
  }

  div > :global(ul) {
    margin-bottom: 0;
  }
</style>
