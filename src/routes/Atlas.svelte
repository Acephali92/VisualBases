<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { t, tl, ti, countryName, formatNumber } from '../lib/i18n.svelte';
  import { db } from '../lib/store.svelte';
  import { route, go, href } from '../lib/router.svelte';
  import { matches, queryToFilters, filtersToQuery, nearest, countBy, facetCounts, facetValues, foreignNations, isAggregate, FILTER_KEYS, FORM_UNSPECIFIED, type FilterKey } from '../lib/data';
  import type { MapHandle } from '../lib/map';
  import { prefersReducedMotion, isNarrow } from '../lib/motion';
  import { GROUP_COLOR, SITE_TYPES, STATUSES, PRESENCE_FORMS, SOURCE_LEVELS, FEATURES, FEATURE_KINDS, THEMES, ACTIVITY_GROUPS, ORGANISATIONS, CONTINENTS, SITE_TYPE, colorGroup, flag, ids, type Dimension } from '../lib/taxonomy';
  import { settings, setSatellite } from '../lib/settings.svelte';
  import type { Filters } from '../lib/types';
  import Legend from '../components/Legend.svelte';
  import BaseProfile from '../components/BaseProfile.svelte';
  import MapNotice from '../components/MapNotice.svelte';
  import { handleMapError, type MapFailure } from '../lib/update';

  let mapEl: HTMLDivElement;
  let handle: MapHandle | null = $state(null);
  let mapFailed = $state<MapFailure | null>(null);
  let tip = $state<{ name: string; x: number; y: number } | null>(null);
  let filterOpen = $state(false);
  let sheetOpen = $state(false);
  let showLegend = $state(!isNarrow());
  let embedOpen = $state(false);
  let inView = $state(false);
  let view = $state<{ bounds: [number, number, number, number]; zoom: number } | null>(null);
  /** bounds of the visible map; at very low zoom (whole globe) every base counts as visible */
  const visible = (b: { lat: number; lon: number }) => {
    if (!view || view.zoom < 2.2) return true;
    const [w, s, e, n] = view.bounds;
    const lonOk = w <= e ? b.lon >= w && b.lon <= e : b.lon >= w || b.lon <= e;
    return lonOk && b.lat >= s && b.lat <= n;
  };
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
  const matching = $derived(db.bases.filter((b) => matches(b, filters, countryName)));
  const results = $derived(inView ? matching.filter(visible) : matching);
  const activeCount = $derived(FILTER_KEYS.reduce((n, k) => n + filters[k].length, 0));
  /** summary when exactly one host country is selected */
  const country = $derived.by(() => {
    if (filters.countries.length !== 1) return null;
    const cc = filters.countries[0];
    const all = db.bases.filter((b) => facetValues(b, 'countries').includes(cc));
    const sites = all.filter((b) => !isAggregate(b));
    return {
      cc,
      sites: sites.length,
      nations: countBy(sites, foreignNations),
      kinds: countBy(sites, (b) => b.siteType),
      closed: sites.filter((b) => b.status === 'closed').length,
      resistance: all.filter((b) => b.themes.includes('resistance')).length,
      images: all.flatMap((b) => (b.images ?? []).filter((i) => i.type === 'photo' || i.type === 'satellite').slice(0, 1).map((i) => ({ i, b }))).slice(0, 6),
    };
  });
  const countryOptions = $derived(countBy(db.bases.filter((b) => !isAggregate(b)), (b) => facetValues(b, 'countries')));
  const nearby = $derived(selected ? nearest(db.bases.filter((b) => b.id !== selected.id), selected.lat, selected.lon, 6, true) : []);

  /** counts per chip: records matching all other active filters (so a count is what a click adds) */
  const counts = $derived(Object.fromEntries(FILTER_KEYS.map((k) => [k, facetCounts(db.bases, filters, k, countryName)])) as Record<FilterKey, Map<string, number>>);
  /** stationing nations present in the data, most frequent first (not a fixed list) */
  const nationOptions = $derived(countBy(db.bases, foreignNations).map(([n]) => n));
  type Group = { title: string; key: FilterKey; dim?: Dimension; items: string[]; label?: (v: string) => string; dot?: boolean; sub?: { title: string; items: string[] }[]; hint?: string };
  const groups = $derived<Group[]>([
    { title: t('filters.kind'), key: 'kinds', dim: 'siteType', items: ids(SITE_TYPES), dot: true, hint: t('filters.context') },
    { title: t('filters.status'), key: 'status', dim: 'status', items: ids(STATUSES) },
    { title: t('filters.form'), key: 'forms', dim: 'presenceForm', items: [...ids(PRESENCE_FORMS), FORM_UNSPECIFIED], label: (v) => (v === FORM_UNSPECIFIED ? t('filters.formUnspecified') : tl('presenceForm', v)), hint: t('filters.formHint') },
    { title: t('filters.evidence'), key: 'evidence', dim: 'sourceLevel', items: ids(SOURCE_LEVELS), hint: t('filters.evidenceHint') },
    { title: t('filters.nation'), key: 'nations', items: nationOptions, label: (v) => `${flag(v)} ${countryName(v)}` },
    { title: t('filters.theme'), key: 'themes', dim: 'theme', items: ids(THEMES) },
    { title: t('filters.facility'), key: 'facilities', dim: 'feature', items: [], sub: FEATURE_KINDS.map((k) => ({ title: tl('featureKind', k.id), items: FEATURES.filter((f) => f.kind === k.id).map((f) => f.id) })) },
    { title: t('filters.activity'), key: 'activities', items: [...ids(ACTIVITY_GROUPS), ...ids(ORGANISATIONS)], label: (v) => tl(ACTIVITY_GROUPS.some((a) => a.id === v) ? 'activityGroup' : 'organisation', v) },
    { title: t('filters.continent'), key: 'continents', dim: 'continent', items: ids(CONTINENTS) },
  ]);
  const chipLabel = (g: Group, v: string) => (g.label ? g.label(v) : tl(g.dim!, v));
  const visibleItems = (g: Group, items: string[]) => items.filter((v) => counts[g.key].get(v) || (filters[g.key] as string[]).includes(v));

  function update(patch: Partial<Filters>) {
    const next = { ...filters, ...patch };
    go('/atlas', filtersToQuery(next), true);
  }
  function toggle(key: FilterKey, value: string) {
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
    handle.highlight(activeCount || filters.q ? new Set(matching.map((b) => b.id)) : null);
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
        zoom: settings.satellite ? Math.max(isAggregate(selected) ? 10 : 12, Math.min(selected.zoom, 14)) : isAggregate(selected) ? 6.5 : 7,
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
  // zoom to the selected countries / continents when they change (also when arriving via a link)
  $effect(() => {
    const key = [...filters.countries, ...filters.continents].join(',');
    if (!handle || db.status !== 'ready' || !key || selectedId) return;
    untrack(() => fitResults());
  });

  function fitResults() {
    if (!handle || !matching.length) return;
    if (matching.length === db.bases.length) return resetView();
    let [w, s, e, n] = [180, 90, -180, -90];
    for (const b of matching) { w = Math.min(w, b.lon); e = Math.max(e, b.lon); s = Math.min(s, b.lat); n = Math.max(n, b.lat); }
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
      onMove: (bounds, zoom) => (view = { bounds, zoom }),
    })).then((h) => {
      if (destroyed) return h.destroy();
      handle = h;
    }).catch((e) => {
      mapFailed = handleMapError(e);
      if (mapFailed) sheetOpen = true;
    });
    return () => {
      destroyed = true;
      handle?.destroy();
    };
  });

