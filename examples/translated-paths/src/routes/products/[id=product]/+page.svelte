<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import type { Path } from '$app/types';

  import { get, localizePath } from '#lib/translations/index.js';

  import type { PageProps } from './$types';

  let { params }: PageProps = $props();

  const i18n = get();
</script>

<svelte:head>
  <title>{i18n.t(`products.items.${params.id}.name`)}</title>
</svelte:head>

<section class="hero">
  <h1>{i18n.t(`products.items.${params.id}.name`)}</h1>
  <p>{i18n.t(`products.items.${params.id}.text`)}</p>
</section>

<section class="panel">
  <p>{i18n.t('products.params')}</p>
  <p><code>{page.url.pathname}</code> → <code>{page.route.id}</code></p>
  <a href={resolve(localizePath('/', i18n.locale).slice(1) as Path)}>{i18n.t('products.back')}</a>
</section>
