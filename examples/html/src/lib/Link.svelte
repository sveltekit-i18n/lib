<script lang="ts">
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  // The attributes a translation may set on `<a>` arrive as props, its content
  // as `children`.
  let { children, ...attributes }: HTMLAnchorAttributes = $props();

  // The message names the address; whether a link leaves the site in a new
  // tab is the app's call.
  const external = $derived(/^(https?:)?\/\//.test(attributes.href ?? ''));
</script>

{#if external}
  <a {...attributes} target="_blank" rel="noopener noreferrer">{@render children?.()} ↗</a>
{:else}
  <a {...attributes}>{@render children?.()}</a>
{/if}
