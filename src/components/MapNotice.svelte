<script lang="ts">
  import { t } from '../lib/i18n.svelte';
  import type { MapFailure } from '../lib/update';

  /**
   * shown instead of the map: 'webgl' when the browser cannot render it, 'load' when the map files
   * could not be loaded (usually an outdated cached version right after an update)
   */
  let { kind = 'webgl', hint = '' }: { kind?: MapFailure; hint?: string } = $props();
</script>

<div class="notice" role="status">
  {#if kind === 'load'}
    <p><b>{t('map.loadFailed')}</b></p>
    <p>{t('map.loadFailedText')}{hint ? ' ' + hint : ''}</p>
    <p><button class="btn btn-sm" onclick={() => location.reload()}>↻ {t('map.reload')}</button></p>
  {:else}
    <p><b>{t('map.unavailable')}</b></p>
    <p>{t('map.unavailableText')}{hint ? ' ' + hint : ''}</p>
  {/if}
</div>

<style>
  .notice { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; gap: 4px; padding: 24px; color: var(--text-2); background: radial-gradient(ellipse at 60% 45%, #0f1830, var(--bg) 70%); }
  .notice p { margin: 0; max-width: 32em; }
  .notice b { color: var(--text); }
  .notice button { margin-top: 10px; }
</style>
