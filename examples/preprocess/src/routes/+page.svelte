<script>
  import { full, preserveArrays, none, custom } from '$lib/translations';

  const { t: tFull, translations: translationsFull } = full;
  const { t: tPreserveArrays, translations: translationsPreserveArrays } = preserveArrays;
  const { t: tNone, translations: translationsNone } = none;
  const { t: tCustom, translations: translationsCustom } = custom;


  const link = 'https://kit.svelte.dev';
</script>

<h1>Full preprocessing (default)</h1>

<pre>
{JSON.stringify($translationsFull, null, 2)}
</pre>

<h3>{$tFull('content.0.title')}</h3>
<p>{@html $tFull('content.0.text', { link })}</p>
<p>{$tFull('content.0.something.else')}</p>
<br />

<h3>{$tFull('content.1.title')}</h3>
<p>{@html $tFull('content.1.text')}</p>
<p>{$tFull('content.1.something.else')}</p>
<br />

<hr>

<h1>Arrays preserved</h1>

<pre>
{JSON.stringify($translationsPreserveArrays, null, 2)}
</pre>

{#each $tPreserveArrays('content', { default: [] }) as content}
  <h3>{$tPreserveArrays(`${content.title}`)}</h3>
  <p>{@html $tPreserveArrays(`${content.text}`, { link })}</p>
  <p>{$tPreserveArrays(`${content['something.else']}`)}</p>
  <br />
{/each}

<hr>

<h1>No preprocessing</h1>

<pre>
{JSON.stringify($translationsNone, null, 2)}
</pre>

{#each $tNone('content', { default: [] }) as content}
  <h3>{$tNone(`${content.title}`)}</h3>
  <p>{@html $tNone(`${content.text}`, { link })}</p>
  <p>{$tNone(`${content.something.else}`)}</p>
  <br />
{/each}

<hr>

<h1>Custom preprocessing</h1>

<pre>
{JSON.stringify($translationsCustom, null, 2)}
</pre>

{#each $tCustom('content', { default: [] }) as content}
  <h3>{$tCustom(`${content.title}`)}</h3>
  <p>{@html $tCustom(`${content.text}`, { link })}</p>
  <p>{$tCustom(`${content.something.else}`)}</p>
  <br />
{/each}

