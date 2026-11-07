<script lang="ts">
  import { t, countryName, formatNumber } from '../lib/i18n.svelte';
  import { db } from '../lib/store.svelte';
  import { href } from '../lib/router.svelte';
  import { countBy, summary } from '../lib/data';
  import { flag } from '../lib/taxonomy';
  import BarChart from '../components/BarChart.svelte';

  const sites = $derived(db.bases.filter((b) => !b.group));
  const s = $derived(summary(db.bases));

  const byCountry = $derived(countBy(sites, (b) => b.country).map(([k, v]) => ({ label: `${flag(k)} ${countryName(k)}`, value: v, href: href('/atlas', `countries=${k}`) })));
  const byNation = $derived(countBy(sites, (b) => b.nations).map(([k, v]) => ({ label: `${flag(k)} ${countryName(k)}`, value: v, href: href('/atlas', `nations=${k}`) })));
  const byKind = $derived(countBy(sites, (b) => b.kind).map(([k, v]) => ({ label: t(`kind.${k}` as never), value: v, href: href('/atlas', `kinds=${k}`) })));
  const byFac = $derived(countBy(sites, (b) => b.facilities).map(([k, v]) => ({ label: t(`fac.${k}` as never), value: v, href: href('/atlas', `facilities=${k}`) })));
  const byTheme = $derived(countBy(db.bases, (b) => b.themes).map(([k, v]) => ({ label: t(`theme.${k}` as never), value: v, href: href('/atlas', `themes=${k}`) })));
  const byCont = $derived(countBy(sites, (b) => b.continent).map(([k, v]) => ({ label: t(`cont.${k}` as never), value: v, href: href('/atlas', `continents=${k}`) })));
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
      <BarChart title={t('stats.byTheme')} rows={byTheme} />
      <BarChart title={t('stats.byContinent')} rows={byCont} />
    </div>
    <p class="note">ⓘ {t('stats.note')}</p>
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
