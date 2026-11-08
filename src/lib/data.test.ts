import { describe, expect, it } from 'vitest';
import { distanceKm, nearest, matches, filtersToQuery, queryToFilters, countBy, fold, facetCounts, facetValues, summary, EMPTY_FILTERS, FILTER_KEYS } from './data';
import type { Base } from './types';
import { resolved } from './fixtures';
import { buildQuiz } from './quiz';
// @ts-expect-error – plain ESM build script without type declarations
import { resolveBases } from '../../scripts/lib/resolve.mjs';
import sourceBases from '../../data/bases.json';
import claimsFile from '../../data/claims.json';
import researchSources from '../../data/research/sources.json';
import corrections from '../../data/corrections.json';

const base = (p: Partial<Base>) => resolved(p);
/** the published records, resolved exactly like scripts/build-data.mjs does */
const all: Base[] = resolveBases(sourceBases, { claims: claimsFile.claims, research: researchSources, corrections }).bases;

describe('distanceKm', () => {
  it('is zero for identical points', () => expect(distanceKm(50, 8, 50, 8)).toBe(0));
  it('Frankfurt → Ramstein ≈ 110 km', () => {
    const d = distanceKm(50.1109, 8.6821, 49.4398, 7.6019);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });
  it('quarter of the meridian ≈ 10 008 km', () => expect(Math.round(distanceKm(0, 0, 90, 0))).toBe(10008));
});

describe('nearest', () => {
  const bases = [base({ id: 'a', lat: 1, lon: 1 }), base({ id: 'b', lat: 5, lon: 5 }), base({ id: 'g', lat: 0.1, lon: 0.1, siteType: 'garrison' })];
  it('sorts by distance and skips summary entries', () => {
    expect(nearest(bases, 0, 0).map((r) => r.base.id)).toEqual(['a', 'b']);
  });
  it('can include summary entries', () => expect(nearest(bases, 0, 0, 1, true)[0].base.id).toBe('g'));
});

describe('filters', () => {
  const b = base({ name: 'Ramstein Air Base', themes: ['drone-warfare'], features: ['airfield', 'command'], activities: ['defender-europe-20'], organisations: ['nato'] });
  it('matches search words in any order, accent-insensitive', () => {
    expect(matches(b, { ...EMPTY_FILTERS, q: 'air RAMSTEIN' })).toBe(true);
    expect(matches(base({ name: 'Grafenwöhr' }), { ...EMPTY_FILTERS, q: 'grafenwohr' })).toBe(true);
    expect(matches(b, { ...EMPTY_FILTERS, q: 'okinawa' })).toBe(false);
  });
  it('combines facets with AND, values within a facet with OR (multiple selection)', () => {
    expect(matches(b, { ...EMPTY_FILTERS, themes: ['drone-warfare', 'environment'] })).toBe(true);
    expect(matches(b, { ...EMPTY_FILTERS, themes: ['drone-warfare'], nations: ['FR'] })).toBe(false);
    expect(matches(b, { ...EMPTY_FILTERS, facilities: ['naval-port', 'command'], status: ['active'] })).toBe(true);
    expect(matches(b, { ...EMPTY_FILTERS, facilities: ['airfield'], status: ['closed'] })).toBe(false);
  });
  it('filters activities by series and organisations', () => {
    expect(matches(b, { ...EMPTY_FILTERS, activities: ['defender-europe'] })).toBe(true);
    expect(matches(b, { ...EMPTY_FILTERS, activities: ['nato'] })).toBe(true);
    expect(matches(b, { ...EMPTY_FILTERS, activities: ['atlantic-resolve'] })).toBe(false);
  });
  it('host country filter also matches the territory', () => {
    const guam = base({ host: { country: 'US', territory: 'GU' } });
    expect(matches(guam, { ...EMPTY_FILTERS, countries: ['GU'] })).toBe(true);
    expect(matches(guam, { ...EMPTY_FILTERS, countries: ['US'] })).toBe(true);
  });
  it('a state on its own territory does not count as stationing nation', () => {
    const own = base({ host: { country: 'US' }, presences: [{ nation: 'US', role: 'stationing', via: 'site-type', relation: 'domestic' }], scope: 'domestic' });
    expect(facetValues(own, 'nations')).toEqual([]);
    expect(summary([own]).us).toBe(0);
  });
  it('filters by the form of the foreign presences; undocumented forms count as "unspecified"', () => {
    const p = (nation: string, form?: string, relation = 'foreign') => ({ nation, role: 'stationing', via: 'tag', relation, ...(form ? { form } : {}) }) as Base['presences'][number];
    const mixed = base({ presences: [p('US', 'access'), p('GB')] });
    expect(facetValues(mixed, 'forms')).toEqual(['access', 'unspecified']);
    expect(matches(mixed, { ...EMPTY_FILTERS, forms: ['access'] })).toBe(true);
    expect(matches(mixed, { ...EMPTY_FILTERS, forms: ['rotational'] })).toBe(false);
    // a state on its own territory is not a foreign presence; no presence at all is "unspecified"
    expect(facetValues(base({ presences: [p('US', 'permanent', 'domestic')], scope: 'domestic' }), 'forms')).toEqual(['unspecified']);
    expect(facetValues(base({ presences: [] }), 'forms')).toEqual(['unspecified']);
  });
  it('round-trips through the URL', () => {
    const f = { ...EMPTY_FILTERS, q: 'x y', kinds: ['foreign-base', 'shared-base'] as Base['siteType'][], status: ['closed'] as Base['status'][], forms: ['access', 'unspecified'], themes: ['drone-warfare' as const], activities: ['nato'], countries: ['DE'] };
    expect(queryToFilters(filtersToQuery(f))).toEqual(f);
    expect(filtersToQuery(EMPTY_FILTERS)).toBe('');
  });
  it('keeps atlas links of the old classification working', () => {
    expect(queryToFilters('kinds=foreign,closed&themes=drones,surveillance,defender&facilities=nuclear')).toEqual({
      ...EMPTY_FILTERS,
      kinds: ['foreign-base', 'overseas-base'],
      status: ['closed'],
      themes: ['drone-warfare'],
      facilities: ['nuclear-sharing', 'signals-intelligence'],
      activities: ['defender-europe'],
    });
    expect(queryToFilters('kinds=hotspot').kinds).toEqual(['garrison', 'region-cluster']);
  });
});

