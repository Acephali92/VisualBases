<script lang="ts">
  import { t, tl, countryName, formatNumber, i18n, type Key } from '../lib/i18n.svelte';
  import { db } from '../lib/store.svelte';
  import { href } from '../lib/router.svelte';
  import { findNearest, type RankedSite } from '../lib/proximity';
  import { createGeocoder, loadGeocoderConfig, placeLabel, placeShort, type GeoPlace } from '../lib/geocode';
  import { GROUP_COLOR, colorGroup, flag } from '../lib/taxonomy';
  import type { Base } from '../lib/types';
  import ResolvedPlace from '../components/ResolvedPlace.svelte';
  import PlaceChoices from '../components/PlaceChoices.svelte';
  import NearMap from '../components/NearMap.svelte';

  /** countries offered in the selector (any other country still works through the free text, e.g. "1010, Österreich") */
  const COUNTRY_CHOICES = ['DE', 'AT', 'CH', 'FR', 'IT', 'ES', 'PT', 'NL', 'BE', 'LU', 'GB', 'IE', 'DK', 'SE', 'NO', 'FI', 'PL', 'CZ', 'GR', 'TR', 'US', 'CA', 'JP', 'KR', 'AU'];
  const COUNTRY_KEY = 'vb-near-country';
  const SHOWN = 10;
  const RADIUS_KM = 250;

  let query = $state('');
  let country = $state(readCountry());
  let includeClosed = $state(false);
  let searched = $state('');
  let place = $state<GeoPlace | null>(null);
  let alternatives = $state<GeoPlace[]>([]);
  let options = $state<GeoPlace[]>([]);
  let busy = $state(false);
  let error = $state('');
  let imgUrl = $state<string | null>(null);
  let imgBlob: Blob | null = null;
  let seq = 0;

  const countryOptions = $derived(COUNTRY_CHOICES.map((cc) => ({ cc, name: countryName(cc) })).sort((a, b) => a.name.localeCompare(b.name, i18n.lang)));

  // complete ranking of every candidate in the full dataset; only the display is limited
  const result = $derived(place && db.status === 'ready' ? findNearest(db.bases, place, { includeClosed }) : null);
  const ranked = $derived(result ? result.ranked.slice(0, SHOWN) : []);
  const within = $derived(result ? result.ranked.filter((r) => r.km <= RADIUS_KM).length : 0);
  const first = $derived(ranked[0]);
  const kmText = (km: number) => formatNumber(km, km < 10 ? 1 : 0);
  const placeName = $derived(place ? (place.source === 'device' ? t('near.yourPlace') : placeShort(place)) : '');
  const headline = (r: RankedSite) => (r.base.siteType === 'civilian-site' || r.certainty === 'uncertain' ? t('near.resultSite') : t('near.result'));
  const hostName = (b: Base) => (b.host.territory ? `${countryName(b.host.territory)} (${countryName(b.host.country)})` : countryName(b.host.country));

  function readCountry(): string {
    try { return localStorage.getItem(COUNTRY_KEY) ?? ''; } catch { return ''; }
  }
  function saveCountry() {
    try { localStorage.setItem(COUNTRY_KEY, country); } catch { /* private mode */ }
  }

  let geocoder: ReturnType<typeof createGeocoder> | null = null;
  async function getGeocoder() {
    geocoder ??= createGeocoder(await loadGeocoderConfig());
    return geocoder;
  }

  async function search(e: SubmitEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const my = ++seq;
    busy = true; error = ''; options = []; resetImage();
    try {
      const r = await (await getGeocoder()).search(q, { lang: i18n.lang, countryCode: country || null });
      if (my !== seq || r.kind === 'aborted') return;
      searched = q;
      // whatever happens, a previous position must not stay on screen for a new input
      place = null; alternatives = [];
      if (r.kind === 'unique') { place = r.place; alternatives = r.alternatives; }
      else if (r.kind === 'ambiguous') options = r.options;
      else if (r.kind === 'not-found') error = t('near.notFound', { q });
      else if (r.kind === 'too-coarse') error = t('near.tooCoarse', { q });
      else error = t(`near.err.${r.code}` as Key);
    } finally {
      if (my === seq) busy = false;
    }
  }

  function pick(p: GeoPlace) {
    const others = [...options, ...alternatives, ...(place ? [place] : [])].filter((x) => x !== p);
    place = p;
    alternatives = others;
    options = [];
    error = '';
    resetImage();
  }

  function locate() {
    if (!navigator.geolocation) { error = t('near.error'); return; }
    const my = ++seq;
    busy = true; error = ''; options = []; resetImage();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (my !== seq) return;
        place = {
          lat: pos.coords.latitude, lon: pos.coords.longitude, name: t('near.yourPlace'), precision: 'address',
          displayName: '', source: 'device', accuracyM: pos.coords.accuracy,
        };
        alternatives = []; searched = '';
        busy = false;
      },
      (err) => {
        if (my !== seq) return;
        error = err.code === err.PERMISSION_DENIED ? t('near.errorDenied') : t('near.error');
        busy = false;
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  function resetImage() {
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    imgUrl = null; imgBlob = null;
  }

  async function makeImage() {
    if (!first || !place) return;
    busy = true;
    resetImage();
    try {
      const [{ loadCountries }, { renderShareImage }] = await Promise.all([import('../lib/map'), import('../lib/shareImage')]);
      const countries = await loadCountries('110m');
      const blob = await renderShareImage({
        bases: db.bases,
        countries,
        from: { lat: place.lat, lon: place.lon, label: placeName },
        target: first.base,
        km: `${kmText(first.km)} km`,
        headline: headline(first),
        subline: `${t('near.from', { place: placeName })} · ${t('near.crow')} · ${countryName(first.base.host.country)} · ${tl('siteType', first.base.siteType)}`,
        footer: t('share.caption'),
      });
      imgBlob = blob;
      imgUrl = URL.createObjectURL(blob);
    } finally {
      busy = false;
    }
  }

  async function shareImage() {
    if (!imgBlob || !first) return;
    const file = new File([imgBlob], 'visualbases.png', { type: 'image/png' });
    const text = t('near.shareText', { km: kmText(first.km), base: first.base.name });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text, url: location.origin + location.pathname }); } catch { /* cancelled */ }
    }
  }
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.canShare;
</script>

