/** Open-data exports of the resolved records (GeoJSON, CSV). */
import { FEATURE } from '../../src/lib/taxonomy.ts';

export function toGeoJSON(bases, attribution) {
  return {
    type: 'FeatureCollection',
    metadata: {
      title: 'VisualBases – foreign military bases worldwide',
      schema: 'visualbases-taxonomy-v2',
      taxonomy: 'taxonomy.json (IDs, labels de/en, definitions) – docs/TAXONOMY.md',
      license: 'CC-BY-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      attribution,
      note: 'Images are not covered by this licence; see LICENSE.txt.',
      generated: new Date().toISOString().slice(0, 10),
      count: bases.length,
    },
    features: bases.map(({ lat, lon, images, ...props }) => ({
      type: 'Feature',
      id: props.id,
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: props,
    })),
  };
}

/**
 * where the published coordinate comes from: a position claim, the post's text or Google Earth link,
 * a hand geocoding in the importer (posts without any map link), or the post's map link
 */
export function positionFrom(b) {
  if ((b.corrections ?? []).some((c) => c.field === 'position')) return 'claim';
  if (b.positionFrom) return b.positionFrom;
  if (b.approx && !b.positionCheck?.precision) return 'manual';
  return 'map-link';
}

/** one row per record; lists are separated by ";" */
export const CSV_COLUMNS = {
  id: (b) => b.id,
  name: (b) => b.name,
  host_country: (b) => b.host.country,
  host_territory: (b) => b.host.territory,
  lat: (b) => b.lat,
  lon: (b) => b.lon,
  site_type: (b) => b.siteType,
  status: (b) => b.status,
  scope: (b) => b.scope,
  stationing_nations: (b) => b.presences.filter((p) => p.role === 'stationing').map((p) => p.nation),
  co_users: (b) => b.presences.filter((p) => p.role === 'co-user').map((p) => p.nation),
  organisations: (b) => b.organisations,
  infrastructure: (b) => b.features.filter((f) => FEATURE[f].kind === 'infrastructure'),
  civil_use: (b) => b.features.filter((f) => FEATURE[f].kind === 'civil-use'),
  functions: (b) => b.features.filter((f) => FEATURE[f].kind === 'function'),
  arrangements: (b) => b.features.filter((f) => FEATURE[f].kind === 'arrangement'),
  themes: (b) => b.themes,
  activities: (b) => b.activities,
  us_posture: (b) => b.usPosture,
  listed_in: (b) => b.listedIn,
  continent: (b) => b.continent,
  region: (b) => b.region,
  subregion: (b) => b.subregion,
  period_from: (b) => b.period?.from,
  period_to: (b) => b.period?.to,
  evidence: (b) => Object.entries(b.evidence ?? {}).map(([k, v]) => `${k}:${v}`),
  corrections: (b) => (b.corrections ?? []).map((c) => c.id),
  issues: (b) => b.issues,
  wikipedia_en: (b) => b.wikipedia?.en,
  position_check: (b) => (b.positionCheck?.status === 'proposed' ? `unverified:${b.positionCheck.issue}` : b.approx ? 'approximate' : ''),
  position_precision: (b) => b.positionPrecision,
  position_from: (b) => positionFrom(b),
  origin: (b) => b.origin.url,
  lastmod: (b) => b.origin.lastmod,
  last_checked: (b) => b.lastChecked,
};
const esc = (v) => {
  const s = v == null ? '' : Array.isArray(v) ? v.join(';') : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function toCsv(bases) {
  const csv = [Object.keys(CSV_COLUMNS).join(','), ...bases.map((b) => Object.values(CSV_COLUMNS).map((f) => esc(f(b))).join(','))].join('\n');
  return '\ufeff' + csv + '\n';
}
