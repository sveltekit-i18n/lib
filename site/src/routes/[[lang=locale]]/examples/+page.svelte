<script>
  import { getContext } from 'svelte';

  import { EXAMPLES, GROUPS, runHref, sourceHref } from '$lib/examples.js';

  const i18n = getContext('i18n');
</script>

<svelte:head>
  <title>{i18n.t('examples.title')} · sveltekit-i18n</title>
  <meta name="description" content={i18n.t('examples.lead')} />
</svelte:head>

<section class="examples">
  <h1>{i18n.t('examples.title')}</h1>
  <p class="lead">{i18n.t('examples.lead')}</p>

  {#each GROUPS as group (group)}
    <h2>{i18n.t(`examples.group.${group}`)}</h2>

    <ul>
      {#each EXAMPLES.filter((example) => example.group === group) as { name, adapter } (name)}
        <li>
          <strong>{i18n.t(`examples.app.${name}.title`)}</strong>
          <span>{i18n.t(`examples.app.${name}.text`)}</span>

          <p class="links">
            <a class="button" href={runHref(name)} rel="noreferrer">{i18n.t('examples.run')}</a>
            <a href={sourceHref(name)} rel="noreferrer">{i18n.t('examples.source')}</a>
            <code>@sveltejs/adapter-{adapter}</code>
          </p>
        </li>
      {/each}
    </ul>
  {/each}
</section>
