import type { Base, Filters, Story } from './types';
import { ACTIVITY, LEGACY_FILTERS, SITE_TYPE } from './taxonomy';
import { distanceKm } from './geo';

export const EMPTY_FILTERS: Filters = { q: '', kinds: [], status: [], nations: [], facilities: [], themes: [], activities: [], continents: [], countries: [] };
export const FILTER_KEYS = ['kinds', 'status', 'nations', 'facilities', 'themes', 'activities', 'continents', 'countries'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export { distanceKm };

/** summary entries (garrison, region) stand for several sites and are not counted as a site */
export const isAggregate = (b: Pick<Base, 'siteType'>) => SITE_TYPE[b.siteType]?.class === 'aggregate';
/** context site: a state's own site on its own national territory (e.g. US sites with a global role) */
export const isContext = (b: Pick<Base, 'scope'>) => b.scope === 'domestic';

export interface Ranked { base: Base; km: number }

/** bases sorted by distance; summary entries (Σ) are skipped by default */
export function nearest(bases: Base[], lat: number, lon: number, limit = 10, includeGroups = false): Ranked[] {
  return bases
    .filter((b) => includeGroups || !isAggregate(b))
    .map((base) => ({ base, km: distanceKm(lat, lon, base.lat, base.lon) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

/** lower-case, accent-free text for search */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** states whose presence counts as foreign military presence (not the operator on its own soil) */
export const foreignNations = (b: Base) => b.presences.filter((p) => p.relation !== 'domestic').map((p) => p.nation);

/** values of a record for one filter facet */
export function facetValues(b: Base, key: FilterKey): string[] {
  switch (key) {
    case 'kinds': return [b.siteType];
    case 'status': return [b.status];
    case 'nations': return foreignNations(b);
    case 'facilities': return b.features;
    case 'themes': return b.themes;
    case 'activities': return [...new Set([...b.activities.map((a) => ACTIVITY[a]?.group ?? a), ...b.organisations])];
    case 'continents': return b.continent ? [b.continent] : [];
    case 'countries': return [b.host.country, b.host.territory].filter((x): x is string => !!x);
  }
}

/** facets are combined with AND, values within a facet with OR */
export function matches(b: Base, f: Filters, countryLabel: (cc: string | null) => string = (c) => c ?? ''): boolean {
  for (const key of FILTER_KEYS) {
    const want = f[key] as string[];
    if (want.length && !facetValues(b, key).some((v) => want.includes(v))) return false;
  }
  const q = fold(f.q.trim());
  if (q) {
    const hay = fold([b.name, ...(b.altNames ?? []), b.host.country ?? '', b.host.territory ?? '', countryLabel(b.host.country), b.host.territory ? countryLabel(b.host.territory) : '', b.subregion ?? '', b.usPosture ?? ''].join(' '));
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

export function countBy<T>(items: T[], key: (t: T) => string | string[] | null | undefined): [string, number][] {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    for (const v of new Set(Array.isArray(k) ? k : k ? [k] : [])) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/**
 * Number of records per value of a facet, given all other active filters (the facet's own selection
 * is ignored), so that a count says how many results a click on the chip adds.
 */
export function facetCounts(bases: Base[], f: Filters, key: FilterKey, countryLabel?: (cc: string | null) => string): Map<string, number> {
  const others = { ...f, [key]: [] } as Filters;
  return new Map(countBy(bases.filter((b) => matches(b, others, countryLabel)), (b) => facetValues(b, key)));
}

export function summary(bases: Base[]) {
  const sites = bases.filter((b) => !isAggregate(b));
  return {
    locations: sites.length,
    countries: new Set(sites.map((b) => b.host.country).filter(Boolean)).size,
    us: sites.filter((b) => foreignNations(b).includes('US')).length,
    resistance: bases.filter((b) => b.themes.includes('resistance')).length,
  };
}

/** URL-friendly encoding of filters (for shareable atlas links) */
export function filtersToQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  for (const k of FILTER_KEYS) if (f[k].length) p.set(k, f[k].join(','));
  return p.toString();
}

/** parses atlas links, including links with the filter values of the old classification (v1) */
export function queryToFilters(q: string): Filters {
  const p = new URLSearchParams(q);
  const f: Filters = { ...EMPTY_FILTERS, q: p.get('q') ?? '' };
  for (const k of FILTER_KEYS) {
    for (const v of (p.get(k) ?? '').split(',').filter(Boolean)) {
      const legacy = LEGACY_FILTERS[k]?.[v];
      const target = legacy?.key ?? k;
      for (const x of legacy?.values ?? [v]) if (!(f[target] as string[]).includes(x)) (f[target] as string[]) = [...(f[target] as string[]), x];
    }
  }
  return f;
}

export type { Base, Story };
