<script>
  import { getContext } from 'svelte';
  import { I18n } from 'sveltekit-i18n';
  // The documented way to reach another message format is to build on the core
  // directly. It is the same core this package already carries, deduplicated by
  // the exact pin both declare, so the page still holds one copy.
  import { I18n as Core } from '@sveltekit-i18n/base';

  import { LOCALES } from '$lib/docs.js';
  import { FLAVOURS, KEY, MESSAGES, PAYLOAD, parsePayload } from '$lib/playground.js';
  import Panel from './Panel.svelte';

  const i18n = getContext('i18n');

  let { code } = $props();

  let flavour = $state('curly');
  let message = $state(MESSAGES.curly);
  let payload = $state(PAYLOAD);
  let locale = $state('en');

  // ICU brings `intl-messageformat`, which nothing else on this site needs, so
  // it arrives only once a visitor asks for that flavour.
  let icu = $state(null);

  $effect(() => {
    if (flavour !== 'icu' || icu) return;

    import('@sveltekit-i18n/parser-icu').then((module) => { icu = module.default; });
  });

  const choose = (next) => {
    flavour = next;
    message = MESSAGES[next];
  };

  const result = $derived.by(() => {
    const { value, error } = parsePayload(payload);

    if (error) return { error };
    if (flavour === 'icu' && !icu) return {};

    const reports = [];
    const onReport = (report) => reports.push(report);
    const translations = { [locale]: { [KEY]: message } };

    const instance = flavour === 'curly'
      ? new I18n({ initLocale: locale, translations, parserOptions: { onReport } })
      : new Core({ initLocale: locale, translations, parser: icu({ onReport }) });

    return { text: instance.t(KEY, value), reports };
  });
</script>

<Panel name="parser" code={code[flavour]}>
  <div class="flavours" role="group" aria-label={i18n.t('playground.parser.format')}>
    {#each FLAVOURS as name (name)}
      <button
        type="button"
        class:active={flavour === name}
        aria-pressed={flavour === name}
        onclick={() => choose(name)}
      >
        {i18n.t(`playground.parser.flavour.${name}`)}
      </button>
    {/each}
  </div>

  <div class="fields">
    <label>
      {i18n.t('playground.parser.message')}
      <textarea bind:value={message} rows="3" spellcheck="false"></textarea>
    </label>

    <label>
      {i18n.t('playground.parser.payload')}
      <textarea bind:value={payload} rows="3" spellcheck="false"></textarea>
    </label>

    <label class="narrow">
      {i18n.t('playground.parser.locale')}
      <select bind:value={locale}>
        {#each LOCALES as name (name)}
          <option value={name}>{name}</option>
        {/each}
      </select>
    </label>
  </div>

  <p class="label">{i18n.t('playground.output')}</p>

  {#if result.error}
    <output class="bad">{result.error}</output>
  {:else}
    <output>{result.text}</output>
  {/if}

  {#if result.reports?.length}
    <ul class="reports">
      {#each result.reports as report, index (index)}
        <li><code>{report.code}</code> {report.message}</li>
      {/each}
    </ul>
  {:else}
    <p class="note">{i18n.t('playground.parser.silent')}</p>
  {/if}
</Panel>
