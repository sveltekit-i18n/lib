<script>
  import Error from '../../+error.svelte';

  let { data } = $props();
</script>

<Error status={data.status} />