describe('filter counts on the real dataset', () => {
  it('each chip count equals the number of records the filter returns', () => {
    for (const key of FILTER_KEYS) {
      for (const [value, n] of facetCounts(all, EMPTY_FILTERS, key)) {
        expect(all.filter((b) => matches(b, { ...EMPTY_FILTERS, [key]: [value] })).length, `${key}=${value}`).toBe(n);
      }
    }
  });
  it('counts respect the other active filters but not the facet’s own selection', () => {
    const f = { ...EMPTY_FILTERS, kinds: ['shared-base'] as Base['siteType'][], facilities: ['airfield'] as Base['features'] };
    const kinds = facetCounts(all, f, 'kinds');
    expect(kinds.get('foreign-base')).toBe(all.filter((b) => b.siteType === 'foreign-base' && b.features.includes('airfield')).length);
    const fac = facetCounts(all, f, 'facilities');
    expect(fac.get('airfield')).toBe(all.filter((b) => matches(b, f)).length);
  });
  it('multiple values within one facet add up to the union', () => {
    const one = all.filter((b) => matches(b, { ...EMPTY_FILTERS, facilities: ['nuclear-sharing'] })).length;
    const two = all.filter((b) => matches(b, { ...EMPTY_FILTERS, facilities: ['nuclear-sharing', 'missile-defence'] })).length;
    const both = all.filter((b) => b.features.includes('nuclear-sharing') && b.features.includes('missile-defence')).length;
    expect(two).toBe(one + all.filter((b) => b.features.includes('missile-defence')).length - both);
  });
});

describe('helpers', () => {
  it('countBy handles arrays, de-duplicates per item and sorts descending', () => {
    expect(countBy([{ k: ['a', 'b', 'a'] }, { k: ['a'] }], (x) => x.k)).toEqual([['a', 2], ['b', 1]]);
  });
  it('fold strips accents', () => expect(fold('Câmpia Turzii')).toBe('campia turzii'));
});

describe('quiz', () => {
  const qs = buildQuiz(all);
  it('has valid answers, unique options and existing bases', () => {
    for (const q of qs) {
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
      expect(new Set(q.options.map((o) => o.de)).size).toBe(q.options.length);
      if (q.base) expect(all.some((b) => b.id === q.base)).toBe(true);
    }
  });
  it('counts nuclear-sharing sites, not the separate depot entry', () => {
    expect(qs.find((q) => q.id === 'nuclear')!.explain.de).toContain('einer von 6 ');
  });
});
