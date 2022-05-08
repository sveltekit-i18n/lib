<script context="module">
  import Component, { init } from '$lib/component/index.svelte'; 

  export const load = async () => {
    const {loading: loadingEn, ...restEn} = init('en');
    const {loading: loadingDe, ...restDe} = init('de');
    await Promise.all([loadingEn.toPromise(), loadingDe.toPromise()]);

    return {props: { props1: {loading: loadingEn, ...restEn}, props2: {loading: loadingDe, ...restDe} }};
  }
</script>

<script>
  import { t } from '$lib/translations'; 
  export let props1, props2;

  const link = 'https://kit.svelte.dev';

</script>

<h1>{$t('home.title')}</h1>
<p>{@html $t('home.text', { link })}</p>

<Component {...props1}/>
<Component {...props2} />