{#snippet badges(r: RankedSite)}
  {#if r.base.status === 'closed'}<span class="tag">{t('near.closed')}</span>{/if}
  {#each r.reasons as why (why)}<span class="tag warn">⚠ {t(`near.uncertain.${why}` as Key)}</span>{/each}
  {#if r.base.siteType === 'civilian-site'}<span class="tag">{t('near.civilian')}</span>{/if}
  {#if r.position === 'approx'}<span class="tag">≈ {t('base.approx')}</span>{/if}
  {#if r.position === 'unverified'}<span class="tag warn">⚠ {t('base.positionUnverified')}</span>{/if}
{/snippet}

{#snippet nations(r: RankedSite)}
  {t('near.nations')}: {#if r.nations.length}{r.nations.map((n) => `${flag(n)} ${countryName(n)}`).join(', ')}{:else}<i>{t('near.nationUnknown')}</i>{/if}
{/snippet}

<div class="near container">
  <header>
    <p class="kicker">📍 {t('nav.near')}</p>
    <h1>{t('near.title')}</h1>
    <p class="lead">{t('near.lead')}</p>
  </header>

  <form class="finder" onsubmit={search}>
    <label class="field">
      <span class="sr-only">{t('near.placeholder')}</span>
      <input type="search" name="place" bind:value={query} placeholder={t('near.placeholder')} autocomplete="postal-code" enterkeyhint="search" />
    </label>
    <label class="country">
      <span class="sr-only">{t('near.country')}</span>
      <select name="country" bind:value={country} onchange={saveCountry}>
        <option value="">🌐 {t('near.anyCountry')}</option>
        {#each countryOptions as c (c.cc)}<option value={c.cc}>{flag(c.cc)} {c.name}</option>{/each}
      </select>
    </label>
    <button class="btn btn-primary" type="submit" disabled={busy}>{busy ? t('near.searching') : t('near.search')}</button>
    <button class="btn" type="button" onclick={locate} disabled={busy}>◎ {t('near.locate')}</button>
  </form>
  <p class="privacy">🔒 {t('near.privacy')} <span class="osm">{t('near.osm')}</span></p>
  {#if error}<p class="error" role="alert">{error}</p>{/if}

  {#if options.length}
    <section class="choose card" aria-live="polite">
      <h2>{t('near.chooseTitle', { q: searched })}</h2>
      <p class="pre">{t('near.chooseLead')}</p>
      <PlaceChoices {options} onpick={pick} />
    </section>
  {/if}

  {#if place}
    <ResolvedPlace {place} input={searched} {alternatives} onpick={pick} />
  {/if}

  {#if first && place && result}
    <section class="result" aria-live="polite">
      <div class="big card">
        <p class="pre">{headline(first)}</p>
        <p class="km"><span>{kmText(first.km)}</span> km</p>
        <p class="pre">{t('near.crow')} · {t('near.from', { place: placeName })}:</p>
        <a class="target" href={href(`/base/${first.base.id}`)}>
          <span class="dot" class:ring={colorGroup(first.base) === 'aggregate'} style:background={GROUP_COLOR[colorGroup(first.base)]}></span>
          <span>
            <b>{first.base.name}</b>
            <small>{t('near.host')}: {flag(first.base.host.country)} {hostName(first.base)} · {tl('siteType', first.base.siteType)}</small>
            <small>{@render nations(first)}</small>
          </span>
          <span class="arrow">→</span>
        </a>
        <div class="badges">{@render badges(first)}</div>
        <p class="within">{t('near.within', { n: within })}</p>
        <div class="share-row">
          <button class="btn btn-primary" onclick={makeImage} disabled={busy}>🖼 {t('near.share')}</button>
        </div>
      </div>

      <div class="more">
        <h2>{t('near.more')}</h2>
        <ol class="ranking">
          {#each ranked as r (r.base.id)}
            <li data-id={r.base.id} data-km={r.km} class:first={r.rank === 1}>
              <a href={href(`/base/${r.base.id}`)}>
                <span class="rank" aria-label={t('near.rank')}>{r.rank}</span>
                <span class="dot" class:ring={colorGroup(r.base) === 'aggregate'} style:background={GROUP_COLOR[colorGroup(r.base)]}></span>
                <span class="nm">
                  <b>{r.base.name}</b>
                  <small>{flag(r.base.host.country)} {hostName(r.base)} · {tl('siteType', r.base.siteType)}</small>
                  <small>{@render nations(r)}</small>
                  {#if r.base.status === 'closed' || r.reasons.length || r.position !== 'source' || r.base.siteType === 'civilian-site'}<span class="badges">{@render badges(r)}</span>{/if}
                </span>
                <span class="d"><span class="v">{kmText(r.km)}</span> km</span>
              </a>
            </li>
          {/each}
        </ol>
      </div>
    </section>

    <label class="closed-toggle"><input type="checkbox" bind:checked={includeClosed} /> {t('near.includeClosed')}</label>

    <NearMap origin={place} sites={ranked} />

    <details class="explain">
      <summary>{t('near.accuracyTitle')}</summary>
      <p>{t('near.accuracyMath')}</p>
      <p>{t('near.accuracyOrigin', { what: place.source === 'device' ? t('near.precision.device', { m: formatNumber(Math.round(place.accuracyM ?? 0)) }) : `${placeLabel(place)} – ${t(`near.precision.${place.precision}` as Key)}` })}</p>
      <p>{t('near.accuracySites')}</p>
      <p class="counted">{t('near.counted', { n: result.stats.included, total: result.stats.total })}</p>
      <p class="counted">{t('near.countedDetail', {
        aggregate: result.stats.excluded.aggregate, domestic: result.stats.excluded.domestic, overseas: result.stats.excluded.overseas,
        unknown: result.stats.excluded['unknown-scope'], closed: result.stats.excluded.closed, invalid: result.stats.excluded['invalid-coords'],
      })}</p>
    </details>

    {#if imgUrl}
      <section class="image-out">
        <img src={imgUrl} alt={t('near.shareText', { km: kmText(first.km), base: first.base.name })} width="270" height="480" />
        <div class="img-actions">
          {#if canNativeShare}<button class="btn btn-primary" onclick={shareImage}>↗ {t('share.native')}</button>{/if}
          <a class="btn" href={imgUrl} download="visualbases-{first.base.id}.png">⬇ {t('share.download')}</a>
        </div>
      </section>
    {/if}
  {/if}
</div>

<style>
  .near { padding: calc(var(--header-h) + 48px) 0 64px; max-width: 860px; }
  h1 { font-size: clamp(1.9rem, 4.5vw, 3rem); font-weight: 800; text-wrap: balance; }
  .lead { color: var(--text-2); font-size: 1.1rem; }
  .finder { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
  .field { flex: 1 1 260px; }
  .field input, .country select { width: 100%; min-height: 48px; padding: 0 18px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); outline: none; font-size: 1.05rem; color: inherit; font-family: inherit; }
  .country { flex: 0 1 200px; }
  .country select { padding: 0 14px; font-size: 0.98rem; }
  .field input:focus, .country select:focus { border-color: var(--focus); }
  .finder .btn { min-height: 48px; }
  .privacy { color: var(--muted); font-size: 0.82rem; margin-top: 10px; }
  .osm { white-space: nowrap; }
  .error { color: #ffb4a6; }

  .choose { padding: 20px 22px; margin-top: 24px; }
  .choose h2 { font-size: 1.15rem; margin: 0 0 4px; }
  .choose .pre { margin-bottom: 14px; }

  .result { display: grid; grid-template-columns: 1.15fr 1fr; gap: 20px; margin-top: 24px; }
  /* grid items default to min-width:auto and would grow with long badges on phones */
  .result > * { min-width: 0; }
  @media (max-width: 760px) { .result { grid-template-columns: 1fr; } }
  .big { align-self: start; padding: 26px; background: linear-gradient(160deg, #1a1420, var(--surface) 60%); border-color: #3a2a30; }
  .pre { color: var(--text-2); margin: 0; }
  .km { white-space: nowrap; font-size: clamp(3.4rem, 7vw, 5.6rem); font-weight: 800; line-height: 1; margin: 0.1em 0 0.15em; letter-spacing: -0.04em; }
  .km span { color: var(--accent); }
  .target { display: flex; align-items: center; gap: 12px; margin: 14px 0 8px; padding: 14px; border-radius: var(--radius-s); background: var(--bg-2); border: 1px solid var(--line); text-decoration: none; }
  .target:hover { border-color: var(--accent); }
  .target > span:not(.dot):not(.arrow) { min-width: 0; overflow-wrap: anywhere; }
  .target b { display: block; font-size: 1.1rem; }
  .target small, .nm small { display: block; color: var(--muted); font-size: 0.82rem; }
  .arrow { margin-left: auto; color: var(--muted); }
  .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .badges :global(.tag) { white-space: normal; max-width: 100%; }
  .tag.warn { color: #ffd28a; border-color: #5a4a2a; }
  .within { color: var(--text-2); font-size: 0.92rem; }
  .share-row { margin-top: 12px; }

  .more h2 { font-size: 1.1rem; }
  .ranking { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 2px; }
  .ranking a { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: var(--radius-s); text-decoration: none; }
  .ranking a:hover { background: var(--surface); }
  .ranking li.first a { background: var(--bg-2); }
  .rank { flex: none; width: 1.7em; text-align: right; color: var(--muted); font-variant-numeric: tabular-nums; font-weight: 700; }
  .nm { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .nm b { font-weight: 600; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nm .badges :global(.tag) { font-size: 0.72rem; }
  .d { color: var(--text-2); font-variant-numeric: tabular-nums; white-space: nowrap; }

  .closed-toggle { display: flex; align-items: center; gap: 8px; margin-top: 18px; color: var(--text-2); font-size: 0.92rem; cursor: pointer; }
  .explain { margin-top: 20px; color: var(--text-2); font-size: 0.9rem; }
  .explain summary { cursor: pointer; }
  .explain p { margin: 8px 0 0; max-width: 70ch; }
  .counted { color: var(--muted); }

  .image-out { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-end; margin-top: 32px; }
  .image-out img { border-radius: 14px; border: 1px solid var(--line); box-shadow: var(--shadow); height: auto; }
  .img-actions { display: flex; flex-direction: column; gap: 10px; }
</style>
