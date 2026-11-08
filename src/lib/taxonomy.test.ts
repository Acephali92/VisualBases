import { describe, expect, it } from 'vitest';
import { VOCABULARIES, LEGACY_FILTERS, SITE_TYPE, TERRITORY_SOVEREIGN, colorGroup, label, ids, SITE_TYPES, FEATURES, ACTIVITY_GROUPS, ACTIVITIES, type Term } from './taxonomy';
// @ts-expect-error – plain ESM build script without type declarations
import { resolveBases, evidenceOf, relation } from '../../scripts/lib/resolve.mjs';
import sourceBases from '../../data/bases.json';
import claimsFile from '../../data/claims.json';
import researchSources from '../../data/research/sources.json';
import corrections from '../../data/corrections.json';
import i18nSource from './i18n.svelte.ts?raw';
import type { Base, SourceRecord } from './types';
import { sourceRecord } from './fixtures';

const src = sourceBases as unknown as SourceRecord[];
const { bases: all, problems } = resolveBases(src, { claims: claimsFile.claims, research: researchSources, corrections }) as { bases: Base[]; problems: unknown[] };
const byId = new Map(all.map((b) => [b.id, b]));

describe('vocabulary', () => {
  it('has unique, URL-safe IDs and complete German and English labels and definitions', () => {
    for (const [dim, list] of Object.entries(VOCABULARIES)) {
      const seen = new Set<string>();
      for (const t of list as readonly Term[]) {
        expect(seen.has(t.id), `${dim}: duplicate ${t.id}`).toBe(false);
        seen.add(t.id);
        expect(t.id, `${dim}: ${t.id}`).toMatch(/^[A-Za-z0-9-]+$/);
        expect(t.label.de?.trim(), `${dim}.${t.id} de`).toBeTruthy();
        expect(t.label.en?.trim(), `${dim}.${t.id} en`).toBeTruthy();
        if (t.info) expect(Boolean(t.info.de?.trim() && t.info.en?.trim()), `${dim}.${t.id} info`).toBe(true);
      }
    }
  });
  it('defines every site type, feature and activity group', () => {
    for (const t of [...SITE_TYPES, ...FEATURES, ...ACTIVITY_GROUPS]) expect(t.info, t.id).toBeTruthy();
    for (const a of ACTIVITIES) expect(ids(ACTIVITY_GROUPS)).toContain(a.group);
  });
  it('maps every old filter value to existing new values', () => {
    for (const map of Object.values(LEGACY_FILTERS)) for (const { key, values } of Object.values(map)) {
      const dim = { kinds: 'siteType', status: 'status', facilities: 'feature', themes: 'theme', activities: 'activityGroup' }[key] as keyof typeof VOCABULARIES;
      for (const v of values) expect(ids(VOCABULARIES[dim] as readonly Term[]), `${key}=${v}`).toContain(v);
    }
  });
  it('knows the sovereign state of every territory used in the data', () => {
    for (const b of src) if (b.host.territory) expect(TERRITORY_SOVEREIGN[b.host.territory]).toBe(b.host.country);
  });
  it('falls back to the ID for unknown terms instead of a blank label', () => {
    expect(label('siteType', 'shared-base', 'de')).toBe('Gemeinsam genutzte Basis');
    expect(label('siteType', 'nope', 'en')).toBe('nope');
  });
});

describe('translations', () => {
  it('German and English UI dictionaries have the same keys', () => {
    const block = (name: string) => {
      const start = i18nSource.indexOf(`const ${name}`);
      const end = i18nSource.indexOf('\n};', start);
      return new Set([...i18nSource.slice(start, end).matchAll(/^\s+'([\w.-]+)':/gm)].map((m) => m[1]));
    };
    const de = block('de = {');
    const en = block('en: Dict = {');
    expect(de.size).toBeGreaterThan(100);
    expect([...de].filter((k) => !en.has(k))).toEqual([]);
    expect([...en].filter((k) => !de.has(k))).toEqual([]);
  });
});

