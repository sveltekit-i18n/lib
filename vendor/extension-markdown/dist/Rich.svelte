<script lang="ts">
  import type { I18n } from '@sveltekit-i18n/base';
  import { untrack } from 'svelte';

  import { parse } from './parse.js';
  import type { Node } from './parse.js';
  import { inertPayload } from './payload.js';
  import { DEFAULT_COMPONENTS, apply } from './render.js';
  import Parts from './shared/Parts.svelte';
  import { names, resolve } from './shared/resolve.js';
  import type { Components, Options, Report } from './types.js';

  type Props = {
    i18n: I18n<any, any, any, any>;
    options: Options;
    key: string;
    params?: unknown;
    args?: unknown[];
    locale?: string;
    components?: Components;
  };

  const { i18n, options, key, params, args = [], locale, components }: Props = $props();

  // A report channel is app code: a throwing one must not take a render down,
  // and one that reads or writes state must not tie the render to that state.
  const report = (entry: Omit<Report, 'key' | 'locale'>) => untrack(() => {
    try {
      options.onReport?.({ key, locale: locale ?? i18n.locale, ...entry });
    } catch {
      return;
    }
  });

  // A payload that cannot be walked (a getter that throws) renders without it.
  const inert = (value: unknown) => {
    try {
      return inertPayload(value);
    } catch {
      return undefined;
    }
  };

  const text = (value: unknown) => {
    if (typeof value === 'string') return value;

    try {
      return String(value);
    } catch {
      return '';
    }
  };

  const parts = $derived.by(() => {
    const payload = inert(params);
    const message = text(locale === undefined
      ? (i18n.t as (key: string, ...params: unknown[]) => unknown)(key, payload, ...args)
      : (i18n.l as (locale: string, key: string, ...params: unknown[]) => unknown)(locale, key, payload, ...args));
    const parsed = parse(message);

    parsed.dropped.forEach((dropped) => {
      if (dropped.code === 'url-blocked') {
        return report({ ...dropped, message: `The URL of a ${dropped.node} in the message for key '${key}' has a scheme that is not allowed there; its '${dropped.attribute}' was dropped.` });
      }

      if (dropped.node === 'link') {
        return report({ ...dropped, message: `The message for key '${key}' holds a link in a link; the inner one was rendered as its text.` });
      }

      report({ ...dropped, message: `The message for key '${key}' nests elements deeper than a render takes; it was rendered as text.` });
    });

    return parsed.parts;
  });

  const lookup = ({ type }: Node) => {
    const resolved = resolve(type, [DEFAULT_COMPONENTS, options.components, components]);
    // `null` unmaps a node on purpose: nothing to report.
    const named = [options.components, components].some((layer) => names(layer, type));

    if (resolved === undefined && !named) {
      report({
        code: 'node-unmapped',
        node: type,
        message: `The ${type} in the message for key '${key}' is not mapped; its content was rendered without it.`,
      });
    }

    return resolved;
  };

  const rendered = $derived(apply(parts, lookup));
</script>

<Parts nodes={rendered} />
