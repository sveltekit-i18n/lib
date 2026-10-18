<script lang="ts">
  import Self from './Parts.svelte';
  import type { Rendered } from './types.js';
  import { VOID_ELEMENTS } from './markup.js';

  const { nodes }: { nodes: Rendered[] } = $props();
</script>

{#each nodes as node, index (index)}{#if typeof node === 'string'}{node}{:else if typeof node.render !== 'string'}{@const Render = node.render}<Render {...node.props}><Self nodes={node.children} /></Render>{:else if VOID_ELEMENTS.includes(node.render)}<svelte:element this={node.render} {...node.props} />{:else}<svelte:element this={node.render} {...node.props}><Self nodes={node.children} /></svelte:element>{/if}{/each}