describe('separation of dimensions', () => {
  it('no record carries the old mixed values', () => {
    for (const b of src) {
      expect(['closed', 'hotspot', 'usglobal']).not.toContain(b.siteType);
      expect(b.themes.every((t) => ['resistance', 'drone-warfare', 'environment'].includes(t))).toBe(true);
      expect('kind' in b || 'nations' in b || 'facilities' in b || 'sharedWith' in b || 'country' in b).toBe(false);
    }
  });
  it('status is independent of the site type', () => {
    const closedTypes = new Set(all.filter((b) => b.status === 'closed').map((b) => b.siteType));
    expect(closedTypes.size).toBeGreaterThan(1);
  });
  it('closed sites are grey on the map, summary entries are rings', () => {
    expect(colorGroup({ siteType: 'foreign-base', status: 'closed' })).toBe('closed');
    expect(colorGroup({ siteType: 'garrison', status: 'active' })).toBe('aggregate');
    expect(colorGroup({ siteType: 'shared-base', status: 'active' })).toBe('shared');
  });
  it('host country and stationing nation are separate', () => {
    expect(relation('US', { country: 'DE' })).toBe('foreign');
    expect(relation('US', { country: 'US', territory: 'GU' })).toBe('own-territory');
    expect(relation('US', { country: 'US' })).toBe('domestic');
  });
  it('allows several stationing nations and co-users', () => {
    const djibouti = byId.get('armed-forces-djibouti')!;
    expect(djibouti.presences.map((p) => p.nation)).toEqual(expect.arrayContaining(['US', 'FR', 'JP', 'CN', 'IT']));
    expect(djibouti.presences.find((p) => p.nation === 'IT')!.role).toBe('co-user');
  });
});

describe('test cases from the assignment', () => {
  it('Naval Air Station Argentia: former base in Canada, US, airfield', () => {
    const b = byId.get('nas-argentia-newfoundland')!;
    expect(b).toMatchObject({ host: { country: 'CA' }, status: 'closed', features: ['airfield'], scope: 'foreign' });
    expect(b.presences).toEqual([expect.objectContaining({ nation: 'US', role: 'stationing', relation: 'foreign' })]);
    // the source only says "Closed Base": the form of use is not invented
    expect(b.siteType).toBe('military-base');
    expect(b.basis.siteType).toBe('derived');
    expect(b.issues).toContain('site-type-from-status');
  });
  it('Büchel: shared base in Germany, US, airfield, nuclear sharing (an arrangement, not a facility)', () => {
    const b = byId.get('buechel-nato-air-base')!;
    expect(b).toMatchObject({ host: { country: 'DE' }, siteType: 'shared-base', status: 'active', scope: 'foreign', themes: ['resistance'] });
    expect(b.presences.map((p) => p.nation)).toEqual(['US']);
    expect(b.features).toEqual(['airfield', 'nuclear-sharing']);
    expect(FEATURES.find((f) => f.id === 'nuclear-sharing')!.kind).toBe('arrangement');
    expect(FEATURES.find((f) => f.id === 'airfield')!.kind).toBe('infrastructure');
  });
  it('Lualualei: US site with global role on US territory is a context site, not a foreign base', () => {
    const b = byId.get('naval-radio-transmitter-lualualei')!;
    expect(b).toMatchObject({ host: { country: 'US' }, siteType: 'domestic-global', scope: 'domestic' });
    expect(b.presences).toEqual([expect.objectContaining({ nation: 'US', relation: 'domestic', via: 'site-type' })]);
    expect(SITE_TYPE[b.siteType].color).not.toBe('foreign');
    // a telecommunications station is not automatically a listening station
    expect(b.features).toContain('telecom-station');
    expect(b.features).not.toContain('signals-intelligence');
    // Hawaii is filed under "Asia" on visualbases.org – flagged, not silently changed
    expect(b.continent).toBe('asia');
    expect(b.issues).toContain('continent-check');
  });
});

