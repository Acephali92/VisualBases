<script lang="ts">
  import { onMount } from 'svelte';
  import { t, countryName } from '../lib/i18n.svelte';
  import { db } from '../lib/store.svelte';
  import { route } from '../lib/router.svelte';
  import { matches, queryToFilters } from '../lib/data';
  import type { MapHandle } from '../lib/map';
  import Legend from '../components/Legend.svelte';
  import MapNotice from '../components/MapNotice.svelte';

  /** chrome-free map for iframes on partner sites: #/embed?themes=drones */
  let el: HTMLDivElement;
  let handle: MapHandle | null = $state(null);
  let mapFailed = $state(false);
  let tip = $state<{ name: string; x: number; y: number } | null>(null);
  const filters = $derived(queryToFilters(route.query));
  const shown = $derived(db.bases.filter((b) => matches(b, filters, countryName)));
  const site = () => location.href.split('#')[0];

  $effect(() => {
    if (!handle || db.status !== 'ready') return;
    handle.setBases(shown);
    if (shown.length && shown.length < db.bases.length) {
      let [w, s, e, n] = [180, 90, -180, -90];
      for (const b of shown) { w = Math.min(w, b.lon); e = Math.max(e, b.lon); s = Math.min(s, b.lat); n = Math.max(n, b.lat); }
      handle.map.fitBounds([[w, s], [e, n]], { padding: 40, maxZoom: 8, duration: 0 });
    }
  });

  onMount(() => {
    let dead = false;
    import('../lib/map').then(({ createMap }) =>
      createMap(el, {
        center: [10, 30],
        zoom: 1.2,
        onSelect: (id) => open(`${site()}#/base/${id}`, '_blank', 'noopener'),
        onHover: (b, x, y) => (tip = b ? { name: b.name, x, y } : null),
      }),
    ).then((h) => { if (dead) h.destroy(); else handle = h; }).catch((e) => { console.warn(e); mapFailed = true; });
    return () => { dead = true; handle?.destroy(); };
  });
</script>

<div class="embed">
  <div class="map" bind:this={el}>{#if mapFailed}<MapNotice />{/if}</div>
  {#if tip}<div class="tip" style:left="{tip.x}px" style:top="{tip.y}px">{tip.name}</div>{/if}
  <a class="badge" href="{site()}#/atlas{route.query ? '?' + route.query : ''}" target="_blank" rel="noopener">
    Visual<b>Bases</b> · {t('filters.results', { n: shown.length })} ↗
  </a>
  <div class="leg"><Legend compact /></div>
</div>

<style>
  .embed { position: fixed; inset: 0; background: var(--bg); }
  .map { position: absolute; inset: 0; }
  .badge { position: absolute; left: 10px; top: 10px; z-index: 3; padding: 6px 12px; border-radius: 999px; background: rgb(13 18 32 / 0.9); border: 1px solid var(--line); text-decoration: none; font-size: 0.85rem; }
  .badge b { color: var(--accent); }
  .leg { position: absolute; left: 10px; bottom: 28px; z-index: 3; }
  .tip { position: absolute; z-index: 5; transform: translate(-50%, calc(-100% - 12px)); pointer-events: none; background: var(--text); color: var(--bg); font-size: 0.8rem; font-weight: 600; padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
</style>
