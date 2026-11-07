<script lang="ts">
  import { onMount } from 'svelte';
  import { t, countryName, formatNumber } from '../lib/i18n.svelte';
  import { db } from '../lib/store.svelte';
  import { route, go, href } from '../lib/router.svelte';
  import { matches, queryToFilters, filtersToQuery, nearest, countBy, EMPTY_FILTERS } from '../lib/data';
  import type { MapHandle } from '../lib/map';
  import { prefersReducedMotion, isNarrow } from '../lib/motion';
  import { GROUP_COLOR, KIND_GROUP, KINDS, FACILITIES, THEMES, NATIONS, CONTINENTS, flag } from '../lib/taxonomy';
  import { settings, setSatellite } from '../lib/settings.svelte';
  import type { Filters } from '../lib/types';
  import Legend from '../components/Legend.svelte';
  import BaseProfile from '../components/BaseProfile.svelte';

  let mapEl: HTMLDivElement;
  let handle: MapHandle | null = $state(null);
  let tip = $state<{ name: string; x: number; y: number } | null>(null);
  let filterOpen = $state(false);
  let sheetOpen = $state(false);
  let showLegend = $state(!isNarrow());
  let embedOpen = $state(false);
  let embedCopied = $state(false);
  const embedCode = $derived(
    `<iframe src="${location.href.split('#')[0]}#/embed${route.query ? '?' + route.query : ''}" width="100%" height="480" style="border:0;border-radius:12px" loading="lazy" title="VisualBases" allow="fullscreen"></iframe>`,
  );
  async function copyEmbed() {
    try { await navigator.clipboard.writeText(embedCode); embedCopied = true; setTimeout(() => (embedCopied = false), 2000); } catch { /* ignore */ }
  }

  const filters = $derived(queryToFilters(route.query));
  const selectedId = $derived(route.path.startsWith('/base/') ? decodeURIComponent(route.path.slice(6)) : null);
  const selected = $derived(selectedId ? db.byId.get(selectedId) ?? null : null);
  const results = $derived(db.bases.filter((b) => matches(b, filters, countryName)));
  const activeCount = $derived(filters.kinds.length + filters.nations.length + filters.facilities.length + filters.themes.length + filters.continents.length);
  const nearby = $derived(selected ? nearest(db.bases.filter((b) => b.id !== selected.id), selected.lat, selected.lon, 6, true) : []);

  const facet = (key: (b: (typeof db.bases)[number]) => string | string[] | null | undefined) => new Map(countBy(db.bases, key));
  const kindCounts = $derived(facet((b) => b.kind));
  const nationCounts = $derived(facet((b) => b.nations));
  const facCounts = $derived(facet((b) => b.facilities));
  const themeCounts = $derived(facet((b) => b.themes));
  const contCounts = $derived(facet((b) => b.continent));

  function update(patch: Partial<Filters>) {
    const next = { ...filters, ...patch };
    go('/atlas', filtersToQuery(next), true);
  }
  function toggle<K extends 'kinds' | 'nations' | 'facilities' | 'themes' | 'continents'>(key: K, value: Filters[K][number]) {
    const list = filters[key] as string[];
    update({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] } as Partial<Filters>);
  }
  let searchTimer: ReturnType<typeof setTimeout>;
  function onSearch(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => update({ q: v }), 150);
  }

  const openBase = (id: string) => go(`/base/${encodeURIComponent(id)}`, route.query);
  const closeBase = () => go('/atlas', route.query);

  // data → map
  $effect(() => {
    if (handle && db.status === 'ready') handle.setBases(db.bases);
  });
  // filters → dim non-matching dots
  $effect(() => {
    if (!handle || db.status !== 'ready') return;
    handle.highlight(activeCount || filters.q ? new Set(results.map((b) => b.id)) : null);
  });
  // selection → camera
  $effect(() => {
    const h = handle;
    if (!h) return;
    if (selected) {
      h.focus([selected.id]);
      sheetOpen = true;
      const narrow = innerWidth < 820;
      h.map.flyTo({
        center: [selected.lon, selected.lat],
        // without satellite imagery a close zoom shows nothing – keep regional context instead
        zoom: settings.satellite ? Math.max(selected.group ? 10 : 12, Math.min(selected.zoom, 14)) : selected.group ? 6.5 : 7,
        padding: narrow ? { bottom: innerHeight * 0.55, top: 40, left: 0, right: 0 } : { left: 420, top: 0, right: 0, bottom: 0 },
        duration: prefersReducedMotion() ? 0 : 2400,
        essential: true,
      });
    } else {
      h.focus([]);
    }
  });
  $effect(() => {
    handle?.setSatellite(settings.satellite);
  });

  function fitResults() {
    if (!handle || !results.length) return;
    if (results.length === db.bases.length) return resetView();
    let [w, s, e, n] = [180, 90, -180, -90];
    for (const b of results) { w = Math.min(w, b.lon); e = Math.max(e, b.lon); s = Math.min(s, b.lat); n = Math.max(n, b.lat); }
    const narrow = innerWidth < 820;
    handle.map.fitBounds([[w, s], [e, n]], { padding: narrow ? { top: 80, bottom: 200, left: 30, right: 30 } : { top: 80, bottom: 80, left: 460, right: 80 }, maxZoom: 9, duration: prefersReducedMotion() ? 0 : 1600 });
  }
  function resetView() {
    handle?.map.flyTo({ center: [10, 30], zoom: innerWidth < 820 ? 0.9 : 1.6, duration: prefersReducedMotion() ? 0 : 1600 });
  }

  onMount(() => {
    let destroyed = false;
    import('../lib/map').then(({ createMap }) => createMap(mapEl, {
      detail: '50m',
      center: [10, 30],
      zoom: innerWidth < 820 ? 0.9 : 1.6,
      onSelect: openBase,
      onHover: (b, x, y) => (tip = b ? { name: b.name, x, y } : null),
    })).then((h) => {
      if (destroyed) return h.destroy();
      handle = h;
    });
    return () => {
      destroyed = true;
      handle?.destroy();
    };
  });

  const groupOf = (k: keyof typeof KIND_GROUP) => KIND_GROUP[k];
