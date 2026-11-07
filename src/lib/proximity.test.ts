import { describe, expect, it } from 'vitest';
import { certaintyOf, findNearest, isNearCandidate, nearExclusion, nearPool, rankByDistance } from './proximity';
import { distanceKm } from './geo';
import { isAggregate } from './data';
import type { Base } from './types';
import { resolved } from './fixtures';
// @ts-expect-error – plain ESM build script without type declarations
import { resolveBases } from '../../scripts/lib/resolve.mjs';
import sourceBases from '../../data/bases.json';
import claimsFile from '../../data/claims.json';
import researchSources from '../../data/research/sources.json';
import corrections from '../../data/corrections.json';

const US_ABROAD = [{ nation: 'US', role: 'stationing', via: 'tag', relation: 'foreign' }] as Base['presences'];
const site = (id: string, lat: number, lon: number, p: Partial<Base> = {}) => resolved({ id, name: id, lat, lon, presences: US_ABROAD, ...p });

describe('classification: which records count as foreign military sites', () => {
  it('includes a site with at least one foreign presence', () => {
    expect(isNearCandidate(site('a', 50, 8))).toBe(true);
    // US site on US soil, co-used by the UK (Creech): counts because of the foreign (UK) presence
    const creech = site('creech', 36.6, -115.7, { host: { country: 'US' }, siteType: 'domestic-global', scope: 'foreign', presences: [
      { nation: 'US', role: 'stationing', via: 'site-type', relation: 'domestic' }, { nation: 'GB', role: 'co-user', via: 'tag', relation: 'foreign' }] });
    expect(isNearCandidate(creech)).toBe(true);
  });
  it('excludes national (context) sites: a state on its own territory', () => {
    const own = site('lualualei', 21.4, -158.1, { host: { country: 'US' }, siteType: 'domestic-global', scope: 'domestic', presences: [{ nation: 'US', role: 'stationing', via: 'site-type', relation: 'domestic' }] });
    expect(nearExclusion(own)).toBe('domestic');
    // the site type says "foreign-base", but nation = host country → not foreign
    const pratas = site('pratas', 20.7, 116.7, { host: { country: 'CN' }, siteType: 'foreign-base', scope: 'domestic', presences: [{ nation: 'CN', role: 'stationing', via: 'tag', relation: 'domestic' }] });
    expect(nearExclusion(pratas)).toBe('domestic');
  });
  it('excludes bases in the stationing state’s own overseas territory', () => {
    const guam = site('guam', 13.4, 144.7, { host: { country: 'US', territory: 'GU' }, siteType: 'overseas-base', scope: 'overseas', presences: [{ nation: 'US', role: 'stationing', via: 'tag', relation: 'own-territory' }] });
    expect(nearExclusion(guam)).toBe('overseas');
  });
  it('excludes summary entries (garrison, region)', () => {
    expect(nearExclusion(site('g', 50, 8, { siteType: 'garrison' }))).toBe('aggregate');
    expect(nearExclusion(site('r', 50, 8, { siteType: 'region-cluster' }))).toBe('aggregate');
  });
  it('without a documented nation: only military types with foreign use, marked uncertain', () => {
    const shared = site('bergen', 52.8, 9.9, { siteType: 'host-base-foreign-use', scope: 'unknown', presences: [] });
    expect(isNearCandidate(shared)).toBe(true);
    expect(certaintyOf(shared)).toEqual({ certainty: 'uncertain', reasons: ['nation-undocumented'] });
    // a civilian facility without a documented foreign presence never appears
    expect(nearExclusion(site('airport', 50, 8, { siteType: 'civilian-site', scope: 'unknown', presences: [] }))).toBe('unknown-scope');
    expect(nearExclusion(site('u', 50, 8, { siteType: 'unspecified', scope: 'unknown', presences: [] }))).toBe('unknown-scope');
    expect(nearExclusion(site('ayanganna', 6.8, -58.1, { siteType: 'shared-base', scope: 'unknown', presences: [], issues: ['out-of-scope-candidate'] }))).toBe('unknown-scope');
  });
  it('marks records whose form of use is not stated as uncertain', () => {
    expect(certaintyOf(site('m', 50, 8, { siteType: 'military-base' }))).toEqual({ certainty: 'uncertain', reasons: ['use-unspecified'] });
    expect(certaintyOf(site('x', 50, 8, { siteType: 'unspecified' })).certainty).toBe('uncertain');
    expect(certaintyOf(site('f', 50, 8)).certainty).toBe('documented');
  });
  it('closed sites are excluded by default and included on request', () => {
    const closed = site('closed', 50, 8, { status: 'closed' });
    expect(nearExclusion(closed)).toBe('closed');
    expect(isNearCandidate(closed, { includeClosed: true })).toBe(true);
  });
  it('excludes records with invalid coordinates and counts them', () => {
    const bad = [site('nan', NaN, 8), site('range', 95, 8), site('str', '50' as unknown as number, 8)];
    for (const b of bad) expect(nearExclusion(b)).toBe('invalid-coords');
    const { stats, pool } = nearPool([...bad, site('ok', 50, 8)]);
    expect(pool.map((b) => b.id)).toEqual(['ok']);
    expect(stats).toMatchObject({ total: 4, included: 1, excluded: { 'invalid-coords': 3 } });
  });
});

