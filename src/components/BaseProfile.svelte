<script lang="ts">
  import { untrack } from 'svelte';
  import { t, tl, ti, i18n, countryName, formatNumber } from '../lib/i18n.svelte';
  import { db, loadResearch } from '../lib/store.svelte';
  import { href, route } from '../lib/router.svelte';
  import { GROUP_COLOR, FEATURE, FEATURE_KINDS, ACTIVITY, CLAIM_TYPES, colorGroup, flag } from '../lib/taxonomy';
  import { foreignNations } from '../lib/data';
  import { settings, setSatellite } from '../lib/settings.svelte';
  import type { Ranked } from '../lib/data';
  import type { Base } from '../lib/types';
  import Compare from './Compare.svelte';
  import Gallery from './Gallery.svelte';
  import NewsList from './NewsList.svelte';
  import { issueUrl, mailUrl } from '../lib/github';

  let { base, nearby, onClose, onSelect }: { base: Base; nearby: Ranked[]; onClose: () => void; onSelect: (id: string) => void } = $props();

  let copied = $state(false);
  let card = $state<{ url: string; blob: Blob } | null>(null);
  let cardBusy = $state(false);
  const canShareFiles = typeof navigator !== 'undefined' && 'canShare' in navigator;

  async function makeCard() {
    cardBusy = true;
    try {
      const { renderBaseCard } = await import('../lib/shareImage');
      const lines = [
        foreignNations(base).length ? `${t('base.nations')}: ${foreignNations(base).map(countryName).join(', ')}` : '',
        base.features.length ? base.features.slice(0, 4).map((f) => tl('feature', f)).join(' · ') : '',
        base.themes.length ? base.themes.slice(0, 3).map((th) => tl('theme', th)).join(' · ') : '',
      ].filter(Boolean);
      const blob = await renderBaseCard({
        base,
        image: cover ? { src: cover.src, credit: cover.credit, year: cover.year } : undefined,
        kindLabel: tl('siteType', base.siteType) + (base.status === 'closed' ? ` · ${tl('status', 'closed')}` : ''),
        country: `${countryName(base.host.territory ?? base.host.country)}${base.subregion ? ' · ' + base.subregion : ''}`,
        lines,
        footer: location.host + location.pathname.replace(/index\.html$/, '').replace(/\/$/, ''),
        accent: GROUP_COLOR[group],
      });
      if (card) URL.revokeObjectURL(card.url);
      card = { url: URL.createObjectURL(blob), blob };
    } finally {
      cardBusy = false;
    }
  }
  async function shareCard() {
    if (!card) return;
    const file = new File([card.blob], `visualbases-${base.id}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: base.name }); } catch { /* cancelled */ }
    }
  }
  let scroller: HTMLDivElement;

  const group = $derived(colorGroup(base));
  const byId = (ids: string[] | undefined) => (ids ?? []).map((id) => db.byId.get(id)).filter((b): b is Base => !!b);
  const relGroups = $derived([
    { label: t('base.memberOf'), list: byId(base.relations?.filter((r) => r.type === 'member-of').map((r) => r.id)) },
    { label: t('base.partOf'), list: byId(base.relations?.filter((r) => r.type === 'part-of').map((r) => r.id)) },
    { label: t('base.includes'), list: byId(base.includes) },
    { label: t('base.hasParts'), list: byId(base.hasParts) },
    { label: t('base.seeAlso'), list: byId(base.relations?.filter((r) => r.type === 'related').map((r) => r.id)) },
  ].filter((g) => g.list.length));
  const featureGroups = $derived(FEATURE_KINDS.map((k) => ({ kind: k.id, items: base.features.filter((f) => FEATURE[f].kind === k.id) })).filter((g) => g.items.length));
  const issues = $derived((base.issues ?? []).filter((i) => i !== 'position-unverified'));
  $effect(() => { loadResearch(); });
  const research = $derived(base.research ?? db.research?.[base.id] ?? []);
  const checkedSources = $derived(research.filter((s) => s.method === 'manual'));
  const leads = $derived(research.filter((s) => s.method !== 'manual'));
  /** readable form of a corrected value */
  function fmt(field: string, v: unknown): string {
    if (v == null || (Array.isArray(v) && !v.length)) return t('base.none');
    if (field === 'presences') return (v as { nation: string }[]).map((p) => countryName(p.nation)).join(', ');
    if (field === 'host') { const h = v as { country: string; territory?: string }; return countryName(h.territory ?? h.country) + (h.territory ? ` (${countryName(h.country)})` : ''); }
    if (field === 'status') return tl('status', String(v));
    if (field === 'siteType') return tl('siteType', String(v));
    if (field === 'position') { const p = v as { lat: number; lon: number }; return `${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}`; }
    if (field === 'period') { const p = v as { from?: string; to?: string }; return [p.from && `${t('base.since')} ${p.from}`, p.to && `${t('base.until')} ${p.to}`].filter(Boolean).join(' '); }
    return Array.isArray(v) ? v.join(', ') : String(v);
  }
  const sourceTitle = (url: string) => research.find((s) => s.url === url)?.publisher ?? host(url);
  const images = $derived(base.images ?? []);
  const news = $derived(db.news.filter((n) => n.bases?.includes(base.id) || (base.relations ?? []).some((r) => n.bases?.includes(r.id))).slice(0, 6));
  const sats = $derived(images.filter((i) => i.type === 'satellite' && i.year).sort((a, b) => a.year! - b.year!));
  const pair = $derived(sats.length >= 2 && sats[0].year !== sats.at(-1)!.year ? ([sats[0], sats.at(-1)!] as const) : null);
  const cover = $derived(images.find((i) => i.type === 'photo') ?? sats.at(-1) ?? images.find((i) => i.type === 'map'));
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
    // reset the share card only when the base changes (untracked: must not react to `card` itself)
    untrack(() => { if (card) { URL.revokeObjectURL(card.url); card = null; } });
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
      <button class="btn btn-sm" onclick={makeCard} disabled={cardBusy} title={t('base.card')}>🖼</button>
      <button class="btn btn-sm" onclick={share}>{copied ? '✓ ' + t('base.copied') : '↗ ' + t('base.share')}</button>
    </div>
  </div>

  {#if cover}
    <figure class="cover">
      <img src={cover.src} width={cover.w} height={cover.h} alt={cover.caption ?? ""} />
      <figcaption>{cover.license ? t('img.by') : '©'} {cover.credit}{#if cover.license}{' · '}{cover.license}{/if}{#if cover.year}{' · '}{cover.year}{/if}</figcaption>
    </figure>
  {/if}

  <header>
    <span class="tag kind"><span class="dot" class:ring={group === 'aggregate'} style:background={GROUP_COLOR[group]}></span>{tl('siteType', base.siteType)}</span>
    {#if base.status !== 'active'}<span class="tag status">{tl('status', base.status)}{#if base.period?.to}{' '}{t('base.until')} {base.period.to}{/if}</span>{/if}
    <h2>{base.name}</h2>
    <p class="where">{#if base.host.country}<a class="cc" href={href('/atlas', `countries=${base.host.territory ?? base.host.country}`)}>{flag(base.host.territory ?? base.host.country)} {countryName(base.host.territory ?? base.host.country)}</a>{#if base.host.territory}{' '}<span class="muted">({countryName(base.host.country)})</span>{/if}{/if}{#if base.subregion}{' · '}{base.subregion}{/if}</p>
    <p class="kind-info">{ti('siteType', base.siteType)}</p>
    {#if base.scope === 'domestic' && base.siteType !== 'domestic-global'}<p class="kind-info">ℹ {t('base.context')}</p>{:else if base.scope === 'overseas'}<p class="kind-info">ℹ {t('base.overseas')}</p>{/if}
    {#if base.positionCheck?.status === 'proposed'}
      {@const dup = base.positionCheck.duplicateOf ? db.byId.get(base.positionCheck.duplicateOf) : undefined}
      <p class="pos-warn" role="note">
        {t('base.positionText')}{#if dup}{' '}<a href={href(`/base/${dup.id}`, route.query)}>{dup.name}</a>.{/if}
        {#if base.positionCheck.proposal}{' '}{t('base.positionProposal')}: <a href={base.positionCheck.proposal.url} target="_blank" rel="noopener">{base.positionCheck.proposal.source}</a>.{/if}
      </p>
    {/if}
    <div class="flags">
      {#if base.approx}<span class="tag">≈ {t('base.approx')}</span>{/if}
      {#if base.origin.review}<span class="tag warn">⚠ {t('base.review')}</span>{/if}
      {#if base.positionCheck?.status === 'proposed'}<span class="tag warn">⚠ {t('base.positionUnverified')}</span>{/if}
      {#if base.positionCheck?.status === 'confirmed'}<a class="tag" href={base.positionCheck.url} target="_blank" rel="noopener" title={[base.positionCheck.source, base.positionCheck.note].filter(Boolean).join(' – ')}>✓ {t('base.positionConfirmed')}</a>{/if}
      {#if base.corrections?.length}<span class="tag">✎ {t('base.corrections')}: {base.corrections.length}</span>{/if}
      {#each base.listedIn.filter((l) => l.startsWith('bsr')).slice(0, 1) as l}<span class="tag">📄 {tl('listing', l)}</span>{/each}
    </div>
  </header>

  <button class="sat-toggle" aria-pressed={settings.satellite} onclick={() => setSatellite(!settings.satellite)} title={t('map.satelliteHint')}>
    <span>🛰</span>
    <span class="st-text"><b>{t('map.satellite')}</b><small>{t('map.satelliteHint')}</small></span>
    <span class="switch" aria-hidden="true"></span>
  </button>

  {#if card}
    <div class="card-out">
      <img src={card.url} alt="{base.name} – {t('base.card')}" width="270" height="338" />
      <div class="card-actions">
        {#if canShareFiles}<button class="btn btn-primary btn-sm" onclick={shareCard}>↗ {t('share.native')}</button>{/if}
        <a class="btn btn-sm" href={card.url} download="visualbases-{base.id}.png">⬇ {t('share.download')}</a>
        <button class="btn btn-sm btn-ghost" onclick={() => { if (card) URL.revokeObjectURL(card.url); card = null; }}>✕</button>
      </div>
    </div>
  {/if}

  {#if pair}
    <section class="first">
      <Compare before={pair[0]} after={pair[1]} />
    </section>
  {/if}

  <section>
    <h3>{t('base.classification')}</h3>
    <dl class="facts">
      <div><dt>{t('base.siteType')}</dt><dd>{tl('siteType', base.siteType)}{#if base.basis.siteType !== 'source'} <small class="basis">({base.basis.siteType === 'claim' ? t('base.basisClaim') : t('base.basisDerived')})</small>{/if}</dd></div>
      <div><dt>{t('base.status')}</dt><dd>{tl('status', base.status)}{#if base.period}{' · '}{fmt('period', base.period)}{/if}{#if base.basis.status !== 'source'} <small class="basis">({base.basis.status === 'claim' ? t('base.basisClaim') : t('base.basisImplicit')})</small>{/if}</dd></div>
      <div><dt>{t('base.host')}</dt><dd>{#if base.host.country}{flag(base.host.country)} {countryName(base.host.country)}{#if base.host.territory}{' · '}{t('base.territory')}: {flag(base.host.territory)} {countryName(base.host.territory)}{/if}{:else}–{/if}</dd></div>
      <div><dt>{t('base.presences')}</dt><dd>
        {#each base.presences as p (p.nation)}
          <span class="nat">{flag(p.nation)} {countryName(p.nation)}{#if p.role !== 'stationing'}{' · '}{tl('presenceRole', p.role)}{/if}{#if p.relation !== 'foreign'}{' · '}{tl('relation', p.relation)}{/if}{#if p.via !== 'tag'}<small class="basis" title={tl('presenceVia', p.via)}> ({p.via === 'claim' ? t('base.basisClaim') : t('base.basisDerived')})</small>{/if}</span>
        {:else}<span class="muted">{t('base.none')}</span>{/each}
      </dd></div>
      {#if base.organisations.length}
        <div><dt>{t('base.organisations')}</dt><dd>{#each base.organisations as o}<a class="nat" href={href('/atlas', `activities=${o}`)} title={ti('organisation', o)}>{tl('organisation', o)}</a>{/each}</dd></div>
      {/if}
      {#if base.usPosture}
        <div><dt>{t('base.usPosture')}</dt><dd><a href={href('/about')} title={ti('usPosture', base.usPosture)}>{base.usPosture}</a> – {tl('usPosture', base.usPosture)}</dd></div>
      {/if}
      {#if base.listedIn.length}
        <div><dt>{t('base.listedIn')}</dt><dd>{base.listedIn.map((l) => tl('listing', l)).join(' · ')}</dd></div>
      {/if}
      {#if base.origin.updates?.length}
        <div><dt>{t('base.updates')}</dt><dd>{base.origin.updates.join(', ')}</dd></div>
      {/if}
    </dl>
  </section>

  {#if base.corrections?.length}
    <section class="box">
      <h3>✎ {t('base.corrections')}</h3>
      <ul class="notes">
        {#each base.corrections as c (c.id)}
          <li>{c.statement[i18n.lang]}<br /><small>{t('base.correctionFrom')}: {fmt(c.field, c.from)} · {#each c.sources as u}<a href={u} target="_blank" rel="noopener">{sourceTitle(u)}</a>{' '}{/each}</small></li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if base.proposals?.length || issues.length}
    <section class="box warnbox">
      {#if base.proposals?.length}
        <h3>⚠ {t('base.proposals')}</h3>
        <ul class="notes">
          {#each base.proposals as c (c.id)}
            <li>{c.statement[i18n.lang]} <small>{#each c.sources as u}<a href={u} target="_blank" rel="noopener">{sourceTitle(u)}</a>{' '}{/each}</small></li>
          {/each}
        </ul>
      {/if}
      {#if issues.length}
        <h3>{t('base.issues')}</h3>
        <ul class="notes">{#each issues as i}<li>{tl('issue', i)}{#if ti('issue', i)}<small> – {ti('issue', i)}</small>{/if}</li>{/each}</ul>
      {/if}
    </section>
  {/if}

  {#if featureGroups.length}
    <section>
      <h3>{t('base.facilities')}</h3>
      {#each featureGroups as g (g.kind)}
        <p class="sub">{tl('featureKind', g.kind)}</p>
        <div class="chips">
          {#each g.items as f}<a class="chip" href={href('/atlas', `facilities=${f}`)} title={ti('feature', f)}><span aria-hidden="true">{FEATURE[f].icon}</span>{tl('feature', f)}</a>{/each}
        </div>
      {/each}
    </section>
  {/if}

  {#if base.themes.length}
    <section>
      <h3>{t('base.themes')}</h3>
      <div class="chips">
        {#each base.themes as th}<a class="chip theme-{th}" href={href('/atlas', `themes=${th}`)} title={ti('theme', th)}>{tl('theme', th)}</a>{/each}
      </div>
    </section>
  {/if}

  {#if base.activities.length}
    <section>
      <h3>{t('base.activities')}</h3>
      <div class="chips">
        {#each base.activities as a}<a class="chip" href={href('/atlas', `activities=${ACTIVITY[a].group}`)} title={tl('activityKind', ACTIVITY[a].kind)}>{tl('activity', a)}</a>{/each}
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
    <h3>{t('base.evidence')}</h3>
    {#if base.evidence && Object.keys(base.evidence).length}
      <div class="chips ev">
        {#each CLAIM_TYPES.filter((c) => base.evidence?.[c.id]) as c (c.id)}
          <span class="chip ev-{base.evidence[c.id]}" title={ti('evidence', base.evidence[c.id]!)}>{tl('claimType', c.id)}: {tl('evidence', base.evidence[c.id]!)}</span>
        {/each}
      </div>
    {/if}
    {#if checkedSources.length || leads.length}
      <ul class="links research">
        {#each [...checkedSources, ...leads] as s (s.url + s.summary)}
          <li><a href={s.url} target="_blank" rel="noopener"><span class="lk v-{s.verdict}">{s.verdict === 'supports' ? '✓' : s.verdict === 'contradicts' ? '✗' : s.verdict === 'context' ? '·' : '?'}</span><span>{s.publisher}{#if s.published}{' · '}{s.published}{/if}<small>{t(`base.verdict.${s.verdict}` as never)} · {s.supports.map((c) => tl('claimType', c)).join(', ')} – {s.summary}</small></span></a></li>
        {/each}
      </ul>
      <p class="small muted">{t('base.evidenceNote', { date: base.lastChecked ?? (research[0]?.accessed ?? '') })}</p>
    {:else if db.research === null && base.evidence}
      <p class="small muted">{t('common.loading')}</p>
    {:else}
      <p class="small muted">{t('base.evidenceNone')}</p>
    {/if}
  </section>

  <section>
    <h3>{t('base.explore')}</h3>
    <ul class="links">
      {#each explore as e}<li><a href={e.url} target="_blank" rel="noopener"><span class="lk">⌖</span><span>{e.label}</span></a></li>{/each}
    </ul>
  </section>

  {#if relGroups.length}
    <section>
      <h3>{t('base.related')}</h3>
      {#each relGroups as g (g.label)}
        <p class="sub">{g.label}</p>
        <ul class="mini">
          {#each g.list as r (r.id)}
            <li><a href={href(`/base/${r.id}`, route.query)} onclick={(e) => { e.preventDefault(); onSelect(r.id); }}>
              <span class="dot" class:ring={colorGroup(r) === 'aggregate'} style:background={GROUP_COLOR[colorGroup(r)]}></span>{r.name}</a></li>
          {/each}
        </ul>
      {/each}
    </section>
  {/if}

  {#if nearby.length}
    <section>
      <h3>{t('base.nearby')}</h3>
      <ul class="mini">
        {#each nearby as { base: r, km } (r.id)}
          <li><a href={href(`/base/${r.id}`, route.query)} onclick={(e) => { e.preventDefault(); onSelect(r.id); }}>
            <span class="dot" class:ring={colorGroup(r) === 'aggregate'} style:background={GROUP_COLOR[colorGroup(r)]}></span>
            <span class="nm">{r.name}</span><span class="km">{formatNumber(km, km < 10 ? 1 : 0)} km</span></a></li>
        {/each}
      </ul>
    </section>
  {/if}

  <footer>
    <a href={base.origin.url} target="_blank" rel="noopener">{t('base.origin')} ↗</a>
    <span class="report">✏️ {t('base.report')}:
      <a href={issueUrl('korrektur', { title: `Korrektur: ${base.name}`, base: base.id })} target="_blank" rel="noopener">GitHub</a> ·
      <a href={mailUrl(`VisualBases: ${base.name}`, `${t('act.mailBody')}\n\n${location.href}`)}>{t('act.mail')}</a>
    </span>
    {#if base.origin.lastmod}<span>{t('base.updated')}: {base.origin.lastmod}</span>{/if}
    {#if base.lastChecked}<span>{t('base.lastChecked')}: {base.lastChecked}</span>{/if}
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
  .acts { display: flex; gap: 6px; }
  .card-out { display: flex; gap: 12px; align-items: flex-end; margin: 14px 0; padding: 12px; border: 1px solid var(--line); border-radius: var(--radius-s); background: var(--bg-2); }
  .card-out img { width: 135px; height: auto; border-radius: 6px; }
  .card-actions { display: flex; flex-direction: column; gap: 8px; }
  h2 { font-size: 1.6rem; margin: 0.45em 0 0.2em; }
  .where { color: var(--text-2); margin: 0 0 0.6em; }
  .cc { color: inherit; text-decoration: none; }
  .cc:hover { text-decoration: underline; }
  .kind-info { color: var(--muted); font-size: 0.88rem; margin-bottom: 0.6em; }
  .kind { background: transparent; }
  .flags { display: flex; flex-wrap: wrap; gap: 6px; }
  .warn { color: #ffd27a; border-color: #5a4a22; }
  .pos-warn { font-size: 0.85rem; color: #ffd27a; background: rgb(90 74 34 / 0.25); border: 1px solid #5a4a22; border-radius: var(--radius-s); padding: 8px 10px; }
  .pos-warn a { color: inherit; }

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
  .sub { font-size: 0.75rem; color: var(--muted); margin: 8px 0 5px; text-transform: uppercase; letter-spacing: 0.06em; }
  .basis { color: var(--muted); font-size: 0.78em; }
  .status { margin-left: 6px; border-color: var(--c-closed, #8b93a7); }
  .box { border: 1px solid var(--line); border-radius: var(--radius-s); padding: 4px 12px 8px; background: var(--bg-2); margin-top: 14px; }
  .warnbox { border-color: #8a6d1f; }
  .ev .chip { cursor: default; }
  .ev-confirmed, .ev-corrected { border-color: #199e70; }
  .ev-disputed { border-color: #c9a227; }
  .research small { white-space: normal; }
  .v-supports { color: #2bbf8a; } .v-contradicts { color: #e8692f; }

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
