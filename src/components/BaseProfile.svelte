<script lang="ts">
  import { t, countryName, formatNumber } from '../lib/i18n.svelte';
  import { db } from '../lib/store.svelte';
  import { href, route } from '../lib/router.svelte';
  import { GROUP_COLOR, KIND_GROUP, FACILITY_ICON, flag } from '../lib/taxonomy';
  import { settings, setSatellite } from '../lib/settings.svelte';
  import type { Ranked } from '../lib/data';
  import type { Base } from '../lib/types';
  import Compare from './Compare.svelte';
  import Gallery from './Gallery.svelte';
  import NewsList from './NewsList.svelte';
  import { issueUrl } from '../lib/github';

  let { base, nearby, onClose, onSelect }: { base: Base; nearby: Ranked[]; onClose: () => void; onSelect: (id: string) => void } = $props();

  let copied = $state(false);
  let scroller: HTMLDivElement;

  const group = $derived(KIND_GROUP[base.kind]);
  const images = $derived(base.images ?? []);
  const news = $derived(db.news.filter((n) => n.bases?.includes(base.id) || (base.related ?? []).some((r) => n.bases?.includes(r))).slice(0, 6));
  const sats = $derived(images.filter((i) => i.type === 'satellite' && i.year).sort((a, b) => a.year! - b.year!));
  const pair = $derived(sats.length >= 2 && sats[0].year !== sats.at(-1)!.year ? ([sats[0], sats.at(-1)!] as const) : null);
  const cover = $derived(images.find((i) => i.type === 'photo') ?? sats.at(-1) ?? images.find((i) => i.type === 'map'));
  const related = $derived((base.related ?? []).map((id) => db.byId.get(id)).filter((b): b is Base => !!b));
  const partOf = $derived(db.bases.filter((b) => b.group && b.related?.includes(base.id)));
  const z = $derived(Math.min(base.zoom ?? 14, 16));
  const explore = $derived([
    { label: t('base.osm'), url: `https://www.openstreetmap.org/#map=${z}/${base.lat}/${base.lon}` },
    { label: t('base.osb'), url: `https://www.openstreetbrowser.org/#map=${z}/${base.lat}/${base.lon}&categories=military` },
    { label: t('base.earth'), url: `https://earth.google.com/web/search/${base.lat},${base.lon}` },
  ]);

  $effect(() => {
    void base.id;
    scroller?.scrollTo({ top: 0 });
    copied = false;
  });

  async function share() {
    // the static page carries title/description/image for link previews and forwards to the app
    const url = `${location.href.split('#')[0].replace(/index\.html$/, '')}b/${base.id}.html`;
    const title = `${base.name} – VisualBases`;
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch { /* clipboard blocked */ }
  }

  const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
</script>

