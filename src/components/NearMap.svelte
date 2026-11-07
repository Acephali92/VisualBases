<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../lib/i18n.svelte';
  import { go } from '../lib/router.svelte';
  import type { MapHandle } from '../lib/map';
  import type { Origin, RankedSite } from '../lib/proximity';
  import MapNotice from './MapNotice.svelte';

  /**
   * Display only: shows the starting point and the sites that were already ranked from the complete
   * dataset. The map never feeds anything back into the calculation.
   */
  let { origin, sites }: { origin: Origin; sites: RankedSite[] } = $props();

  let el: HTMLDivElement;
  let handle = $state<MapHandle | null>(null);
  let failed = $state(false);
  let marker: { remove(): void; setLngLat(ll: [number, number]): unknown } | null = null;
  let MarkerCls: (new (o: { element: HTMLElement }) => { setLngLat(ll: [number, number]): { addTo(m: unknown): unknown }; remove(): void }) | null = null;

  onMount(() => {
    let destroyed = false;
    Promise.all([import('../lib/map'), import('maplibre-gl')])
      .then(async ([{ createMap }, ml]) => {
        MarkerCls = ml.Marker as unknown as typeof MarkerCls;
        const h = await createMap(el, { detail: '110m', interactive: true, onSelect: (id) => go(`/base/${id}`) });
        if (destroyed) return h.destroy();
        h.map.once('idle', () => h.upgradeDetail());
        handle = h;
      })
      .catch(() => { failed = true; });
    return () => { destroyed = true; marker?.remove(); handle?.destroy(); };
  });

  $effect(() => {
    const h = handle;
    if (!h || !MarkerCls) return;
    h.setBases(sites.map((s) => s.base));
    marker?.remove();
    const dot = document.createElement('div');
    dot.className = 'origin-marker';
    dot.setAttribute('aria-hidden', 'true');
    const m = new MarkerCls({ element: dot }).setLngLat([origin.lon, origin.lat]);
    m.addTo(h.map);
    marker = m as unknown as typeof marker;
    const pts = [[origin.lon, origin.lat], ...sites.map((s) => [s.base.lon, s.base.lat])];
    const lons = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    h.map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: 40, maxZoom: 9, duration: 0 });
  });
</script>

<figure class="near-map card" aria-label={t('near.mapLabel')}>
  <div class="canvas" bind:this={el}></div>
  {#if failed}<MapNotice />{/if}
</figure>

<style>
  .near-map { position: relative; height: 340px; margin: 24px 0 0; overflow: hidden; padding: 0; }
  .canvas { position: absolute; inset: 0; }
  :global(.origin-marker) { width: 16px; height: 16px; border-radius: 50%; background: var(--focus); border: 3px solid #fff; box-shadow: 0 0 0 4px rgb(156 194 255 / 0.35); }
</style>
