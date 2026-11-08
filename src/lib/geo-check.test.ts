import { describe, expect, it } from 'vitest';
// @ts-expect-error – plain ESM build script without type declarations
import { prepareCountries, loadCountries, checkCountry, countryAt, researchSignals } from '../../scripts/lib/geo-check.mjs';
// @ts-expect-error – plain ESM build script without type declarations
import { validate } from '../../scripts/validate-data.mjs';
import { sourceRecord } from './fixtures';
import bases from '../../data/bases.json';
import claimsFile from '../../data/claims.json';
import corrections from '../../data/corrections.json';
import researchSources from '../../data/research/sources.json';
import checks from '../../data/research/checks.json';

/** a square "country" around (lat, lon) with half-width d degrees */
const square = (id: string, lat: number, lon: number, d = 1, name = id) => ({
  id, properties: { name }, geometry: { type: 'Polygon', coordinates: [[[lon - d, lat - d], [lon + d, lat - d], [lon + d, lat + d], [lon - d, lat + d], [lon - d, lat - d]]] },
});
const toy = prepareCountries([square('276', 50, 10), square('250', 50, 6), square('316', 13.4, 144.8, 0.2), square('-', 9, 115, 0.5, 'Spratly Is.'), square('158', 23.5, 121)]);
const base = (p: Record<string, unknown> = {}) => sourceRecord({ lat: 50, lon: 10, ...p });
const rule = (p: Record<string, unknown>) => checkCountry(base(p), toy)?.rule ?? null;

describe('coordinates against the host country', () => {
  it('maps ISO numeric polygons to alpha-2 codes', () => {
    expect(countryAt(50, 10, toy).code).toBe('DE');
    expect(countryAt(13.4, 144.8, toy).code).toBe('GU');
  });

  it('accepts the host state, its territory and the sovereign of a territory polygon', () => {
    expect(rule({})).toBeNull();
    expect(rule({ lat: 13.4, lon: 144.8, host: { country: 'US', territory: 'GU' } })).toBeNull();
    expect(rule({ lat: 13.4, lon: 144.8, host: { country: 'US' } })).toBeNull();
  });

  it('reports a position in another state', () => {
    expect(rule({ lon: 6.5 })).toBe('coords-country');
    expect(checkCountry(base({ lon: 6.5 }), toy).msg).toContain('(FR)');
  });

  it('tolerates coastal positions near the host and reports positions far at sea', () => {
    expect(rule({ lon: 11.05 })).toBeNull(); // ~4 km off the "coast"
    expect(rule({ lon: 13 })).toBe('coords-offshore');
    // at sea, but next to another state
    expect(rule({ lat: 50, lon: 4.95 })).toBe('coords-country');
  });

  it('reports disputed areas separately when the host is a claimant', () => {
    expect(rule({ lat: 9, lon: 115, host: { country: 'PH' } })).toBe('coords-country-disputed');
    expect(rule({ lat: 23.5, lon: 121, host: { country: 'CN' } })).toBe('coords-country-disputed');
    expect(rule({ lat: 23.5, lon: 121, host: { country: 'TW' } })).toBeNull();
    expect(rule({ lat: 9, lon: 115, host: { country: 'DE' } })).toBe('coords-country');
  });

  it('works with the real polygons, also next to the antimeridian', () => {
    const world = loadCountries();
    const check = (lat: number, lon: number, host: { country: string; territory?: string }) => checkCountry(sourceRecord({ lat, lon, host }), world)?.rule ?? null;
    expect(check(0.3895, 9.4551, { country: 'GH' })).toBe('coords-country'); // Libreville filed under Ghana
    expect(check(0.3895, 9.4551, { country: 'GA' })).toBeNull();
    expect(check(65.8275, 21.6963, { country: 'SE' })).toBeNull(); // Boden – same latitude as Chukotka
    expect(check(64.73, 177.5, { country: 'RU' })).toBeNull(); // Anadyr, east of the antimeridian cut
    expect(check(34.5904, 32.9879, { country: 'CY' })).toBeNull(); // Akrotiri (British SBA)
    expect(check(19.9062, -75.0961, { country: 'CU' })).toBeNull(); // Guantánamo
    expect(check(-7.3, 72.4, { country: 'GB', territory: 'IO' })).toBeNull(); // Diego Garcia
  });
});