<div class="profile" bind:this={scroller}>
  <div class="top">
    <button class="btn btn-sm btn-ghost" onclick={onClose}>← {t('base.back')}</button>
    <div class="acts">
      <button class="btn btn-sm" onclick={share}>{copied ? '✓ ' + t('base.copied') : '↗ ' + t('base.share')}</button>
    </div>
  </div>

  {#if cover}
    <figure class="cover">
      <img src={cover.src} width={cover.w} height={cover.h} alt={cover.caption ?? base.name} />
      <figcaption>© {cover.credit}{#if cover.year}{' · '}{cover.year}{/if}</figcaption>
    </figure>
  {/if}

  <header>
    <span class="tag kind"><span class="dot" class:ring={group === 'hotspot'} style:background={GROUP_COLOR[group]}></span>{t(`kind.${base.kind}`)}</span>
    <h2>{base.name}</h2>
    <p class="where">{#if base.country}{flag(base.country)} {countryName(base.country)}{/if}{#if base.subregion}{' · '}{base.subregion}{/if}</p>
    <p class="kind-info">{t(`kindInfo.${base.kind}`)}</p>
    <div class="flags">
      {#if base.approx}<span class="tag">≈ {t('base.approx')}</span>{/if}
      {#if base.review}<span class="tag warn">⚠ {t('base.review')}</span>{/if}
      {#if base.sourceType.includes('bsr') || base.sourceType.includes('bsr-multi')}<span class="tag">📄 {t('base.bsr')}</span>{/if}
    </div>
  </header>

  <button class="sat-toggle" aria-pressed={settings.satellite} onclick={() => setSatellite(!settings.satellite)} title={t('map.satelliteHint')}>
    <span>🛰</span>
    <span class="st-text"><b>{t('map.satellite')}</b><small>{t('map.satelliteHint')}</small></span>
    <span class="switch" aria-hidden="true"></span>
  </button>

  {#if pair}
    <section class="first">
      <Compare before={pair[0]} after={pair[1]} />
    </section>
  {/if}

  <dl class="facts">
    {#if base.nations.length}
      <div><dt>{t('base.nations')}</dt><dd>{#each base.nations as n}<span class="nat">{flag(n)} {countryName(n)}</span>{/each}</dd></div>
    {/if}
    {#if base.sharedWith.length}
      <div><dt>{t('base.sharedWith')}</dt><dd>{base.sharedWith.map((s) => (s.length === 2 ? `${flag(s)} ${countryName(s)}` : s)).join(', ')}</dd></div>
    {/if}
    {#if base.usType}
      <div><dt>{t('base.usType')}</dt><dd><a href={href('/about')}>{base.usType}</a></dd></div>
    {/if}
    {#if base.updates?.length}
      <div><dt>{t('base.updates')}</dt><dd>{base.updates.join(', ')}</dd></div>
    {/if}
  </dl>

  {#if base.facilities.length}
    <section>
      <h3>{t('base.facilities')}</h3>
      <div class="chips">
        {#each base.facilities as f}<a class="chip" href={href('/atlas', `facilities=${f}`)}><span aria-hidden="true">{FACILITY_ICON[f]}</span>{t(`fac.${f}`)}</a>{/each}
      </div>
    </section>
  {/if}

  {#if base.themes.length}
    <section>
      <h3>{t('base.themes')}</h3>
      <div class="chips">
        {#each base.themes as th}<a class="chip theme-{th}" href={href('/atlas', `themes=${th}`)}>{t(`theme.${th}`)}</a>{/each}
      </div>
    </section>
  {/if}

  {#if images.length}
    <section>
      <h3>{t('img.photos')} · {images.length}</h3>
      <Gallery {images} title={base.name} />
    </section>
  {/if}

  {#if news.length}
    <section>
      <h3>{t('news.inProfile')}</h3>
      <NewsList items={news} compact />
    </section>
  {/if}

  {#if base.notes.length}
    <section>
      <h3>{t('base.notes')}</h3>
      <ul class="notes">
        {#each base.notes as n}<li>{n}</li>{/each}
      </ul>
    </section>
  {/if}

  {#if base.sources.length || base.wikipedia}
    <section>
      <h3>{t('base.sources')}</h3>
      <ul class="links">
        {#each Object.entries(base.wikipedia ?? {}) as [lang, url]}
          <li><a href={url} target="_blank" rel="noopener"><span class="lk">W</span><span>{t('base.wikipedia')} ({lang.toUpperCase()})</span></a></li>
        {/each}
        {#each base.sources as s}
          <li><a href={s.url} target="_blank" rel="noopener"><span class="lk">↗</span><span>{s.label}<small>{host(s.url)}</small></span></a></li>
        {/each}
      </ul>
    </section>
  {/if}

  <section>
    <h3>{t('base.explore')}</h3>
    <ul class="links">
      {#each explore as e}<li><a href={e.url} target="_blank" rel="noopener"><span class="lk">⌖</span><span>{e.label}</span></a></li>{/each}
    </ul>
  </section>

  {#if related.length || partOf.length}
    <section>
      <h3>{t('base.related')}</h3>
      <ul class="mini">
        {#each [...partOf, ...related] as r (r.id)}
          <li><a href={href(`/base/${r.id}`, route.query)} onclick={(e) => { e.preventDefault(); onSelect(r.id); }}>
            <span class="dot" class:ring={KIND_GROUP[r.kind] === 'hotspot'} style:background={GROUP_COLOR[KIND_GROUP[r.kind]]}></span>{r.name}</a></li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if nearby.length}
    <section>
      <h3>{t('base.nearby')}</h3>
      <ul class="mini">
        {#each nearby as { base: r, km } (r.id)}
          <li><a href={href(`/base/${r.id}`, route.query)} onclick={(e) => { e.preventDefault(); onSelect(r.id); }}>
            <span class="dot" class:ring={KIND_GROUP[r.kind] === 'hotspot'} style:background={GROUP_COLOR[KIND_GROUP[r.kind]]}></span>
            <span class="nm">{r.name}</span><span class="km">{formatNumber(km, km < 10 ? 1 : 0)} km</span></a></li>
        {/each}
      </ul>
    </section>
  {/if}

  <footer>
    <a href={base.origin} target="_blank" rel="noopener">{t('base.origin')} ↗</a>
    <a href={issueUrl('korrektur', { title: `Korrektur: ${base.name}`, base: base.id })} target="_blank" rel="noopener">✏️ {t('base.report')}</a>
    {#if base.lastmod}<span>{t('base.updated')}: {base.lastmod}</span>{/if}
  </footer>
</div>

<style>
  .profile { overflow-y: auto; flex: 1; padding: 0 18px 20px; overscroll-behavior: contain; }
  .top { position: sticky; top: 0; z-index: 2; display: flex; justify-content: space-between; align-items: center; padding: 12px 0 8px; margin: 0 -18px; padding-inline: 10px 14px;
    background: linear-gradient(rgb(13 18 32 / 1) 75%, rgb(13 18 32 / 0)); }
  header { padding: 4px 0 8px; }
  .cover { position: relative; margin: 0 -18px 4px; }
  .cover img { width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
  .cover::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 55%, rgb(13 18 32 / 1)); pointer-events: none; }
  .cover figcaption { position: absolute; right: 10px; bottom: 6px; z-index: 1; font-size: 0.68rem; color: var(--muted); }
  .first { margin-top: 14px; }
  h2 { font-size: 1.6rem; margin: 0.45em 0 0.2em; }
  .where { color: var(--text-2); margin: 0 0 0.6em; }
  .kind-info { color: var(--muted); font-size: 0.88rem; margin-bottom: 0.6em; }
  .kind { background: transparent; }
  .flags { display: flex; flex-wrap: wrap; gap: 6px; }
  .warn { color: #ffd27a; border-color: #5a4a22; }

  .sat-toggle { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; margin: 12px 0 4px; padding: 10px 12px; border-radius: var(--radius-s); border: 1px solid var(--line); background: var(--bg-2); }
  .st-text { display: flex; flex-direction: column; flex: 1; }
  .st-text small { color: var(--muted); font-size: 0.75rem; line-height: 1.35; }
  .switch { width: 36px; height: 20px; border-radius: 999px; background: var(--line); position: relative; flex: none; transition: background 0.2s; }
  .switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--text); transition: transform 0.2s; }
  .sat-toggle[aria-pressed='true'] .switch { background: var(--c-shared); }
  .sat-toggle[aria-pressed='true'] .switch::after { transform: translateX(16px); }

  .facts { display: grid; gap: 10px; margin: 16px 0 6px; }
  .facts div { display: grid; grid-template-columns: 120px 1fr; gap: 8px; font-size: 0.92rem; }
  .facts dt { color: var(--muted); }
  .facts dd { margin: 0; display: flex; flex-wrap: wrap; gap: 4px 10px; }

  section { margin-top: 20px; }
  h3 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 10px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips a { text-decoration: none; }
  .theme-resistance { border-color: var(--accent); color: var(--text); }

  .notes { margin: 0; padding-left: 1.1em; color: var(--text-2); font-size: 0.92rem; display: grid; gap: 6px; }
  .links, .mini { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
  .links a, .mini a { display: flex; align-items: center; gap: 10px; padding: 8px; margin: 0 -8px; border-radius: var(--radius-s); text-decoration: none; font-size: 0.92rem; }
  .links a:hover, .mini a:hover { background: var(--surface-2); }
  .links small { display: block; color: var(--muted); font-size: 0.75rem; }
  .lk { width: 26px; height: 26px; flex: none; display: grid; place-items: center; border-radius: 6px; background: var(--surface-2); color: var(--text-2); font-size: 0.8rem; font-weight: 700; }
  .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .km { color: var(--muted); font-variant-numeric: tabular-nums; font-size: 0.85rem; }

  footer { margin-top: 24px; padding-top: 14px; border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-size: 0.8rem; color: var(--muted); }
  footer a { color: var(--text-2); }
</style>
