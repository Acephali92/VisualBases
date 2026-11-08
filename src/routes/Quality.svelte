<script lang="ts">
  import { onMount } from 'svelte';
  import { t, i18n } from '../lib/i18n.svelte';
  import { db } from '../lib/store.svelte';
  import { href } from '../lib/router.svelte';
  import { issueUrl, REPO_URL } from '../lib/github';
  import { POSITION_PRECISIONS } from '../lib/taxonomy';
  import type { Base, Correction } from '../lib/types';

  /** one snapshot of docs/data-quality-history.json (written by `npm run data:report`, published as data/quality.json) */
  interface Snapshot {
    date: string; bases: number; withSources: number; researchOnly: number; positionEvidence: number;
    corrections: number; proposals: number; geoWarnings: number; note?: string;
  }

  let history = $state<Snapshot[]>([]);
  onMount(async () => {
    try {
      const r = await fetch('./data/quality.json');
      if (r.ok) history = await r.json();
    } catch { /* the figures are optional – the rest of the page works from the loaded data */ }
  });
  const now = $derived(history.at(-1));
  const first = $derived(history.length > 1 ? history[0] : undefined);

  const figures = $derived(now ? [
    { key: 'quality.fBases' as const, v: now.bases, d: first ? now.bases - first.bases : 0 },
    { key: 'quality.fSourced' as const, v: now.withSources + now.researchOnly, d: first ? now.withSources + now.researchOnly - first.withSources - first.researchOnly : 0 },
    { key: 'quality.fPosition' as const, v: now.positionEvidence, d: first ? now.positionEvidence - first.positionEvidence : 0, info: 'quality.fPositionInfo' as const },
    { key: 'quality.fCorrections' as const, v: now.corrections, d: first ? now.corrections - first.corrections : 0 },
    { key: 'quality.fProposals' as const, v: now.proposals, d: first ? now.proposals - first.proposals : 0 },
    { key: 'quality.fGeo' as const, v: now.geoWarnings, d: first ? now.geoWarnings - first.geoWarnings : 0 },
  ] : []);

  const precision = $derived(POSITION_PRECISIONS.map((p) => ({ id: p, n: db.bases.filter((b) => (b.positionPrecision ?? 'reference') === p).length })));

  /** all applied corrections, newest decision first */
  const log = $derived(
    db.bases
      .flatMap((b: Base) => (b.corrections ?? []).map((c: Correction) => ({ b, c })))
      .sort((x, y) => (y.c.decided ?? '').localeCompare(x.c.decided ?? '') || x.b.name.localeCompare(y.b.name)),
  );
  const open = $derived(db.bases.flatMap((b) => (b.proposals ?? []).map((c) => ({ b, c }))));

  const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
  const num = (n: number) => n.toLocaleString(i18n.lang);
  const date = (d?: string) => (d ? new Date(d).toLocaleDateString(i18n.lang, { year: 'numeric', month: 'long', day: 'numeric' }) : '');
</script>

