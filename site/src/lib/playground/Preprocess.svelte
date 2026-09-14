<script>
  import { getContext } from 'svelte';
  import { I18n } from 'sveltekit-i18n';

  import { PREPROCESS_MODES, TRANSLATIONS, parsePayload, shapeOf } from '$lib/playground.js';
  import Panel from './Panel.svelte';

  const i18n = getContext('i18n');

  let { code } = $props();

  let input = $state(TRANSLATIONS);

  const result = $derived.by(() => {
    const { value, error } = parsePayload(input);

    if (error) return { error };

    return {
      modes: PREPROCESS_MODES.map((mode) => {
        const instance = new I18n({ initLocale: 'en', preprocess: mode });

        instance.addTranslations({ en: value ?? {} });

        return { mode, keys: shapeOf(instance.translations.en ?? {}) };
      }),
    };
  });
</script>

<Panel name="preprocess" {code}>
  <div class="fields">
    <label>
      {i18n.t('playground.preprocess.input')}
      <textarea bind:value={input} rows="5" spellcheck="false"></textarea>
    </label>
  </div>

  {#if result.error}
    <output class="bad">{result.error}</output>
  {:else}
    <div class="modes">
      {#each result.modes as { mode, keys } (mode)}
        <div>
          <p class="label"><code>{mode}</code></p>
          <ul class="keys">
            {#each keys as { key, type } (key)}
              <li>
                <code>{key}</code>
                {#if type !== 'string'}<span class="type">{type}</span>{/if}
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>

    <p class="note">{i18n.t('playground.preprocess.note')}</p>
  {/if}
</Panel>