</script>

<div class="atlas">
  <div class="map" bind:this={mapEl} role="application" aria-label={t('nav.atlas')}>
    {#if mapFailed}<MapNotice kind={mapFailed} hint={t('map.listHint')} />{/if}
  </div>
  {#if tip}
    <div class="tip" style:left="{tip.x}px" style:top="{tip.y}px">{tip.name}</div>
  {/if}

  <div class="map-tools" hidden={!!mapFailed}>
    <button class="btn btn-sm" aria-pressed={settings.satellite} title={t('map.satelliteHint')} onclick={() => setSatellite(!settings.satellite)}>
      🛰 {t('map.satellite')}
    </button>
    <button class="btn btn-sm" onclick={resetView}>🌍 {t('map.reset')}</button>
    <button class="btn btn-sm legend-btn" aria-expanded={showLegend} onclick={() => (showLegend = !showLegend)}>{t('map.legend')}</button>
  </div>
  {#if selected && !settings.satellite}
    <button class="sat-cta" onclick={() => setSatellite(true)} title={t('map.satelliteHint')}>🛰 {t('map.satellite')}: {selected.name}</button>
  {/if}
  {#if showLegend && !mapFailed}
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
          <button class="linkish" aria-pressed={inView} onclick={() => (inView = !inView)}>{inView ? '☑' : '☐'} {t('filters.inView')}</button>
          <button class="linkish" aria-expanded={embedOpen} onclick={() => (embedOpen = !embedOpen)}>&lt;/&gt; {t('embed.button')}</button>
          {#if activeCount || filters.q}
            <button class="linkish" onclick={fitResults}>⤢ {t('filters.map')}</button>
            <button class="linkish" onclick={() => go('/atlas', '', true)}>{t('filters.reset')}</button>
          {/if}
        </span>
      </div>

      {#if country}
        <section class="country">
          <h2>{flag(country.cc)} {countryName(country.cc)} <button class="linkish" onclick={() => update({ countries: [] })} aria-label={t('filters.reset')}>✕</button></h2>
          <p class="cstats"><b>{country.sites}</b> {t('stat.locations')}{#if country.resistance} · <b>{country.resistance}</b> {t('stat.resistance')}{/if}</p>
          <p class="cline">{t('base.nations')}: {country.nations.map(([n, c]) => `${flag(n)} ${countryName(n)} (${c})`).join(' · ') || '–'}</p>
          <p class="cline">{country.kinds.map(([k, c]) => `${tl('siteType', k)} (${c})`).join(' · ')}{#if country.closed} · {tl('status', 'closed')}: {country.closed}{/if}</p>
          {#if country.images.length}
            <div class="cimgs">
              {#each country.images as { i, b } (b.id)}
                <a href={href(`/base/${b.id}`, route.query)} title={b.name}><img src={i.thumb} alt={b.name} loading="lazy" /></a>
              {/each}
            </div>
          {/if}
        </section>
      {/if}

      {#if embedOpen}
        <div class="embed-box">
          <p>{t('embed.text')}</p>
          <textarea readonly rows="4" onfocus={(e) => (e.target as HTMLTextAreaElement).select()}>{embedCode}</textarea>
          <button class="btn btn-sm" onclick={copyEmbed}>{embedCopied ? '✓ ' + t('embed.copied') : t('embed.copy')}</button>
        </div>
      {/if}

      {#if filterOpen}
        <div class="filters">
          {#snippet chips(g: Group, items: string[])}
            <div class="chips">
              {#each visibleItems(g, items) as v (v)}
                <button class="chip" aria-pressed={(filters[g.key] as string[]).includes(v)} onclick={() => toggle(g.key, v)} title={g.dim ? ti(g.dim, v) : ''}>
                  {#if g.dot}<span class="dot" class:ring={SITE_TYPE[v as keyof typeof SITE_TYPE]?.color === 'aggregate'} style:background={GROUP_COLOR[SITE_TYPE[v as keyof typeof SITE_TYPE]?.color ?? 'other']}></span>{/if}
                  {chipLabel(g, v)} <span class="count">{counts[g.key].get(v) ?? 0}</span>
                </button>
              {/each}
            </div>
          {/snippet}
          {#each groups as g (g.key)}
            {#if g.sub ? g.sub.some((s) => visibleItems(g, s.items).length) : visibleItems(g, g.items).length}
              <fieldset>
                <legend>{g.title}</legend>
                {#if g.sub}
                  {#each g.sub.filter((s) => visibleItems(g, s.items).length) as s (s.title)}
                    <p class="sub">{s.title}</p>
                    {@render chips(g, s.items)}
                  {/each}
                {:else}
                  {@render chips(g, g.items)}
                {/if}
                {#if g.hint && (g.key !== 'kinds' || filters.kinds.includes('domestic-global') || counts.kinds.get('domestic-global'))}<p class="hint">{g.hint}</p>{/if}
              </fieldset>
            {/if}
          {/each}
          <fieldset>
            <legend>{t('filters.country')}</legend>
            <select class="csel" onchange={(e) => { const v = (e.target as HTMLSelectElement).value; update({ countries: v ? [v] : [] }); }}>
              <option value="">{t('common.all')}</option>
              {#each [...countryOptions].sort((a, b) => countryName(a[0]).localeCompare(countryName(b[0]))) as [cc, n]}
                <option value={cc} selected={filters.countries[0] === cc}>{countryName(cc)} ({n})</option>
              {/each}
            </select>
          </fieldset>
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
                <span class="r-thumb ph"><span class="dot" class:ring={colorGroup(b) === 'aggregate'} style:background={GROUP_COLOR[colorGroup(b)]}></span></span>
              {/if}
              <span class="r-main">
                <span class="r-name">{b.name}</span>
                <span class="r-sub">{#if b.host.country}{flag(b.host.territory ?? b.host.country)} {countryName(b.host.territory ?? b.host.country)}{' · '}{/if}{tl('siteType', b.siteType)}{#if b.status !== 'active'}{' · '}{tl('status', b.status)}{/if}</span>
              </span>
              {#if foreignNations(b).length}<span class="r-nat" title={foreignNations(b).map(countryName).join(', ')}>{foreignNations(b).map(flag).join('')}</span>{/if}
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
  .map :global(.notice) { padding-left: 440px; }
  .map-tools[hidden] { display: none; }
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

  .meta-row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 4px 12px; padding: 4px 16px 10px; font-size: 0.9rem; border-bottom: 1px solid var(--line); }
  .meta-row strong { white-space: nowrap; }
  .row-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px 14px; }
  .row-actions .linkish { white-space: nowrap; }
  .linkish { background: none; border: 0; padding: 0; color: var(--text-2); text-decoration: underline; text-underline-offset: 3px; font-size: 0.85rem; }

  .country { padding: 12px 16px 14px; border-bottom: 1px solid var(--line); background: linear-gradient(180deg, rgb(57 135 229 / 0.08), transparent); }
  .country h2 { font-size: 1.25rem; margin: 0 0 4px; display: flex; align-items: center; gap: 8px; }
  .country h2 .linkish { margin-left: auto; text-decoration: none; font-size: 1rem; }
  .cstats { margin: 0 0 4px; font-size: 0.92rem; }
  .cline { margin: 0 0 4px; font-size: 0.8rem; color: var(--text-2); }
  .cimgs { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; margin-top: 8px; }
  .cimgs img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 4px; }
  .csel { width: 100%; min-height: 36px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg-2); padding: 0 8px; }
  .embed-box { padding: 10px 16px 14px; border-bottom: 1px solid var(--line); font-size: 0.85rem; color: var(--text-2); }
  .embed-box p { margin-bottom: 8px; }
  .embed-box textarea { width: 100%; resize: none; font: 0.75rem/1.4 ui-monospace, monospace; background: var(--bg-2); color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 8px; margin-bottom: 8px; }
  .filters { padding: 8px 16px 16px; border-bottom: 1px solid var(--line); overflow-y: auto; max-height: 60%; flex: none; }
  fieldset { border: 0; margin: 0 0 12px; padding: 0; }
  legend { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); font-weight: 700; margin-bottom: 8px; padding: 0; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .sub { font-size: 0.75rem; color: var(--text-2); margin: 8px 0 5px; }
  .hint { font-size: 0.75rem; color: var(--muted); margin: 6px 0 0; }
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
    .map :global(.notice) { padding: 24px 24px 200px; place-content: start center; padding-top: 30px; }
    .sat-cta { left: 50%; bottom: auto; top: calc(var(--header-h) + 56px); }
  }
</style>