describe('ranking', () => {
  it('sorts the complete pool ascending by distance', () => {
    const pool = [site('far', 0, 60), site('near', 0, 1), site('mid', 0, 20)];
    const r = rankByDistance(pool, { lat: 0, lon: 0 });
    expect(r.map((x) => x.base.id)).toEqual(['near', 'mid', 'far']);
    expect(r.map((x) => x.rank)).toEqual([1, 2, 3]);
    for (let i = 1; i < r.length; i++) expect(r[i].km).toBeGreaterThanOrEqual(r[i - 1].km);
  });
  it('the displayed distance is exactly the computed great-circle distance', () => {
    const [r] = rankByDistance([site('x', 49.44, 7.6)], { lat: 50.11, lon: 8.68 });
    expect(r.km).toBe(distanceKm(50.11, 8.68, 49.44, 7.6));
  });
  it('a closer site is never lost by limiting the result (limit applies after sorting)', () => {
    const many = Array.from({ length: 200 }, (_, i) => site(`s${i}`, 10 + i * 0.1, 10));
    const closest = site('closest', 0.01, 0.01);
    const { ranked } = findNearest([...many, closest], { lat: 0, lon: 0 });
    expect(ranked).toHaveLength(201);
    expect(ranked.slice(0, 5)[0].base.id).toBe('closest');
  });
  it('considers sites anywhere in the world (no map viewport involved)', () => {
    const world = [site('europe', 50, 8), site('pacific', -14, -170), site('date-line', 0, 179.9), site('south', -77, 166)];
    expect(findNearest(world, { lat: 0, lon: -179.9 }).ranked[0].base.id).toBe('date-line');
    expect(findNearest(world, { lat: -60, lon: 170 }).ranked[0].base.id).toBe('south');
  });
  it('ties are broken by id, so the order is stable', () => {
    const r = rankByDistance([site('b', 0, 1), site('a', 0, -1), site('c', 1, 0)], { lat: 0, lon: 0 });
    expect(r.map((x) => x.base.id)).toEqual(['a', 'b', 'c']);
  });
  it('rejects an invalid origin instead of computing distances from it', () => {
    expect(() => rankByDistance([site('a', 0, 0)], { lat: NaN, lon: 0 })).toThrow();
    expect(() => rankByDistance([site('a', 0, 0)], { lat: 0, lon: 200 })).toThrow();
  });
  it('national, overseas and summary entries never appear, even when they are the closest', () => {
    const bases = [
      site('own', 0, 0.1, { host: { country: 'US' }, siteType: 'domestic-global', scope: 'domestic', presences: [{ nation: 'US', role: 'stationing', via: 'tag', relation: 'domestic' }] }),
      site('guam', 0, 0.2, { scope: 'overseas', siteType: 'overseas-base', presences: [{ nation: 'US', role: 'stationing', via: 'tag', relation: 'own-territory' }] }),
      site('garrison', 0, 0.3, { siteType: 'garrison' }),
      site('foreign', 0, 5),
    ];
    expect(findNearest(bases, { lat: 0, lon: 0 }).ranked.map((r) => r.base.id)).toEqual(['foreign']);
  });
  it('reports stationing nations (foreign presences only) and position notes', () => {
    const b = site('x', 0, 1, { approx: true, presences: [{ nation: 'DE', role: 'stationing', via: 'tag', relation: 'domestic' }, ...US_ABROAD] });
    const [r] = rankByDistance([b], { lat: 0, lon: 0 });
    expect(r.nations).toEqual(['US']);
    expect(r.position).toBe('approx');
    const dup = site('dup', 0, 1, { positionCheck: { status: 'proposed', issue: 'duplicate-in-source', duplicateOf: 'other' } });
    expect(rankByDistance([dup], { lat: 0, lon: 0 })[0].position).toBe('unverified');
  });
});

