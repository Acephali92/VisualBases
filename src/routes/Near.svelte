<script lang="ts">
  import { t, tl, countryName, formatNumber, i18n } from '../lib/i18n.svelte';
  import { db } from '../lib/store.svelte';
  import { href } from '../lib/router.svelte';
  import { nearest } from '../lib/data';
  import { GROUP_COLOR, colorGroup, flag } from '../lib/taxonomy';

  let query = $state('');
  let place = $state<{ lat: number; lon: number; label: string } | null>(null);
  let busy = $state(false);
  let error = $state('');
  let imgUrl = $state<string | null>(null);
  let imgBlob: Blob | null = null;

  const ranked = $derived(place && db.status === 'ready' ? nearest(db.bases, place.lat, place.lon, 8) : []);
  const within = $derived(place ? nearest(db.bases, place.lat, place.lon, 9999).filter((r) => r.km <= 250).length : 0);
  const first = $derived(ranked[0]);
  const kmText = (km: number) => formatNumber(km, km < 10 ? 1 : 0);

  async function search(e: SubmitEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    busy = true; error = ''; resetImage();
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=${i18n.lang}&q=${encodeURIComponent(query.trim())}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const json = await res.json();
      if (!json.length) { error = t('near.notFound'); place = null; return; }
      const label = String(json[0].name || json[0].display_name.split(',')[0]);
      place = { lat: +json[0].lat, lon: +json[0].lon, label };
    } catch {
      error = t('near.notFound');
    } finally {
      busy = false;
    }
  }

  function locate() {
    if (!navigator.geolocation) { error = t('near.error'); return; }
    busy = true; error = ''; resetImage();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        place = { lat: pos.coords.latitude, lon: pos.coords.longitude, label: t('near.yourPlace') };
        busy = false;
      },
      () => { error = t('near.error'); busy = false; },
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
        from: place,
        target: first.base,
        km: `${kmText(first.km)} km`,
        headline: t('near.result'),
        subline: `${t('near.from', { place: place.label })} · ${countryName(first.base.host.country)} · ${tl('siteType', first.base.siteType)}`,
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

<div class="near container">
  <header>
    <p class="kicker">📍 {t('nav.near')}</p>
    <h1>{t('near.title')}</h1>
    <p class="lead">{t('near.lead')}</p>
  </header>

  <form class="finder" onsubmit={search}>
    <label class="field">
      <span class="sr-only">{t('near.placeholder')}</span>
      <input type="search" bind:value={query} placeholder={t('near.placeholder')} autocomplete="address-level2" />
    </label>
    <button class="btn btn-primary" type="submit" disabled={busy}>{t('near.search')}</button>
    <button class="btn" type="button" onclick={locate} disabled={busy}>◎ {t('near.locate')}</button>
  </form>
  <p class="privacy">🔒 {t('near.privacy')}</p>
  {#if error}<p class="error" role="alert">{error}</p>{/if}

  {#if first && place}
    <section class="result" aria-live="polite">
      <div class="big card">
        <p class="pre">{t('near.result')}</p>
        <p class="km"><span>{kmText(first.km)}</span> km</p>
        <p class="pre">{t('near.from', { place: place.label })}:</p>
        <a class="target" href={href(`/base/${first.base.id}`)}>
          <span class="dot" class:ring={colorGroup(first.base) === 'aggregate'} style:background={GROUP_COLOR[colorGroup(first.base)]}></span>
          <span><b>{first.base.name}</b><small>{flag(first.base.host.country)} {countryName(first.base.host.country)} · {tl('siteType', first.base.siteType)}</small></span>
          <span class="arrow">→</span>
        </a>
        <p class="within">{t('near.within', { n: within })}</p>
        <div class="share-row">
          <button class="btn btn-primary" onclick={makeImage} disabled={busy}>🖼 {t('near.share')}</button>
        </div>
      </div>

      <div class="more">
        <h2>{t('near.more')}</h2>
        <ol>
          {#each ranked.slice(1) as r (r.base.id)}
            <li>
              <a href={href(`/base/${r.base.id}`)}>
                <span class="dot" class:ring={colorGroup(r.base) === 'aggregate'} style:background={GROUP_COLOR[colorGroup(r.base)]}></span>
                <span class="nm"><b>{r.base.name}</b><small>{flag(r.base.host.country)} {countryName(r.base.host.country)}</small></span>
                <span class="d">{kmText(r.km)} km</span>
              </a>
            </li>
          {/each}
        </ol>
      </div>
    </section>

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
  .field input { width: 100%; min-height: 48px; padding: 0 18px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); outline: none; font-size: 1.05rem; }
  .field input:focus { border-color: var(--focus); }
  .finder .btn { min-height: 48px; }
  .privacy { color: var(--muted); font-size: 0.82rem; margin-top: 10px; }
  .error { color: #ffb4a6; }

  .result { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin-top: 32px; }
  @media (max-width: 760px) { .result { grid-template-columns: 1fr; } }
  .big { padding: 26px; background: linear-gradient(160deg, #1a1420, var(--surface) 60%); border-color: #3a2a30; }
  .pre { color: var(--text-2); margin: 0; }
  .km { white-space: nowrap; font-size: clamp(3.4rem, 7vw, 5.6rem); font-weight: 800; line-height: 1; margin: 0.1em 0 0.15em; letter-spacing: -0.04em; }
  .km span { color: var(--accent); }
  .target { display: flex; align-items: center; gap: 12px; margin: 14px 0; padding: 14px; border-radius: var(--radius-s); background: var(--bg-2); border: 1px solid var(--line); text-decoration: none; }
  .target:hover { border-color: var(--accent); }
  .target b { display: block; font-size: 1.1rem; }
  .target small, .nm small { display: block; color: var(--muted); font-size: 0.82rem; }
  .arrow { margin-left: auto; color: var(--muted); }
  .within { color: var(--text-2); font-size: 0.92rem; }
  .share-row { margin-top: 12px; }

  .more h2 { font-size: 1.1rem; }
  .more ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
  .more a { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: var(--radius-s); text-decoration: none; }
  .more a:hover { background: var(--surface); }
  .nm { flex: 1; min-width: 0; }
  .nm b { font-weight: 600; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .d { color: var(--text-2); font-variant-numeric: tabular-nums; }

  .image-out { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-end; margin-top: 32px; }
  .image-out img { border-radius: 14px; border: 1px solid var(--line); box-shadow: var(--shadow); height: auto; }
  .img-actions { display: flex; flex-direction: column; gap: 10px; }
</style>