<div class="quality container">
  <header>
    <p class="kicker">{t('quality.kicker')}</p>
    <h1>{t('quality.title')}</h1>
    <p class="lead">{t('quality.lead')}</p>
  </header>

  <section class="text">
    <h2>{t('quality.howTitle')}</h2>
    <ol class="steps">
      <li>{t('quality.how1')}</li>
      <li>{t('quality.how2')}</li>
      <li>{t('quality.how3')}</li>
      <li>{t('quality.how4')}</li>
    </ol>
  </section>

  {#if now}
    <section class="text">
      <h2>{t('quality.figures')}</h2>
      <p class="small">{t('quality.asOf')}: {date(now.date)}{#if first}{' · '}{t('quality.since')} {date(first.date)}{/if}</p>
      <dl class="figures">
        {#each figures as f (f.key)}
          <div class="card">
            <dt>{t(f.key)}</dt>
            <dd><span class="v">{num(f.v)}</span>{#if first && f.d}<span class="d">{f.d > 0 ? '+' : ''}{num(f.d)}</span>{/if}</dd>
            {#if 'info' in f && f.info}<dd class="info">{t(f.info)}</dd>{/if}
          </div>
        {/each}
      </dl>
    </section>
  {/if}

  <section class="text">
    <h2>{t('quality.precisionTitle')}</h2>
    <p>{t('quality.precisionText')}</p>
    <dl class="kinds">
      {#each precision as p (p.id)}
        <div><dt>{t(`quality.p.${p.id}`)} <span class="count">{num(p.n)}</span></dt><dd>{t(`quality.p.${p.id}Info`)}</dd></div>
      {/each}
    </dl>
  </section>

  <section class="text" id="corrections">
    <h2>{t('quality.correctionsTitle')} <span class="count">{num(log.length)}</span></h2>
    <p>{t('quality.correctionsText')}</p>
    <ul class="log">
      {#each log as { b, c } (c.id)}
        <li>
          <a class="site" href={href(`/base/${b.id}`)}>{b.name}</a>
          <span class="when">{date(c.decided)}</span>
          <p>{c.statement[i18n.lang]}</p>
          <small>{#each c.sources as u}<a href={u} target="_blank" rel="noopener">{host(u)}</a>{' '}{/each}</small>
        </li>
      {/each}
    </ul>
  </section>

  {#if open.length}
    <section class="text">
      <h2>{t('quality.proposalsTitle')} <span class="count">{num(open.length)}</span></h2>
      <ul class="log">
        {#each open as { b, c } (c.id)}
          <li>
            <a class="site" href={href(`/base/${b.id}`)}>{b.name}</a>
            <p>{c.statement[i18n.lang]}</p>
            <small>{#each c.sources as u}<a href={u} target="_blank" rel="noopener">{host(u)}</a>{' '}{/each}</small>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <section class="card block">
    <h2>{t('quality.reportTitle')}</h2>
    <p>{t('quality.reportText')}</p>
    <div class="dl">
      <a class="btn btn-primary btn-sm" href={issueUrl('korrektur')} target="_blank" rel="noopener">{t('quality.reportForm')} ↗</a>
      <a class="btn btn-sm" href="{REPO_URL}/blob/main/docs/data-quality-report.md" target="_blank" rel="noopener">{t('quality.fullReport')} ↗</a>
      <a class="btn btn-sm" href="{REPO_URL}/blob/main/docs/DATA-QUALITY.md" target="_blank" rel="noopener">{t('quality.rules')} ↗</a>
    </div>
  </section>
</div>

<style>
  .quality { padding: calc(var(--header-h) + 48px) 0 64px; }
  h1 { font-size: clamp(1.9rem, 4.5vw, 3rem); font-weight: 800; }
  .lead { color: var(--text-2); font-size: 1.15rem; max-width: 42em; }
  .text { max-width: 760px; margin-top: 40px; }
  .text h2 { font-size: 1.4rem; }
  .text p { color: var(--text-2); }
  .steps { padding-left: 1.3em; display: grid; gap: 10px; color: var(--text-2); }
  .small { color: var(--muted); font-size: 0.85rem; }
  .figures { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 14px 0 0; }
  .figures > div { padding: 14px 16px; }
  .figures dt { color: var(--text-2); font-size: 0.9rem; }
  .figures dd { margin: 4px 0 0; }
  .figures .v { font-size: 1.8rem; font-weight: 800; }
  .figures .d { margin-left: 8px; color: var(--muted); font-size: 0.9rem; }
  .figures .info { color: var(--muted); font-size: 0.8rem; }
  .kinds { display: grid; gap: 12px; margin: 0; }
  .kinds dt { font-weight: 700; }
  .kinds dd { margin: 2px 0 0 0; color: var(--text-2); font-size: 0.95rem; }
  .count { color: var(--muted); font-weight: 500; font-size: 0.9em; margin-left: 6px; }
  .log { list-style: none; padding: 0; display: grid; gap: 14px; }
  .log li { border-left: 2px solid var(--line); padding-left: 12px; }
  .log .site { font-weight: 700; color: var(--text); }
  .log .when { color: var(--muted); font-size: 0.85rem; margin-left: 8px; }
  .log p { margin: 4px 0; }
  .log small a { color: var(--text-2); margin-right: 8px; }
  .block { padding: 20px 22px; margin-top: 40px; max-width: 760px; }
  .block h2 { font-size: 1.15rem; }
  .block p { color: var(--text-2); font-size: 0.95rem; }
  .dl { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
