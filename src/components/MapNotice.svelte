<script lang="ts">
  import { t } from '../lib/i18n.svelte';

  /** shown instead of the map when the browser cannot render it (e.g. no WebGL) */
  let { hint = '' }: { hint?: string } = $props();
</script>

<div class="notice" role="status">
  <p><b>{t('map.unavailable')}</b></p>
  <p>{t('map.unavailableText')}{hint ? ' ' + hint : ''}</p>
</div>

<style>
  .notice { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; gap: 4px; padding: 24px; color: var(--text-2); background: radial-gradient(ellipse at 60% 45%, #0f1830, var(--bg) 70%); }
  .notice p { margin: 0; max-width: 32em; }
  .notice b { color: var(--text); }
</style>
