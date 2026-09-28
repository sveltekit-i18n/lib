<script lang="ts">
  import Rates from '$lib/rates/Rates.svelte';
  import { get } from '$lib/translations';

  import type { PageProps } from './$types';

  const i18n = get();

  let { data }: PageProps = $props();

  const CARDS = ['payload', 'ssr', 'reactive'] as const;
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

<Rates locale={i18n.locale} snapshot={data.rates} />
