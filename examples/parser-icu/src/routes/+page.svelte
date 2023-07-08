<script lang="ts">
  import { locale, t } from '$lib/translations';

  $: number = 1;

  $: now = Date.now();
  setInterval(() => {now = Date.now();}, 1000);

  $: gender = 'female';

  const currencyRatio = { en: 1, cs: 22.4 };
</script>

<div>
  <input type="number" bind:value="{number}" min="0" />
  <button on:click="{() => {if (number) number -= 1;}}">–</button>
  <button on:click="{() => {number += 1;}}">+</button>
</div>

<p>{$t('content.plural', { value: number })}</p>
<p>{$t('content.number', { value: number * currencyRatio[$locale] })}</p>
<p>{$t('content.date', { value: now }, { date: { FULL:{ timeStyle: 'full', dateStyle: 'full' } } })}</p>
<p>{$t('content.selectordinal', { value: number })}</p>

<div>
  <button on:click="{() => {if (gender === 'female') { gender = 'male'; } else { gender = 'female';}}}">Gender switch</button><br />
  {$t('content.select', { value: gender })}<br />
</div>