describe('research signals', () => {
  const b = (p: Record<string, unknown> = {}) => ({ ...sourceRecord({ lat: 50, lon: 10, ...p }), positionPrecision: 'reference' });
  const rules = (rec: object, check: object) => researchSignals(rec, check).map((s: { rule: string }) => s.rule);

  it('reports a stale OSM check and ignores its verdict', () => {
    expect(rules(b(), { osm: { verdict: 'none', lat: 50.1, lon: 10 } })).toEqual(['position-check-stale']);
    expect(rules(b(), { osm: { verdict: 'none', lat: 50, lon: 10 } })).toEqual(['position-osm-none']);
    expect(rules(b(), { osm: { verdict: 'confirmed', lat: 50, lon: 10 } })).toEqual([]);
  });

  it('reports a distant Wikidata coordinate with a tolerance for large sites', () => {
    const wd = (km: number, instanceOf = ['military base']) => ({ wikidata: { item: 'Q1', coord: [50 + km / 111.2, 10], instanceOf } });
    expect(rules(b(), wd(4))).toEqual([]);
    expect(rules(b(), wd(8))).toEqual(['position-wikidata-far']);
    expect(rules(b({ features: ['training-area'] }), wd(8))).toEqual([]);
    expect(rules(b({ features: ['training-area'] }), wd(20))).toEqual(['position-wikidata-far']);
    // items of towns locate the place, not the facility
    expect(rules(b(), wd(20, ['city']))).toEqual([]);
  });

  it('skips aggregates and approximate positions', () => {
    const far = { osm: { verdict: 'none', lat: 50, lon: 10 }, wikidata: { item: 'Q1', coord: [51, 10], instanceOf: [] } };
    expect(rules(b({ siteType: 'region-cluster' }), far)).toEqual([]);
    expect(rules({ ...b(), positionPrecision: 'town' }, far)).toEqual([]);
  });
});

describe('geographic checks in the validator', () => {
  const warnRules = (r: { warnings: { rule: string }[] }) => r.warnings.map((w) => w.rule);
  const confirmed = (p: Record<string, unknown> = {}) => ({ id: 'a', status: 'confirmed', issue: 'off-site', source: 'Site visit report', url: 'https://example.org', retrieved: '2026-11-08', ...p });

  it('reports country mismatches and lets a confirmed entry settle them', () => {
    const bases = [base({ lon: 6.5 })];
    expect(warnRules(validate({ bases, countries: toy }))).toContain('coords-country');
    const settled = validate({ bases, countries: toy, corrections: { positions: [confirmed()] } });
    expect(warnRules(settled)).not.toContain('coords-country');
    expect(settled.stats.geoSettled).toBe(1);
    // only the listed rules are settled
    expect(warnRules(validate({ bases, countries: toy, corrections: { positions: [confirmed({ rules: ['coords-offshore'] })] } }))).toContain('coords-country');
    expect(validate({ bases, countries: toy, corrections: { positions: [confirmed({ rules: ['typo'] })] } }).errors.map((e: { rule: string }) => e.rule)).toContain('corrections');
  });

  it('finds no country mismatch in the committed dataset once the accepted claims are applied', () => {
    const r = validate({ bases, corrections, claims: claimsFile.claims, research: { sources: researchSources, checks }, countries: loadCountries() });
    expect(r.errors).toEqual([]);
    expect(warnRules(r)).not.toContain('coords-country');
    // …while the raw import still carries them (Libreville, Ayanganna, Sarajevo)
    const raw = validate({ bases, countries: loadCountries() });
    expect(raw.warnings.filter((w: { rule: string }) => w.rule === 'coords-country').map((w: { id: string }) => w.id).sort()).toEqual(['camp-ayanganna', 'librevillegabon', 'sarajevo-military-airport']);
  });

  it('feeds the research checks into the warnings', () => {
    const r = validate({ bases: [base()], research: { checks: { a: { osm: { verdict: 'none', lat: 50, lon: 10 } } } } });
    expect(warnRules(r)).toContain('position-osm-none');
  });

  it('reports the same distinctive name close by, but not mere place names or linked sites', () => {
    const pair = (name: string, other: string, p: Record<string, unknown> = {}) => warnRules(validate({ bases: [base({ name }), base({ id: 'b', name: other, lat: 50.015, ...p })] }));
    expect(pair('Landstuhl: Bann Communications Station', 'Landstuhl: Bann Communications Station 2')).toContain('duplicate-name-near');
    expect(pair('Ansbach: Barton Barracks', 'Ansbach: Shipton Kaserne')).not.toContain('duplicate-name-near');
    expect(pair('Gibraltar HM Naval Base', 'Gibraltar RAF')).not.toContain('duplicate-name-near');
    expect(pair('Bann Station', 'Bann Station 2', { relations: [{ type: 'related', id: 'a' }] })).not.toContain('duplicate-name-near');
    expect(pair('Bann Station', 'Bann Station', { lat: 50.1 })).not.toContain('duplicate-name-near'); // 11 km
  });
});
