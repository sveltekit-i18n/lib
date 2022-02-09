<script lang="ts">
  import { t } from '$lib/translations'; 
  import { derived, writable } from 'svelte/store';
  import Layout from './__layout.svelte';

  const number = writable(10);
  const count = writable(1000);
  
  const t10 = (10 * 60 * 1000);
  const initTime = Date.now() - t10;
  const now = writable(initTime);
  setInterval(() => {now.set(Date.now() - t10)}, 1000);

  const currency = 100;
  const test = 'TEST_VALUE';
  const gender = writable('female');
  const error = writable(404);
</script>

<h1>{$t('content.title_placeholders')}</h1>
{$t('content.placeholder_simple', { placeholder: 'output' })}<br />
{$t('content.placeholder_default')}<br />
{$t('content.placeholder_simple', { default: `dynamic default ${$number}` })}<br />

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
  {$t('content.modifier_ne', { value: $number })}<br />
  {$t('content.modifier_lt', { value: $number })}<br />
  {$t('content.modifier_lte', { value: $number })}<br />
  {$t('content.modifier_gt', { value: $number })}<br />
  {$t('content.modifier_gte', { value: $number })}<br />
</div>
<br />
<div>
  <button on:click="{() => {($gender === 'female') ? $gender='male' : $gender='female'}}">Gender switch</button><br />
  {$t('content.modifier_eq_string', { value: $gender })}<br />
  {$t('content.modifier_ne_string', { value: $gender })}<br />
</div>
<p>{$t('content.modifier_date', { value: $now }, { timeStyle: 'full' })}</p>
<p>{$t('content.modifier_ago', { value: initTime }, { format: 'auto' })}</p>

<h1>{$t('content.title_custom')}</h1>
<p>{$t('content.modifier_test', { value: test})}</p>
<p>{$t('content.modifier_currency', { value: currency})}</p>

<h1>{$t('content.title_dynamic_default')}</h1>
<b>Set error code:</b>
<button on:click="{() => {$error = 404}}">404</button>
<button on:click="{() => {$error = 500}}">500</button>
<button on:click="{() => {$error = undefined}}">(undefined)</button>
<br />
<p>{$t(`content.error.${$error}`, { default: $t('content.error.default')})} ({$error})</p>
