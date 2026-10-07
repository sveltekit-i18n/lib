<script lang="ts">
  import { get } from '#lib/translations/index.js';

  const { t, l } = get();

  const CARDS = ['t', 'locale', 'instance'] as const;

  let count = $state(2);
</script>

<svelte:head>
  <title>{$t('home.title')}</title>
</svelte:head>

<section class="hero">
  <span class="badge">{$t('home.badge')}</span>
  <h1>{$t('home.title')}</h1>
  <p>{$t('home.lead')}</p>
</section>

<ul class="cards">
  {#each CARDS as card (card)}
    <li>
      <h2>{$t(`home.cards.${card}.title`)}</h2>
      <p>{$t(`home.cards.${card}.text`)}</p>
    </li>
  {/each}
</ul>

<section class="panel">
  <h2>{$t('home.counter.title')}</h2>
  <p>{$t('home.counter.text', { count })}</p>
  <p>{$t('home.english')} <em>{$l('en', 'home.counter.text', { count })}</em></p>

  <div class="counter">
    <button type="button" onclick={() => (count = Math.max(0, count - 1))}>–</button>
    <button type="button" onclick={() => (count += 1)}>+</button>
  </div>
</section>
