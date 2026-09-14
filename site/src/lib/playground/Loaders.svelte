<script>
  import { getContext } from 'svelte';
  import { I18n } from 'sveltekit-i18n';

  import { LOADED, LOADERS, LOADER_LOCALES, ROUTES } from '$lib/playground.js';
  import Panel from './Panel.svelte';

  const i18n = getContext('i18n');

  let { code } = $props();

  let locale = $state('en');
  let route = $state('/');
  let log = $state([]);

  // Which loaders ran, recorded by the loaders themselves, so what the panel
  // reports is what the library actually did.
  let ran = [];

  const build = (record) => new I18n({
    loaders: LOADERS.flatMap(({ key, routes }) => LOADER_LOCALES.map((name) => ({
      locale: name,
      key,
      routes,
      loader: () => {
        record(key);

        return LOADED[key][name];
      },
    }))),
  });

  let instance = $state.raw(build((key) => ran.push(key)));

  const load = async () => {
    ran = [];

    // Every matching loader runs on an instance that has loaded nothing yet,
    // so a throwaway one tells the panel which loaders the route selects —
    // observed the same way, rather than by restating the matching rule here.
    const matched = [];
    const probe = build((key) => matched.push(key));

    await Promise.all([
      instance.loadTranslations(locale, route),
      probe.loadTranslations(locale, route),
    ]);

    probe.destroy();

    const fired = ran;

    log = [...log, {
      locale,
      route,
      loaders: LOADERS.map(({ key, shape }) => ({
        key,
        shape,
        status: fired.includes(key) ? 'ran' : matched.includes(key) ? 'cached' : 'skipped',
      })),
      keys: Object.keys(instance.translations[locale] ?? {}),
    }];
  };

  const invalidate = () => {
    instance.invalidate();
    log = [...log, { locale, route, invalidated: true }];
  };

  const reset = () => {
    instance = build();
    log = [];
  };
</script>

<Panel name="loaders" {code}>
  <div class="fields">
    <label class="narrow">
      {i18n.t('playground.loaders.locale')}
      <select bind:value={locale}>
        {#each LOADER_LOCALES as name (name)}
          <option value={name}>{name}</option>
        {/each}
      </select>
    </label>

    <label class="narrow">
      {i18n.t('playground.loaders.route')}
      <select bind:value={route}>
        {#each ROUTES as path (path)}
          <option value={path}>{path}</option>
        {/each}
      </select>
    </label>
  </div>

  <p class="actions">
    <button type="button" class="primary" onclick={load}>{i18n.t('playground.loaders.load')}</button>
    <button type="button" onclick={invalidate}>{i18n.t('playground.loaders.invalidate')}</button>
    <button type="button" onclick={reset}>{i18n.t('playground.loaders.reset')}</button>
  </p>

  {#if log.length}
    <ol class="log">
      {#each log as entry, index (index)}
        <li>
          <p class="trigger">
            {#if entry.invalidated}
              <code>invalidate()</code>
            {:else}
              <code>loadTranslations('{entry.locale}', '{entry.route}')</code>
            {/if}
          </p>

          {#if entry.loaders}
            <ul class="statuses">
              {#each entry.loaders as { key, shape, status } (key)}
                <li class={status}>
                  <code>{key}</code>
                  <span>{i18n.t(`playground.loaders.shape.${shape}`)}</span>
                  <strong>{i18n.t(`playground.loaders.status.${status}`)}</strong>
                </li>
              {/each}
            </ul>

            <p class="keys-line">
              {#each entry.keys as key (key)}<code>{key}</code>{/each}
            </p>
          {/if}
        </li>
      {/each}
    </ol>
  {:else}
    <p class="note">{i18n.t('playground.loaders.empty')}</p>
  {/if}
</Panel>
