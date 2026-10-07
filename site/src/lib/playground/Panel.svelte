<script>
  import { get } from '#lib/translations/index.js';

  const i18n = get();

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
