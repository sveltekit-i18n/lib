<script lang="ts">
  import { get } from '$lib/translations';

  const i18n = get();

  const CARDS = ['tree', 'string', 'runtime'] as const;

  let count = $state(2);
</script>

<svelte:head>
  <title>{i18n.t.home.title()}</title>
</svelte:head>

<section class="hero">
  <span class="badge">{i18n.t.home.badge()}</span>
  <h1>{i18n.t.home.title()}</h1>
  <p>{i18n.t.home.lead()}</p>
</section>

<ul class="cards">
  {#each CARDS as card (card)}
    <li>
      <h2>{i18n.t.home.cards[card].title()}</h2>
      <p>{i18n.t.home.cards[card].text()}</p>
    </li>
  {/each}
</ul>

<section class="panel">
  <h2>{i18n.t.home.counter.title()}</h2>
  <!-- The leaf takes the payload its key takes: a misspelled `count` is a type error. -->
  <p>{i18n.t.home.counter.text({ count })}</p>
  <p>{i18n.t.home.counter.string()} <em>{i18n.t('home.counter.text', { count })}</em></p>

  <div class="counter">
    <button type="button" onclick={() => (count = Math.max(0, count - 1))}>–</button>
    <button type="button" onclick={() => (count += 1)}>+</button>
  </div>
</section>
