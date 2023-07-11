<script context="module">
  export { default as init } from './translations';
</script>

<script>
  export let props;

  const { translations, locale, locales, t } = props;
</script>

<div>
  {JSON.stringify($translations)}
  <p>{$t('common.info')}</p>

  <select bind:value="{$locale}">
    {#each $locales as locale}
    <option value="{locale}">{$t(`lang.${locale}`)}</option>
    {/each}
  </select>
</div>

<style>
  div {
    border: 2px solid red;
    display: inline-block;
    padding: 20px;
  }
</style>