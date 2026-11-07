<script lang="ts">
  import { t, i18n } from '../lib/i18n.svelte';
  import { GROUP_COLOR, LEGEND_GROUPS } from '../lib/taxonomy';

  let { compact = false }: { compact?: boolean } = $props();
</script>

<ul class="legend" class:compact aria-label={t('map.legend')}>
  {#each LEGEND_GROUPS as g}
    <li>
      <span class="dot" class:ring={g.id === 'aggregate'} style:background={GROUP_COLOR[g.id]}></span>
      {g.label[i18n.lang]}
    </li>
  {/each}
</ul>

<style>
  .legend { list-style: none; margin: 0; padding: 10px 14px; display: grid; gap: 6px; font-size: 0.82rem; color: var(--text-2);
    background: rgb(13 18 32 / 0.85); border: 1px solid var(--line); border-radius: var(--radius-s); backdrop-filter: blur(8px); }
  .legend li { display: flex; align-items: center; gap: 8px; }
  .compact { font-size: 0.75rem; padding: 8px 10px; gap: 4px; }
</style>