/* ------------------------------------------------------------------ real dataset */

/** the published records, resolved exactly like scripts/build-data.mjs does (= public/data/bases.json) */
const all: Base[] = resolveBases(sourceBases, { claims: claimsFile.claims, research: researchSources, corrections }).bases;

/** the rule written out independently of proximity.ts, to cross-check the pool */
function independentRule(b: Base, includeClosed = false): boolean {
  if (isAggregate(b)) return false;
  const rel = b.presences.map((p) => p.relation);
  const foreign = rel.includes('foreign');
  const unknownOk = rel.length === 0 && ['foreign-base', 'shared-base', 'host-base-foreign-use'].includes(b.siteType) && !(b.issues ?? []).includes('out-of-scope-candidate');
  if (!foreign && !unknownOk) return false;
  if (b.status === 'closed' && !includeClosed) return false;
  return Number.isFinite(b.lat) && Number.isFinite(b.lon);
}

describe('real dataset (public/data/bases.json)', () => {
  it('uses every record: included + excluded = total, and the pool matches the independent rule', () => {
    const { stats, pool } = nearPool(all);
    expect(stats.total).toBe(all.length);
    expect(stats.included + Object.values(stats.excluded).reduce((a, b) => a + b, 0)).toBe(all.length);
    expect(pool.map((b) => b.id).sort()).toEqual(all.filter((b) => independentRule(b)).map((b) => b.id).sort());
    expect(nearPool(all, { includeClosed: true }).pool.length).toBe(all.filter((b) => independentRule(b, true)).length);
  });
  it('no national site ever appears as a foreign site', () => {
    for (const b of nearPool(all, { includeClosed: true }).pool) {
      expect(b.scope === 'foreign' || b.scope === 'unknown', b.id).toBe(true);
      expect(b.presences.every((p) => p.relation !== 'foreign') ? b.presences.length === 0 : true, b.id).toBe(true);
    }
  });
  it('brute force: for sample origins worldwide, rank 1 is the true minimum and the order is monotonic', () => {
    const origins = [[50.3533174, 7.5949023], [43.8415763, -93.8279178], [-33.87, 151.21], [21.3069, -157.8583], [22.3193, 114.1694], [64.1, -21.9], [-1.29, 36.82], [0, 0]];
    const pool = nearPool(all).pool;
    for (const [lat, lon] of origins) {
      const { ranked } = findNearest(all, { lat, lon });
      expect(ranked).toHaveLength(pool.length);
      const min = Math.min(...pool.map((b) => distanceKm(lat, lon, b.lat, b.lon)));
      expect(ranked[0].km).toBe(min);
      for (let i = 1; i < ranked.length; i++) expect(ranked[i].km).toBeGreaterThanOrEqual(ranked[i - 1].km);
    }
  });
  it('reference: Koblenz (PLZ 56068, Nominatim centre) → Büchel at ≈ 43.3 km', () => {
    // Verified independently (Vincenty/WGS84, separate classification code): buechel-nato-air-base is a
    // shared-base in DE with a foreign (US) presence, active, 43.34 km from the 56068 postcode centre;
    // next: frankfurt-hahn (civilian site, 51.4 km), mccully-barracks-wackernheim (57.2 km).
    const { ranked } = findNearest(all, { lat: 50.3533174, lon: 7.5949023 });
    expect(ranked.slice(0, 3).map((r) => r.base.id)).toEqual(['buechel-nato-air-base', 'frankfurt-hahn', 'mccully-barracks-wackernheim']);
    expect(Math.abs(ranked[0].km - 43.34)).toBeLessThan(0.25);
  });
  it('regression: the old ranking put national sites first (Honolulu, Hong Kong, Minnesota)', () => {
    const ids = (lat: number, lon: number) => findNearest(all, { lat, lon }).ranked.slice(0, 10).map((r) => r.base.id);
    expect(ids(21.3069, -157.8583)).not.toContain('naval-radio-transmitter-lualualei');
    expect(ids(22.3193, 114.1694)).not.toContain('pratas-islands-south-china-sea');
    const mn = ids(43.8415763, -93.8279178);
    for (const id of ['cape-cod-air-force-station', 'beale-air-force-base-california', 'vandenberg-space-force-base']) expect(mn).not.toContain(id);
  });
});
