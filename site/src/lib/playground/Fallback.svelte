<script>
  import { getContext } from 'svelte';
  import { I18n } from 'sveltekit-i18n';

  import { FALLBACK, FALLBACK_KEYS } from '$lib/playground.js';
  import Panel from './Panel.svelte';

  const i18n = getContext('i18n');

  let { code } = $props();

  let fallback = $state(true);

  const rows = $derived.by(() => {
    const instance = new I18n({
      initLocale: 'cs',
      fallbackLocale: fallback ? 'en' : undefined,
      translations: FALLBACK,
    });

    return FALLBACK_KEYS.map((key) => ({
      key,
      own: FALLBACK.cs[key],
      text: instance.t(key),
    }));
  });
</script>

<Panel name="fallback" {code}>
  <p class="actions">
    <label class="inline">
      <input type="checkbox" bind:checked={fallback} />
      <code>fallbackLocale: 'en'</code>
    </label>
  </p>

  <table class="fallback">
    <thead>
      <tr>
        <th>{i18n.t('playground.fallback.key')}</th>
        <th>cs</th>
        <th><code>t(key)</code></th>
      </tr>
    </thead>
    <tbody>
      {#each rows as { key, own, text } (key)}
        <tr class:missing={!own}>
          <td><code>{key}</code></td>
          <td>{own ?? '—'}</td>
          <td>{text}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <p class="note">{i18n.t('playground.fallback.note')}</p>
</Panel>
