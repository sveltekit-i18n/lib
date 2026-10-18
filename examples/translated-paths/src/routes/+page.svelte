<script lang="ts">
  import { resolve } from '$app/paths';
  import type { Path } from '$app/types';

  import { PRODUCTS } from '#lib/products.js';
  import { get, localizePath } from '#lib/translations/index.js';

  const i18n = get();

  const CARDS = ['reroute', 'links', 'loaders'] as const;

  // Written once, canonical: `/products/lamp` is `/cs/produkty/lamp` in Czech.
  const href = (canonical: string) => resolve(localizePath(canonical, i18n.locale).slice(1) as Path);
</script>

<svelte:head>
  <title>{i18n.t('home.title')}</title>
</svelte:head>

<section class="hero">
  <span class="badge">{i18n.t('home.badge')}</span>
  <h1>{i18n.t('home.title')}</h1>
  <p>{i18n.t('home.lead')}</p>
</section>

<ul class="cards">
  {#each CARDS as card (card)}
    <li>
      <h2>{i18n.t(`home.cards.${card}.title`)}</h2>
      <p>{i18n.t(`home.cards.${card}.text`)}</p>
    </li>
  {/each}
</ul>

<section class="panel">
  <h2>{i18n.t('home.products')}</h2>
  <ul>
    {#each PRODUCTS as product (product)}
      <li><a href={href(`/products/${product}`)}>{i18n.t(`products.items.${product}.name`)}</a></li>
    {/each}
  </ul>
</section>
