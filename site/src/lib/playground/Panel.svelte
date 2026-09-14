<script>
  import { getContext } from 'svelte';

  const i18n = getContext('i18n');

  let { name, code, children } = $props();
</script>

<section class="panel" id={name}>
  <h2>
    <a class="anchor" href="#{name}" aria-hidden="true">#</a>
    {i18n.t(`playground.${name}.title`)}
  </h2>

  <p class="lead">{i18n.t(`playground.${name}.lead`)}</p>

  {@render children()}

  <details>
    <summary>{i18n.t('playground.source')}</summary>
    {@html code}
  </details>
</section>
