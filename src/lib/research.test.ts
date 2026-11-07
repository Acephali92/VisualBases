import { describe, expect, it } from 'vitest';
// @ts-expect-error – plain ESM build scripts without type declarations
import { classifyUrl, unwrapArchive, matchScore, countryCode, placeOnlyName, tokens } from '../../scripts/research/lib.mjs';
// @ts-expect-error – see above
import { bestMatch, applyReview } from '../../scripts/research/bsr.mjs';
// @ts-expect-error – see above
import { summarize } from '../../scripts/research/summarize.mjs';
// @ts-expect-error – see above
import { rankLinks } from '../../scripts/research/wiki-refs.mjs';
// @ts-expect-error – see above
import { evaluate } from '../../scripts/research/osm-check.mjs';
// @ts-expect-error – see above
import { validate } from '../../scripts/validate-data.mjs';

const base = (p: Record<string, unknown>) => ({ id: 'x', name: 'X', country: 'DE', lat: 49.44, lon: 7.6, kind: 'foreign', facilities: [], themes: [], nations: ['US'], sources: [], notes: [], continent: 'europe', ...p });

describe('source classification', () => {
  it('classifies hosts', () => {
    expect(classifyUrl('https://www.ramstein.af.mil/About/')).toBe('official');
    expect(classifyUrl('https://www.bundestag.de/resource/blob/1')).toBe('official');
    expect(classifyUrl('https://doi.org/10.1000/x')).toBe('academic');
    expect(classifyUrl('https://www.stoppramstein.de/')).toBe('movement');
    expect(classifyUrl('https://drohnen.frieden-und-zukunft.de/')).toBe('movement');
    expect(classifyUrl('https://www.spiegel.de/politik/x')).toBe('media');
    expect(classifyUrl('https://en.wikipedia.org/wiki/X')).toBeNull();
  });
  it('unwraps archive links', () => {
    expect(unwrapArchive('https://web.archive.org/web/20200101000000/https://www.army.mil/article/1')).toBe('https://www.army.mil/article/1');
    expect(classifyUrl('https://web.archive.org/web/2020/https://www.army.mil/x')).toBe('official');
  });
  it('ranks and de-duplicates Wikipedia links', () => {
    const r = rankLinks(['https://www.spiegel.de/a', 'https://www.army.mil/b', 'http://army.mil/b/', 'https://de.wikipedia.org/wiki/X']);
    expect(r.map((x: { type: string }) => x.type)).toEqual(['official', 'media']);
  });
});

describe('name matching', () => {
  it('ignores generic military words', () => {
    expect(tokens('Ramstein Air Base')).toEqual(['ramstein']);
    expect(matchScore('Ramstein Air Base', 'Ramstein AB Ramstein')).toBe(1);
    expect(matchScore('Spangdahlem Air Base', 'Ramstein AB')).toBe(0);
  });
  it('maps BSR country names', () => {
    expect(countryCode('Korea, Republic Of')).toBe('KR');
    expect(countryCode('Germany')).toBe('DE');
    expect(countryCode('Guantanamo Bay Naval Base')).toBe('CU');
  });
  it('matches the facility after the colon and skips place-only names', () => {
    const rows = [{ country: 'Germany', site: 'Katterbach Kaserne', component: 'Army', city: 'Ansbach' }, { country: 'Germany', site: 'Barton Barracks', component: 'Army', city: 'Ansbach' }];
    expect(bestMatch(base({ name: 'Ansbach: Katterbach Kaserne' }), rows)).toMatchObject({ site: 'Katterbach Kaserne', match: 'site' });
    expect(placeOnlyName('Bahrain')).toBe(true);
    expect(bestMatch(base({ name: 'Bahrain', country: 'BH' }), [{ country: 'Bahrain', site: 'ISA Flightline', component: 'Navy', city: 'Bahrain' }])).toBeNull();
  });
  it('does not match on the host country demonym', () => {
    expect(bestMatch(base({ name: 'Mombasa: Kenyan Naval Base Mtongwe', country: 'KE' }), [{ country: 'Kenya', site: 'NSA Bahrain Kenya', component: 'Navy', city: 'Kenya' }])).toBeNull();
  });
  it('prefers rows in the named place, expands abbreviations and breaks ties by exact wording', () => {
    const r = (site: string, city: string, country = 'Germany') => ({ country, site, component: 'Army Active', city });
    expect(bestMatch(base({ name: 'Landstuhl: US-Hospital' }), [r('Baumholder Hospital', 'Baumholder'), r('Landstuhl Hospital', 'Landstuhl')])).toMatchObject({ site: 'Landstuhl Hospital' });
    expect(bestMatch(base({ name: 'Yokosuka: COMFLEACT', country: 'JP' }), [r('COMFLEACT Sasebo', 'Sasebo', 'Japan'), r('COMFLEACT Yokosuka', 'Yokosuka', 'Japan')])).toMatchObject({ site: 'COMFLEACT Yokosuka' });
    expect(bestMatch(base({ name: 'Okinawa: Kadena Ammunition Storage Area', country: 'JP' }), [r('Awase', 'Kadena Air Base Okinawa', 'Japan'), r('Kadena Ammo Storage Annex', 'Kadena Air Base Okinawa', 'Japan')])).toMatchObject({ site: 'Kadena Ammo Storage Annex' });
    expect(bestMatch(base({ name: 'Kaiserslautern Army Depot' }), [r('Kaiserslautern', 'Kaiserlautern'), r('Kaiserslautern Army Depot', 'Kaiserlautern')])).toMatchObject({ site: 'Kaiserslautern Army Depot' });
    expect(bestMatch(base({ name: 'Landstuhl: Bann Communications Station 2' }), [r('Bann Communications Station', 'Bann'), r('Bann Communications Station  2', 'Bann')])).toMatchObject({ site: 'Bann Communications Station  2' });
  });
});

