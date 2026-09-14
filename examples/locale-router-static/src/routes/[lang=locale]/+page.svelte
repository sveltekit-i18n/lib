<script>
  import { getContext } from 'svelte';

  const i18n = getContext('i18n');

  const CARDS = ['entries', 'strict', 'hooks'];
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
  <h2>{i18n.t('home.note.title')}</h2>
  <p>{i18n.t('home.note.text')}</p>
</section>
