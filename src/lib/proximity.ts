/**
 * "Your base" (#/near): which records count as foreign military sites, and their great-circle
 * distance from a point. Pure functions; the map view and the list only display the result.
 *
 * Rule (documented in docs/TAXONOMY.md, "Deine Basis"), based only on existing fields:
 *   - summary entries (garrison, region) are not sites                          → excluded
 *   - scope 'domestic' (a state on its own territory, context site)              → excluded
 *   - scope 'overseas' (base in the stationing state's own overseas territory)   → excluded
 *   - scope 'foreign' (at least one presence with relation 'foreign')            → included
 *   - scope 'unknown' (no presence documented): only military site types that by definition
 *     involve foreign use, never civilian sites, never 'out-of-scope-candidate' → included, uncertain
 *   - status 'closed' only on request
 *   - records without valid coordinates                                          → excluded, counted
 */
import type { Base, SiteType } from './types';
import { foreignNations, isAggregate } from './data';
import { distanceKm, isValidCoord } from './geo';

export interface NearOptions {
  includeClosed?: boolean;
}

export type Exclusion = 'aggregate' | 'domestic' | 'overseas' | 'unknown-scope' | 'closed' | 'invalid-coords';
export const EXCLUSIONS: Exclusion[] = ['aggregate', 'domestic', 'overseas', 'unknown-scope', 'closed', 'invalid-coords'];

/** military site types whose definition implies foreign use (taxonomy) – used when no nation is documented */
const FOREIGN_USE_TYPES: SiteType[] = ['foreign-base', 'shared-base', 'host-base-foreign-use'];
/** site types where the source does not state the form of use */
const USE_UNSPECIFIED: SiteType[] = ['military-base', 'unspecified'];

export type UncertainReason = 'nation-undocumented' | 'use-unspecified';
export interface Certainty {
  certainty: 'documented' | 'uncertain';
  reasons: UncertainReason[];
}

/** why a record is not a candidate, or null if it is one */
export function nearExclusion(b: Base, opts: NearOptions = {}): Exclusion | null {
  if (isAggregate(b)) return 'aggregate';
  if (b.scope === 'domestic') return 'domestic';
  if (b.scope === 'overseas') return 'overseas';
  if (b.scope !== 'foreign') {
    if (!FOREIGN_USE_TYPES.includes(b.siteType) || (b.issues ?? []).includes('out-of-scope-candidate')) return 'unknown-scope';
  }
  if (b.status === 'closed' && !opts.includeClosed) return 'closed';
  if (!isValidCoord(b.lat, b.lon)) return 'invalid-coords';
  return null;
}

export const isNearCandidate = (b: Base, opts: NearOptions = {}) => nearExclusion(b, opts) === null;

export function certaintyOf(b: Base): Certainty {
  const reasons: UncertainReason[] = [];
  if (b.scope !== 'foreign') reasons.push('nation-undocumented');
  if (USE_UNSPECIFIED.includes(b.siteType)) reasons.push('use-unspecified');
  return { certainty: reasons.length ? 'uncertain' : 'documented', reasons };
}

export interface NearStats {
  total: number;
  included: number;
  excluded: Record<Exclusion, number>;
}

export function nearPool(bases: Base[], opts: NearOptions = {}): { pool: Base[]; stats: NearStats } {
  const excluded = Object.fromEntries(EXCLUSIONS.map((e) => [e, 0])) as Record<Exclusion, number>;
  const pool: Base[] = [];
  for (const b of bases) {
    const why = nearExclusion(b, opts);
    if (why) excluded[why]++;
    else pool.push(b);
  }
  return { pool, stats: { total: bases.length, included: pool.length, excluded } };
}

export interface Origin {
  lat: number;
  lon: number;
}

export interface RankedSite extends Certainty {
  base: Base;
  /** great-circle distance in km, unrounded – exactly the value that is displayed (rounded) */
  km: number;
  rank: number;
  /** foreign stationing nations / co-users (ISO alpha-2); empty if not documented */
  nations: string[];
  /** quality of the stored coordinate: approx = geocoded by hand, unverified = doubtful (data/corrections.json) */
  position: 'source' | 'approx' | 'unverified';
}

/** all candidates with distance, sorted ascending (ties by id); limit only the result of this */
export function rankByDistance(pool: Base[], origin: Origin): RankedSite[] {
  if (!isValidCoord(origin.lat, origin.lon)) throw new RangeError(`invalid origin ${origin.lat},${origin.lon}`);
  return pool
    .map((base) => ({ base, km: distanceKm(origin.lat, origin.lon, base.lat, base.lon) }))
    .filter((r) => Number.isFinite(r.km))
    .sort((a, b) => a.km - b.km || (a.base.id < b.base.id ? -1 : a.base.id > b.base.id ? 1 : 0))
    .map((r, i) => ({
      ...r,
      ...certaintyOf(r.base),
      rank: i + 1,
      nations: foreignNations(r.base),
      position: r.base.positionCheck?.status === 'proposed' ? 'unverified' : r.base.approx ? 'approx' : 'source',
    }));
}

/** classification + complete ranking in one step */
export function findNearest(bases: Base[], origin: Origin, opts: NearOptions = {}): { ranked: RankedSite[]; stats: NearStats } {
  const { pool, stats } = nearPool(bases, opts);
  return { ranked: rankByDistance(pool, origin), stats };
}
