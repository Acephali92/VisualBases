<script lang="ts">
  import { t, i18n, formatNumber, type Key } from '../lib/i18n.svelte';
  import { flag } from '../lib/taxonomy';
  import { formatCoord } from '../lib/geo';
  import { placeLabel, type GeoPlace } from '../lib/geocode';
  import PlaceChoices from './PlaceChoices.svelte';

  /** the starting point actually used for the distances – shown before the results */
  let { place, input, alternatives = [], onpick }: { place: GeoPlace; input: string; alternatives?: GeoPlace[]; onpick: (p: GeoPlace) => void } = $props();

  const device = $derived(place.source === 'device');
  const precision = $derived(device
    ? t('near.precision.device', { m: formatNumber(Math.round(place.accuracyM ?? 0)) })
    : t(`near.precision.${place.precision}` as Key));
  const osmUrl = $derived(place.osm ? `https://www.openstreetmap.org/${place.osm.type}/${place.osm.id}` : null);
</script>

<section class="where card" aria-live="polite">
  <p class="pre">{device ? t('near.positionDevice') : t('near.position')}</p>
  <p class="label">
    {#if !device}<span aria-hidden="true">{flag(place.countryCode)}</span>{/if}
    <b>{device ? formatCoord(place.lat, place.lon, i18n.lang) : placeLabel(place)}</b>
  </p>
  <p class="meta">
    {place.postcode ? `${t('near.postcode')} ${place.postcode} · ` : ''}{t('near.precision')}: {precision}
  </p>
  {#if place.precision === 'region'}<p class="warn" role="note">⚠ {t('near.regionWarning')}</p>{/if}

  <details class="more">
    <summary>{t('near.details')}</summary>
    <dl>
      {#if !device}<dt>{t('near.input')}</dt><dd>„{input}“</dd>{/if}
      <dt>{t('near.coords')}</dt><dd class="num">{formatCoord(place.lat, place.lon, i18n.lang)}</dd>
      <dt>{t('near.precision')}</dt><dd>{precision}</dd>
      <dt>{t('near.source')}</dt>
      <dd>
        {#if device}{t('near.sourceDevice')}
        {:else}OpenStreetMap Nominatim{#if osmUrl} · <a href={osmUrl} target="_blank" rel="noopener">{place.osm?.type} {place.osm?.id}</a>{/if}
          <br /><small>{place.displayName}</small>
        {/if}
      </dd>
    </dl>
  </details>

  {#if alternatives.length}
    <details class="more alt">
      <summary>{t('near.wrongPlace')} {t('near.otherMatches')} ({alternatives.length})</summary>
      <PlaceChoices options={alternatives} {onpick} />
    </details>
  {/if}
</section>

<style>
  .where { padding: 18px 22px; margin-top: 24px; }
  .pre { color: var(--text-2); margin: 0; font-size: 0.9rem; }
  .label { margin: 4px 0 2px; font-size: 1.25rem; display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
  .meta { margin: 0; color: var(--muted); font-size: 0.9rem; }
  .warn { margin: 10px 0 0; color: #ffd28a; font-size: 0.92rem; }
  .more { margin-top: 10px; font-size: 0.9rem; }
  .more summary { cursor: pointer; color: var(--text-2); }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 14px; margin: 10px 0 0; }
  dt { color: var(--muted); }
  dd { margin: 0; overflow-wrap: anywhere; }
  dd small { color: var(--muted); }
  .num { font-variant-numeric: tabular-nums; }
  .alt :global(.choices) { margin-top: 10px; }
  @media (max-width: 480px) { dl { grid-template-columns: 1fr; } dt { margin-top: 6px; } }
</style>