</script>

<div class="atlas">
  <div class="map" bind:this={mapEl} role="application" aria-label={t('nav.atlas')}></div>
  {#if tip}
    <div class="tip" style:left="{tip.x}px" style:top="{tip.y}px">{tip.name}</div>
  {/if}

  <div class="map-tools">
    <button class="btn btn-sm" aria-pressed={settings.satellite} title={t('map.satelliteHint')} onclick={() => setSatellite(!settings.satellite)}>
      🛰 {t('map.satellite')}
    </button>
    <button class="btn btn-sm" onclick={resetView}>🌍 {t('map.reset')}</button>
    <button class="btn btn-sm legend-btn" aria-expanded={showLegend} onclick={() => (showLegend = !showLegend)}>{t('map.legend')}</button>
  </div>
  {#if selected && !settings.satellite}
    <button class="sat-cta" onclick={() => setSatellite(true)} title={t('map.satelliteHint')}>🛰 {t('map.satellite')}: {selected.name}</button>
  {/if}
  {#if showLegend}
    <div class="legend-pos"><Legend /></div>
  {/if}

  <aside class="panel" class:open={sheetOpen} aria-label={selected ? selected.name : t('filters.title')}>
    <button class="grabber" aria-label={sheetOpen ? t('common.less') : t('common.more')} onclick={() => (sheetOpen = !sheetOpen)}><span></span></button>

    {#if selectedId}
      {#if selected}
        <BaseProfile base={selected} {nearby} onClose={closeBase} onSelect={openBase} />
      {:else if db.status === 'ready'}
        <div class="pad"><button class="btn btn-sm" onclick={closeBase}>← {t('base.back')}</button><p class="muted">{t('base.notFound')}</p></div>
      {:else}
        <div class="pad muted">{t('common.loading')}</div>
      {/if}
    {:else}
      <div class="search-row">
        <label class="search">
          <span class="sr-only">{t('filters.search')}</span>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" /><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
          <input type="search" placeholder={t('filters.search')} value={filters.q} oninput={onSearch} onfocus={() => (sheetOpen = true)} />
        </label>
        <button class="btn btn-sm filter-btn" aria-expanded={filterOpen} onclick={() => { filterOpen = !filterOpen; sheetOpen = true; }}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
          {t('filters.title')}{#if activeCount}<span class="badge">{activeCount}</span>{/if}
        </button>
      </div>

      <div class="meta-row">
        <strong>{t('filters.results', { n: formatNumber(results.length) })}</strong>
        <span class="row-actions">
          <button class="linkish" aria-expanded={embedOpen} onclick={() => (embedOpen = !embedOpen)}>&lt;/&gt; {t('embed.button')}</button>
          {#if activeCount || filters.q}
            <button class="linkish" onclick={fitResults}>⤢ {t('filters.map')}</button>
            <button class="linkish" onclick={() => go('/atlas', '', true)}>{t('filters.reset')}</button>
          {/if}
        </span>
      </div>

      {#if embedOpen}
        <div class="embed-box">
          <p>{t('embed.text')}</p>
          <textarea readonly rows="4" onfocus={(e) => (e.target as HTMLTextAreaElement).select()}>{embedCode}</textarea>
          <button class="btn btn-sm" onclick={copyEmbed}>{embedCopied ? '✓ ' + t('embed.copied') : t('embed.copy')}</button>
        </div>
      {/if}

      {#if filterOpen}
        <div class="filters">
          {#snippet group(title: string, items: readonly string[], key: 'kinds' | 'nations' | 'facilities' | 'themes' | 'continents', label: (v: string) => string, counts: Map<string, number>, dot?: (v: string) => string)}
            <fieldset>
              <legend>{title}</legend>
              <div class="chips">
                {#each items.filter((v) => counts.get(v)) as v}
                  <button class="chip" aria-pressed={(filters[key] as string[]).includes(v)} onclick={() => toggle(key, v as never)}>
                    {#if dot}<span class="dot" class:ring={dot(v) === 'hotspot'} style:background={GROUP_COLOR[dot(v) as keyof typeof GROUP_COLOR]}></span>{/if}
                    {label(v)} <span class="count">{counts.get(v)}</span>
                  </button>
                {/each}
              </div>
            </fieldset>
          {/snippet}
          {@render group(t('filters.kind'), KINDS, 'kinds', (v) => t(`kind.${v}` as never), kindCounts, (v) => groupOf(v as never))}
          {@render group(t('filters.nation'), NATIONS, 'nations', (v) => `${flag(v)} ${countryName(v)}`, nationCounts)}
          {@render group(t('filters.theme'), THEMES, 'themes', (v) => t(`theme.${v}` as never), themeCounts)}
          {@render group(t('filters.facility'), FACILITIES, 'facilities', (v) => t(`fac.${v}` as never), facCounts)}
          {@render group(t('filters.continent'), CONTINENTS, 'continents', (v) => t(`cont.${v}` as never), contCounts)}
          <button class="btn btn-primary btn-sm done" onclick={() => { filterOpen = false; fitResults(); }}>{t('filters.show')} ({results.length})</button>
        </div>
      {/if}

      <ul class="results" aria-label={t('filters.list')}>
        {#each results.slice(0, 400) as b (b.id)}
          <li>
            <a href={href(`/base/${encodeURIComponent(b.id)}`, route.query)} onmouseenter={() => handle?.focus([b.id])} onmouseleave={() => handle?.focus([])}>
              {#if b.images?.length}
                <img class="r-thumb" src={b.images[0].thumb} alt="" loading="lazy" decoding="async" />
              {:else}
                <span class="r-thumb ph"><span class="dot" class:ring={KIND_GROUP[b.kind] === 'hotspot'} style:background={GROUP_COLOR[KIND_GROUP[b.kind]]}></span></span>
              {/if}
              <span class="r-main">
                <span class="r-name">{b.name}</span>
                <span class="r-sub">{#if b.country}{flag(b.country)} {countryName(b.country)} · {/if}{t(`kind.${b.kind}`)}</span>
              </span>
              {#if b.nations.length}<span class="r-nat" title={b.nations.map(countryName).join(', ')}>{b.nations.map(flag).join('')}</span>{/if}
            </a>
          </li>
        {:else}
          <li class="empty muted">{db.status === 'ready' ? '—' : t('common.loading')}</li>
        {/each}
      </ul>
    {/if}
  </aside>
</div>

<style>
  .atlas { position: relative; height: 100dvh; padding-top: var(--header-h); }
  .map { position: absolute; inset: var(--header-h) 0 0 0; background: radial-gradient(ellipse at 60% 45%, #0f1830, var(--bg) 70%); }
  .tip { position: absolute; z-index: 5; transform: translate(-50%, calc(-100% + var(--header-h) - 12px)); pointer-events: none;
    background: var(--text); color: var(--bg); font-size: 0.82rem; font-weight: 600; padding: 4px 9px; border-radius: 6px; white-space: nowrap; }

  .map-tools { position: absolute; z-index: 4; top: calc(var(--header-h) + 12px); right: 56px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
  .map-tools .btn { background: rgb(18 26 43 / 0.9); backdrop-filter: blur(8px); }
  .map-tools .btn[aria-pressed='true'] { background: var(--text); color: var(--bg); }
  .legend-pos { position: absolute; z-index: 3; right: 12px; bottom: 34px; }
  .sat-cta { position: absolute; z-index: 4; left: calc(50% + 210px); bottom: 40px; transform: translateX(-50%); max-width: min(420px, 90vw);
    padding: 10px 18px; border-radius: 999px; border: 1px solid var(--line); background: rgb(18 26 43 / 0.92); backdrop-filter: blur(8px);
    font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; box-shadow: var(--shadow); }
  .sat-cta:hover { border-color: var(--c-shared); }

  .panel {
    position: absolute; z-index: 6; top: calc(var(--header-h) + 12px); left: 12px; bottom: 12px; width: 400px;
    display: flex; flex-direction: column; overflow: hidden;
    background: rgb(13 18 32 / 0.94); backdrop-filter: blur(14px); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow);
  }
  .grabber { display: none; }
  .pad { padding: 16px; }
  .muted { color: var(--muted); }

  .search-row { display: flex; gap: 8px; padding: 14px 14px 8px; }
  .search { flex: 1; display: flex; align-items: center; gap: 8px; padding: 0 12px; min-height: 40px; border-radius: 999px; background: var(--bg-2); border: 1px solid var(--line); color: var(--muted); }
  .search:focus-within { border-color: var(--focus); }
  .search input { flex: 1; min-width: 0; border: 0; background: none; outline: none; color: var(--text); }
  .filter-btn { min-height: 40px; }
  .badge { background: var(--accent-strong); color: #fff; border-radius: 999px; font-size: 0.72rem; padding: 0 6px; line-height: 1.5; }

  .meta-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 16px 10px; font-size: 0.9rem; border-bottom: 1px solid var(--line); }
  .row-actions { display: flex; gap: 12px; }
  .linkish { background: none; border: 0; padding: 0; color: var(--text-2); text-decoration: underline; text-underline-offset: 3px; font-size: 0.85rem; }

  .embed-box { padding: 10px 16px 14px; border-bottom: 1px solid var(--line); font-size: 0.85rem; color: var(--text-2); }
  .embed-box p { margin-bottom: 8px; }
  .embed-box textarea { width: 100%; resize: none; font: 0.75rem/1.4 ui-monospace, monospace; background: var(--bg-2); color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 8px; margin-bottom: 8px; }
  .filters { padding: 8px 16px 16px; border-bottom: 1px solid var(--line); overflow-y: auto; max-height: 60%; flex: none; }
  fieldset { border: 0; margin: 0 0 12px; padding: 0; }
  legend { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); font-weight: 700; margin-bottom: 8px; padding: 0; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .done { width: 100%; margin-top: 4px; }

  .results { list-style: none; margin: 0; padding: 6px; overflow-y: auto; flex: 1; overscroll-behavior: contain; }
  .results a { display: flex; align-items: center; gap: 12px; padding: 9px 10px; border-radius: var(--radius-s); text-decoration: none; }
  .results a:hover, .results a:focus-visible { background: var(--surface-2); }
  .r-thumb { width: 44px; height: 44px; flex: none; border-radius: 8px; object-fit: cover; background: var(--bg-2); border: 1px solid var(--line); }
  .r-thumb.ph { display: grid; place-items: center; }
  .r-main { display: flex; flex-direction: column; min-width: 0; flex: 1; }
  .r-name { font-weight: 600; font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .r-sub { color: var(--muted); font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .r-nat { font-size: 0.9rem; flex: none; }
  .empty { padding: 20px; text-align: center; }

  @media (max-width: 820px) {
    .panel {
      top: auto; left: 0; right: 0; bottom: 0; width: auto; height: 172px; border-radius: 18px 18px 0 0; border-bottom: 0;
      transition: height 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .panel.open { height: 72dvh; }
    .grabber { display: flex; justify-content: center; align-items: center; height: 22px; width: 100%; background: none; border: 0; flex: none; padding: 0; }
    .grabber span { width: 42px; height: 5px; border-radius: 3px; background: var(--line); }
    .search-row { padding-top: 2px; }
    .map-tools { right: 52px; top: calc(var(--header-h) + 10px); }
    .map-tools .btn { min-height: 34px; padding: 0 10px; font-size: 0.8rem; }
    .legend-pos { bottom: auto; top: calc(var(--header-h) + 56px); right: 8px; }
    .sat-cta { left: 50%; bottom: auto; top: calc(var(--header-h) + 56px); }
  }
</style>
