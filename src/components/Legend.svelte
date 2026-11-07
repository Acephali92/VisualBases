<script lang="ts">
  import { t } from '../lib/i18n.svelte';
  import { GROUP_COLOR, type ColorGroup } from '../lib/taxonomy';

  let { compact = false }: { compact?: boolean } = $props();
  const groups: ColorGroup[] = ['foreign', 'shared', 'other', 'closed', 'hotspot'];
</script>

<ul class="legend" class:compact aria-label={t('map.legend')}>
  {#each groups as g}
    <li>
      <span class="dot" class:ring={g === 'hotspot'} style:background={GROUP_COLOR[g]}></span>
      {t(`group.${g}`)}
    </li>
  {/each}
</ul>

<style>
  .legend { list-style: none; margin: 0; padding: 10px 14px; display: grid; gap: 6px; font-size: 0.82rem; color: var(--text-2);
    background: rgb(13 18 32 / 0.85); border: 1px solid var(--line); border-radius: var(--radius-s); backdrop-filter: blur(8px); }
  .legend li { display: flex; align-items: center; gap: 8px; }
  .compact { font-size: 0.75rem; padding: 8px 10px; gap: 4px; }
</style>
