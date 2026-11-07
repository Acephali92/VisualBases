import type { Base, Filters, Story } from './types';

export const EMPTY_FILTERS: Filters = { q: '', kinds: [], nations: [], facilities: [], themes: [], continents: [], countries: [] };

const EARTH_RADIUS_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** great-circle distance in km */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface Ranked { base: Base; km: number }

/** bases sorted by distance; aggregated communities (Σ) are skipped by default */
export function nearest(bases: Base[], lat: number, lon: number, limit = 10, includeGroups = false): Ranked[] {
  return bases
    .filter((b) => includeGroups || !b.group)
    .map((base) => ({ base, km: distanceKm(lat, lon, base.lat, base.lon) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

/** lower-case, accent-free text for search */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function matches(b: Base, f: Filters, countryLabel: (cc: string | null) => string = (c) => c ?? ''): boolean {
  if (f.kinds.length && !f.kinds.includes(b.kind)) return false;
  if (f.nations.length && !f.nations.some((n) => b.nations.includes(n))) return false;
  if (f.facilities.length && !f.facilities.some((x) => b.facilities.includes(x))) return false;
  if (f.themes.length && !f.themes.some((x) => b.themes.includes(x))) return false;
  if (f.continents.length && !(b.continent && f.continents.includes(b.continent))) return false;
  if (f.countries.length && !(b.country && f.countries.includes(b.country))) return false;
  const q = fold(f.q.trim());
  if (q) {
    const hay = fold([b.name, b.country ?? '', countryLabel(b.country), b.subregion ?? '', b.usType ?? ''].join(' '));
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

export function countBy<T>(items: T[], key: (t: T) => string | string[] | null | undefined): [string, number][] {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    for (const v of Array.isArray(k) ? k : k ? [k] : []) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function summary(bases: Base[]) {
  const sites = bases.filter((b) => !b.group);
  return {
    locations: sites.length,
    countries: new Set(sites.map((b) => b.country).filter(Boolean)).size,
    us: sites.filter((b) => b.nations.includes('US')).length,
    resistance: bases.filter((b) => b.themes.includes('resistance')).length,
  };
}

/** URL-friendly encoding of filters (for shareable atlas links) */
export function filtersToQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  for (const k of ['kinds', 'nations', 'facilities', 'themes', 'continents', 'countries'] as const) if (f[k].length) p.set(k, f[k].join(','));
  return p.toString();
}

export function queryToFilters(q: string): Filters {
  const p = new URLSearchParams(q);
  const list = (k: string) => (p.get(k) ? p.get(k)!.split(',').filter(Boolean) : []);
  return {
    q: p.get('q') ?? '',
    kinds: list('kinds') as Filters['kinds'],
    nations: list('nations'),
    facilities: list('facilities') as Filters['facilities'],
    themes: list('themes') as Filters['themes'],
    continents: list('continents'),
    countries: list('countries'),
  };
}

export type { Base, Story };
