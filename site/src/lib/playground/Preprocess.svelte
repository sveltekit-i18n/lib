<script>
  import { getContext } from 'svelte';
  import { I18n } from 'sveltekit-i18n';

  import { PREPROCESS_MODES, TRANSLATIONS, parsePayload, shapeOf } from '$lib/playground.js';
  import Panel from './Panel.svelte';

  const i18n = getContext('i18n');

  let { code } = $props();

  let mode = $state('full');
  let input = $state(TRANSLATIONS);

  const result = $derived.by(() => {
    const { value, error } = parsePayload(input);

    if (error) return { error };

    const instance = new I18n({ initLocale: 'en', preprocess: mode });

    instance.addTranslations({ en: value ?? {} });

    return { keys: shapeOf(instance.translations.en ?? {}) };
  });
</script>

<Panel name="preprocess" code={code[mode]}>
  <!-- The modes are config values, so they keep their own spelling. -->
  <div class="flavours" role="group" aria-label={i18n.t('playground.preprocess.mode')}>
    {#each PREPROCESS_MODES as name (name)}
      <button
        type="button"
        class:active={mode === name}
        aria-pressed={mode === name}
        onclick={() => { mode = name; }}
      >
        {name}
      </button>
    {/each}
  </div>

  <div class="fields">
    <label>
      {i18n.t('playground.preprocess.input')}
      <textarea bind:value={input} rows="5" spellcheck="false"></textarea>
    </label>
  </div>

  <p class="label">{i18n.t('playground.output')}</p>

  {#if result.error}
    <output class="bad">{result.error}</output>
  {:else}
    <ul class="keys">
      {#each result.keys as { key, type } (key)}
        <li>
          <code>{key}</code>
          {#if type !== 'string'}<span class="type">{type}</span>{/if}
        </li>
      {/each}
    </ul>

    <p class="note">{i18n.t('playground.preprocess.note')}</p>
  {/if}
</Panel>
