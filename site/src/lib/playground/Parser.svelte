<script>
  import { getContext } from 'svelte';
  import { I18n } from 'sveltekit-i18n';
  // The documented way to reach another message format is to build on the core
  // directly. It is the same core this package already carries, deduplicated by
  // the exact pin both declare, so the page still holds one copy.
  import { I18n as Core } from '@sveltekit-i18n/base';

  import { LOCALES } from '$lib/docs.js';
  import { highlightCurly, highlightJsonText, highlightPlain } from '$lib/highlight.js';
  import { FLAVOURS, KEY, MESSAGES, PAYLOAD, parsePayload } from '$lib/playground.js';
  import Editor from './Editor.svelte';
  import Panel from './Panel.svelte';

  const i18n = getContext('i18n');

  let { code } = $props();

  let flavour = $state('curly');
  let message = $state(MESSAGES.curly);
  let payload = $state(PAYLOAD);
  let locale = $state('en');

  // Each alternative brings its own engine, which nothing else on this site
  // needs, so a parser arrives only once a visitor asks for that flavour.
  const LOADERS = {
    icu: () => import('@sveltekit-i18n/parser-icu'),
    mf2: () => import('@sveltekit-i18n/parser-mf2'),
    i18next: () => import('@sveltekit-i18n/parser-i18next'),
  };

  let parsers = $state({});

  $effect(() => {
    if (flavour === 'curly' || parsers[flavour]) return;

    LOADERS[flavour]().then((module) => { parsers = { ...parsers, [flavour]: module.default }; });
  });

  const choose = (next) => {
    flavour = next;
    message = MESSAGES[next];
  };

  // Only Curly is described here: the alternatives are engines this site wraps,
  // and a drawing that is not the format's own would show what the message does
  // not do.
  const describe = $derived(flavour === 'curly' ? highlightCurly : highlightPlain);

  const result = $derived.by(() => {
    const { value, error } = parsePayload(payload);

    if (error) return { error };
    if (flavour !== 'curly' && !parsers[flavour]) return {};

    const reports = [];
    const onReport = (report) => reports.push(report);
    const translations = { [locale]: { [KEY]: message } };

    const instance = flavour === 'curly'
      ? new I18n({ initLocale: locale, translations, parserOptions: { onReport } })
      : new Core({ initLocale: locale, translations, parser: parsers[flavour]({ onReport }) });

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
      <Editor bind:value={message} highlight={describe} rows={4} />
    </label>

    <label>
      {i18n.t('playground.parser.payload')}
      <Editor bind:value={payload} highlight={highlightJsonText} rows={4} />
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
