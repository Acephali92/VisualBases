import { describe, expect, it } from 'vitest';
import { distanceKm, nearest, matches, filtersToQuery, queryToFilters, countBy, fold, EMPTY_FILTERS } from './data';
import type { Base } from './types';

const base = (p: Partial<Base>): Base => ({
  id: 'x', name: 'X', country: 'DE', lat: 0, lon: 0, zoom: 14, kind: 'foreign', facilities: [], continent: 'europe', region: 'germany',
  nations: ['US'], sharedWith: [], themes: [], sourceType: [], sources: [], notes: [], origin: '', ...p,
});

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
  const bases = [base({ id: 'a', lat: 1, lon: 1 }), base({ id: 'b', lat: 5, lon: 5 }), base({ id: 'g', lat: 0.1, lon: 0.1, group: true })];
  it('sorts by distance and skips groups', () => {
    expect(nearest(bases, 0, 0).map((r) => r.base.id)).toEqual(['a', 'b']);
  });
  it('can include groups', () => expect(nearest(bases, 0, 0, 1, true)[0].base.id).toBe('g'));
});

describe('filters', () => {
  const b = base({ name: 'Ramstein Air Base', themes: ['drones'], facilities: ['airfield'] });
  it('matches search words in any order, accent-insensitive', () => {
    expect(matches(b, { ...EMPTY_FILTERS, q: 'air RAMSTEIN' })).toBe(true);
    expect(matches(base({ name: 'Grafenwöhr' }), { ...EMPTY_FILTERS, q: 'grafenwohr' })).toBe(true);
    expect(matches(b, { ...EMPTY_FILTERS, q: 'okinawa' })).toBe(false);
  });
  it('combines facets with AND, values within a facet with OR', () => {
    expect(matches(b, { ...EMPTY_FILTERS, themes: ['drones', 'environment'] })).toBe(true);
    expect(matches(b, { ...EMPTY_FILTERS, themes: ['drones'], nations: ['FR'] })).toBe(false);
  });
  it('round-trips through the URL', () => {
    const f = { ...EMPTY_FILTERS, q: 'x y', kinds: ['foreign', 'shared'] as Base['kind'][], themes: ['drones' as const] };
    expect(queryToFilters(filtersToQuery(f))).toEqual(f);
    expect(filtersToQuery(EMPTY_FILTERS)).toBe('');
  });
});

describe('helpers', () => {
  it('countBy handles arrays and sorts descending', () => {
    expect(countBy([{ k: ['a', 'b'] }, { k: ['a'] }], (x) => x.k)).toEqual([['a', 2], ['b', 1]]);
  });
  it('fold strips accents', () => expect(fold('Câmpia Turzii')).toBe('campia turzii'));
});
