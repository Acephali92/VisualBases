<script lang="ts">
  import { t, tl, countryName, formatNumber } from '../lib/i18n.svelte';
  import { db } from '../lib/store.svelte';
  import { href } from '../lib/router.svelte';
  import { countBy, summary, facetValues, isAggregate, isContext, foreignNations } from '../lib/data';
  import { flag, ACTIVITY_GROUPS } from '../lib/taxonomy';
  import BarChart from '../components/BarChart.svelte';

  const sites = $derived(db.bases.filter((b) => !isAggregate(b)));
  const s = $derived(summary(db.bases));
  const row = (href_: string) => (label: string, value: number) => ({ label, value, href: href_ });

  const byCountry = $derived(countBy(sites, (b) => b.host.country).map(([k, v]) => row(href('/atlas', `countries=${k}`))(`${flag(k)} ${countryName(k)}`, v)));
  const byNation = $derived(countBy(sites, foreignNations).map(([k, v]) => row(href('/atlas', `nations=${k}`))(`${flag(k)} ${countryName(k)}`, v)));
  const byKind = $derived(countBy(sites, (b) => b.siteType).map(([k, v]) => row(href('/atlas', `kinds=${k}`))(tl('siteType', k), v)));
  const byStatus = $derived(countBy(sites, (b) => b.status).map(([k, v]) => row(href('/atlas', `status=${k}`))(tl('status', k), v)));
  const byFac = $derived(countBy(sites, (b) => b.features).map(([k, v]) => row(href('/atlas', `facilities=${k}`))(tl('feature', k), v)));
  const byTheme = $derived(countBy(db.bases, (b) => b.themes).map(([k, v]) => row(href('/atlas', `themes=${k}`))(tl('theme', k), v)));
  const byActivity = $derived(countBy(db.bases, (b) => facetValues(b, 'activities')).map(([k, v]) => row(href('/atlas', `activities=${k}`))(tl(ACTIVITY_GROUPS.some((a) => a.id === k) ? 'activityGroup' : 'organisation', k), v)));
  const byCont = $derived(countBy(sites, (b) => b.continent).map(([k, v]) => row(href('/atlas', `continents=${k}`))(tl('continent', k), v)));
  const context = $derived(sites.filter(isContext).length);
</script>

<div class="stats container">
  <header>
    <p class="kicker">{t('nav.stats')}</p>
    <h1>{t('stats.title')}</h1>
    <p class="lead">{t('stats.lead')}</p>
  </header>

  {#if db.status !== 'ready'}
    <p class="muted">{t('common.loading')}</p>
  {:else}
    <dl class="tiles">
      <div class="card"><dd>{formatNumber(s.locations)}</dd><dt>{t('stat.locations')}</dt></div>
      <div class="card"><dd>{formatNumber(s.countries)}</dd><dt>{t('stat.countries')}</dt></div>
      <div class="card"><dd>{formatNumber(s.us)}</dd><dt>{t('stat.us')}</dt></div>
      <div class="card"><dd>{formatNumber(s.resistance)}</dd><dt>{t('stat.resistance')}</dt></div>
    </dl>

    <div class="grid">
      <BarChart title={t('stats.byCountry')} rows={byCountry} max={15} />
      <BarChart title={t('stats.byNation')} rows={byNation} />
      <BarChart title={t('stats.byFacility')} rows={byFac} />
      <BarChart title={t('stats.byKind')} rows={byKind} />
      <BarChart title={t('stat.status')} rows={byStatus} />
      <BarChart title={t('stats.byTheme')} rows={byTheme} />
      <BarChart title={t('stat.activities')} rows={byActivity} />
      <BarChart title={t('stats.byContinent')} rows={byCont} />
    </div>
    <p class="note">ⓘ {t('stats.note')} {t('stat.context')}: {context} – {t('filters.context')}</p>
  {/if}
</div>

<style>
  .stats { padding: calc(var(--header-h) + 48px) 0 64px; }
  h1 { font-size: clamp(1.9rem, 4.5vw, 3rem); font-weight: 800; }
  .lead { color: var(--text-2); max-width: 44em; }
  .muted { color: var(--muted); }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 28px 0; }
  .tiles div { padding: 18px 20px; display: flex; flex-direction: column-reverse; }
  .tiles dd { margin: 0; font-size: 2.4rem; font-weight: 800; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
  .tiles dt { color: var(--muted); font-size: 0.88rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr)); gap: 16px; }
  .note { color: var(--muted); font-size: 0.9rem; margin-top: 24px; max-width: 52em; }
</style>
