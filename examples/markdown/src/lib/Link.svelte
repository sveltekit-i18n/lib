<script lang="ts">
  import type { Snippet } from 'svelte';

  // A link's attributes arrive as props, its text as `children`.
  let { href, title, children }: { href?: string; title?: string; children?: Snippet } = $props();

  // The message names the address; whether a link leaves the site in a new
  // tab is the app's call.
  const external = $derived(/^(https?:)?\/\//.test(href ?? ''));
</script>

{#if external}
  <a {href} {title} target="_blank" rel="noopener noreferrer">{@render children?.()} ↗</a>
{:else}
  <a {href} {title}>{@render children?.()}</a>
{/if}
