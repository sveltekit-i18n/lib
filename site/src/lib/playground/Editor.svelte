<script>
  // A textarea over a drawing of the same text. Both lie in one grid cell with
  // identical metrics, so the drawing is what a visitor reads and the textarea
  // — transparent but for its caret — is what they type into. The pair is
  // sized by the drawing, so neither can scroll away from the other.
  let { value = $bindable(), highlight, rows = 4 } = $props();

  // A trailing newline keeps a line box under the caret on the last line.
  const html = $derived(highlight(`${value}\n`));
</script>

<div class="editor" style="--rows: {rows}">
  <pre class="shiki" aria-hidden="true">{@html html}</pre>
  <textarea bind:value spellcheck="false"></textarea>
</div>