describe('claims layer', () => {
  it('all claims apply cleanly to the current data', () => expect(problems).toEqual([]));
  it('accepted corrections change the value and keep the original visible', () => {
    const b = byId.get('base-aerienne-188-djibouti')!;
    expect(b.presences.map((p) => p.nation)).toEqual(['FR']);
    expect(b.corrections![0]).toMatchObject({ field: 'presences', from: [{ nation: 'US', role: 'stationing', via: 'tag' }] });
    expect(b.evidence?.nation).toBe('corrected');
    expect(byId.get('sarajevo-military-airport')!.host.country).toBe('BA');
    expect(byId.get('kabul-isaf-headquarters')!).toMatchObject({ status: 'closed', basis: { status: 'claim' }, period: { to: '2021-09' } });
  });
  it('proposed claims change nothing but are shown and mark the statement as disputed', () => {
    const b = byId.get('pae-du-lamentin-guadeloupe')!;
    expect(b.host).toMatchObject({ country: 'FR', territory: 'GP' });
    expect(b.proposals?.[0]).toMatchObject({ field: 'host', value: { territory: 'MQ' } });
    expect(b.evidence?.position).toBe('disputed');
    const rec = sourceRecord({ id: 'p', status: 'closed' });
    const r = resolveBases([rec], { claims: [{ id: 'c', base: 'p', field: 'status', op: 'set', value: 'unknown', status: 'proposed', statement: { de: 'x', en: 'x' }, sources: ['https://x'] }], research: [{ base: 'p', url: 'https://x' }] });
    expect(r.bases[0]).toMatchObject({ status: 'closed', evidence: { status: 'disputed' } });
  });
  it('position and name corrections keep the original visible', () => {
    const c = byId.get('creech-air-force-base')!;
    expect([c.lat, c.lon]).toEqual([36.58875, -115.67146]);
    expect(c.corrections?.find((x) => x.field === 'position')?.from).toEqual({ lat: 36.5692, lon: -115.3722 });
    expect(c.evidence?.position).toBe('corrected');
    const pc = byId.get('puerto-castilla-honduras')!;
    expect(pc).toMatchObject({ name: 'Puerto Castilla (Honduras)', approx: true });
    expect(byId.get('stock-barracks-illesheim')!.name).toBe('Illesheim: Storck Barracks');
    expect(byId.get('de-kl-warrior-preparation-center')!.issues).toContain('duplicate-entry');
    expect(byId.get('khmeimim-ab')!.status).toBe('unknown');
  });
  it('an obsolete claim is reported instead of applied twice', () => {
    const rec = sourceRecord({ id: 'z', status: 'closed' });
    const r = resolveBases([rec], { claims: [{ id: 'c', base: 'z', field: 'status', op: 'set', value: 'closed', status: 'accepted', decided: '2026-11-07', statement: { de: 'x', en: 'x' }, sources: ['https://x'] }], research: [{ base: 'z', url: 'https://x' }] });
    expect(r.problems.map((p: { rule: string }) => p.rule)).toContain('claim-apply');
  });
});

describe('evidence', () => {
  const s = (verdict: string, supports: string[], method = 'manual', url = 'u') => ({ verdict, supports, method, url });
  it('derives a state per statement group without scores', () => {
    expect(evidenceOf([s('supports', ['presence', 'nation'])])).toEqual({ presence: 'confirmed', nation: 'confirmed' });
    expect(evidenceOf([s('context', ['status'])])).toEqual({ status: 'context' });
    expect(evidenceOf([s('contradicts', ['nation'])])).toEqual({ nation: 'disputed' });
    expect(evidenceOf([s('supports', ['nation'], 'auto')])).toEqual({});
    expect(evidenceOf([s('contradicts', ['nation'], 'manual', 'x')], { corrected: ['nation'], cited: new Set(['x']) })).toEqual({ nation: 'corrected' });
  });
  it('unreviewed automatic matches never count as evidence', () => {
    for (const b of all) for (const [k, v] of Object.entries(b.evidence ?? {})) {
      if (v === 'confirmed') expect(b.research!.some((r) => r.method === 'manual' && r.verdict === 'supports' && r.supports.includes(k as never)), `${b.id} ${k}`).toBe(true);
    }
  });
});

describe('relations', () => {
  it('members point to their summary entry and facilities to their base', () => {
    expect(byId.get('ramstein-air-base')!.relations).toEqual(expect.arrayContaining([{ type: 'member-of', id: 'kaiserslautern-ramstein-community' }]));
    expect(byId.get('kaiserslautern-ramstein-community')!.includes).toContain('ramstein-air-base');
    expect(byId.get('kleine-brogel-nuclear')!.relations).toEqual([{ type: 'part-of', id: 'kleine-brogel-air-base' }]);
    expect(byId.get('kleine-brogel-air-base')!.hasParts).toEqual(['kleine-brogel-nuclear']);
  });
});
