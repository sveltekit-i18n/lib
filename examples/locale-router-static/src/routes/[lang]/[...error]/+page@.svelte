<script>
  import Error from '../../+error.svelte';

  export let data;
</script>

<Error status={data.status} />