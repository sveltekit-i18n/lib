<script>
  import { t } from '$lib/translations'; 
  import { writable } from 'svelte/store';

  const number = writable(10);
  const count = writable(1000);
  const time = Date.now() - (10 * 60 * 1000);
  const currency = 100;
  const test = 'TEST_VALUE'
</script>

<h1>{$t('content.title_built-in')}</h1>
<div>
  {$t('content.modifier_number', { count: $count })}<br />
  <button on:click="{() => {if ($count) $count-=1}}">–</button>
  <button on:click="{() => {$count+=1}}">+</button>
</div>
<br />
<div>
  <input type="number" bind:value="{$number}" /><br />
  {$t('content.modifier_eq', { value: $number })}<br />
  {$t('content.modifier_lt', { value: $number })}<br />
  {$t('content.modifier_lte', { value: $number })}<br />
  {$t('content.modifier_gt', { value: $number })}<br />
  {$t('content.modifier_gte', { value: $number })}<br />
</div>
<p>{$t('content.modifier_date', { value: time})}</p>
<p>{$t('content.modifier_ago', { value: time})}</p>

<h1>{$t('content.title_custom')}</h1>
<p>{$t('content.modifier_test', { value: test})}</p>
<p>{$t('content.modifier_currency', { value: currency})}</p>