describe('BSR review', () => {
  const rows = [{ country: 'Romania', site: 'NAVSUPPFAC Romania', component: 'Navy Active', city: 'Unknown' }];
  it('confirms, reassigns, rejects or flags a stale review', () => {
    const m = { ...rows[0], match: 'site', score: 1 };
    expect(applyReview(m, null, rows, 'RO')).toEqual({ row: m, review: null });
    expect(applyReview(m, { site: 'NAVSUPPFAC Romania', verdict: 'supports' }, rows, 'RO').review).toMatchObject({ verdict: 'supports' });
    expect(applyReview(null, { site: 'NAVSUPPFAC Romania', verdict: 'supports' }, rows, 'RO').row).toMatchObject({ site: 'NAVSUPPFAC Romania', match: 'manual' });
    expect(applyReview(m, { verdict: 'reject' }, rows, 'RO').row).toBeNull();
    expect(applyReview(m, { site: 'Gone', verdict: 'supports' }, rows, 'RO')).toMatchObject({ row: m, review: null, stale: true });
  });
});

describe('research summary', () => {
  it('assigns evidence levels and collects contradictions', () => {
    const bases = [base({ id: 'a' }), base({ id: 'b' }), base({ id: 'c' }), base({ id: 'd' })];
    const src = (b: string, verdict: string, method = 'manual') => ({ base: b, url: 'https://x.org', type: 'media', verdict, method, supports: ['presence'], accessed: '2026-11-07', summary: 's', note: '' });
    const rows = summarize(bases, { sources: [src('a', 'supports'), src('b', 'contradicts'), src('c', 'unreviewed', 'auto')], candidates: [], checks: { a: { bsr: { fy2019: { site: 'X' }, fy2023: null } } } });
    expect(rows.map((r: { level: string }) => r.level)).toEqual(['verified', 'context', 'candidates', 'none']);
    expect(rows[1].issues[0]).toMatch(/^contradicts/);
    expect(rows[0].issues).toContain('BSR: listed FY2019, not FY2023');
  });
});

describe('OSM position check', () => {
  it('evaluates the nearest military feature', () => {
    const b = base({});
    expect(evaluate(b, [])).toMatchObject({ verdict: 'none', count: 0 });
    const r = evaluate(b, [{ type: 'way', id: 1, center: { lat: 49.441, lon: 7.601 }, tags: { landuse: 'military', name: 'Ramstein' } }]);
    expect(r).toMatchObject({ verdict: 'confirmed', nearest: { name: 'Ramstein', kind: 'military area' } });
  });
});

describe('research schema validation', () => {
  it('requires a manual check before "supports"', () => {
    const src = { base: 'x', url: 'https://a.mil', type: 'official', verdict: 'supports', method: 'auto', accessed: '2026-11-07', supports: ['presence'] };
    const r = validate({ bases: [base({ sources: [{ url: 'https://x', label: 'x' }] })], research: { sources: [src] } });
    expect(r.errors.map((e: { rule: string }) => e.rule)).toContain('research-verdict');
    const ok = validate({ bases: [base({ sources: [{ url: 'https://x', label: 'x' }] })], research: { sources: [{ ...src, method: 'manual', summary: 'checked' }] } });
    expect(ok.errors).toEqual([]);
  });
});
