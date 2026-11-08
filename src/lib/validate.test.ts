import { describe, expect, it } from 'vitest';
// @ts-expect-error – Node built-ins are untyped here (no @types/node dependency)
import fs from 'node:fs/promises';
// @ts-expect-error – see above
import os from 'node:os';
// @ts-expect-error – see above
import path from 'node:path';
// @ts-expect-error – plain ESM build script without type declarations
import { validate, validCountry, report, mappedTerm } from '../../scripts/validate-data.mjs';
// @ts-expect-error – plain ESM build script without type declarations
import { readJson } from '../../scripts/research/lib.mjs';
// @ts-expect-error – plain ESM build script without type declarations
import { CSV_COLUMNS } from '../../scripts/lib/export.mjs';
import checks from '../../data/research/checks.json';
import candidates from '../../data/research/candidates.json';
import bsrReview from '../../data/research/bsr-review.json';
import bases from '../../data/bases.json';
import media from '../../data/media.json';
import wikimedia from '../../data/wikimedia.json';
import news from '../../data/news.json';
import movement from '../../data/movement.json';
import corrections from '../../data/corrections.json';
import claimsFile from '../../data/claims.json';
import researchSources from '../../data/research/sources.json';
import { sourceRecord } from './fixtures';

const base = (p: Record<string, unknown> = {}) => sourceRecord(p);
const rules = (r: { errors: { rule: string }[] }) => r.errors.map((e) => e.rule);
const warnRules = (r: { warnings: { rule: string }[] }) => r.warnings.map((e) => e.rule);

describe('data validation', () => {
  it('the committed dataset has no errors', () => {
    const r = validate({ bases, media, wikimedia, news, movement, corrections, claims: claimsFile.claims, research: { sources: researchSources, candidates, checks, bsrReview } });
    expect(r.errors).toEqual([]);
  });

  it('every term of visualbases.org in the dataset is mapped or known', () => {
    const r = validate({ bases, media, wikimedia, news, movement, corrections, claims: claimsFile.claims, research: { sources: researchSources } });
    expect(warnRules(r)).not.toContain('term-unmapped');
    expect(mappedTerm('tag:some-new-tag')).toBe(false);
    expect(mappedTerm('cat:airfield')).toBe(true);
  });

  it('detects invalid, missing and null-island coordinates', () => {
    const r = validate({ bases: [base({ id: 'a', lat: 95 }), base({ id: 'b', lat: 0, lon: 0 }), base({ id: 'c', lat: undefined })] });
    expect(rules(r)).toEqual(expect.arrayContaining(['coords-range', 'coords-null-island', 'coords-missing']));
  });

  it('detects duplicate ids and duplicate positions unless reviewed', () => {
    const dup = validate({ bases: [base({ id: 'a' }), base({ id: 'b', lat: 49.4399 })] });
    expect(rules(dup)).toContain('duplicate-position');
    const reviewed = validate({ bases: [base({ id: 'a' }), base({ id: 'b', lat: 49.4399 })], corrections: { positions: [{ id: 'b', duplicateOf: 'a' }] } });
    expect(rules(reviewed)).not.toContain('duplicate-position');
    expect(rules(validate({ bases: [base(), base()] }))).toContain('duplicate-id');
  });

  it('checks countries, territories and every classification value against the vocabulary', () => {
    expect(validCountry('DE')).toBe(true);
    expect(validCountry('XK')).toBe(true);
    expect(validCountry('RP')).toBe(false);
    const r = validate({
      bases: [base({
        host: { country: 'RP' }, siteType: 'castle', status: 'maybe', features: ['ufo'], themes: ['drones'], activities: ['war'],
        organisations: ['warsaw-pact'], presences: [{ nation: 'XX', role: 'boss', via: 'guess' }],
      })],
    });
    expect(rules(r)).toEqual(expect.arrayContaining(['country-invalid', 'site-type', 'status', 'feature', 'theme', 'activity', 'organisation', 'nation-invalid', 'presence-role', 'presence-via']));
    expect(rules(validate({ bases: [base({ host: { country: 'GU' } })] }))).toContain('country-territory');
    expect(rules(validate({ bases: [base({ host: { country: 'FR', territory: 'GU' } })] }))).toContain('territory-invalid');
  });

  it('enforces the taxonomy rules', () => {
    // an overseas base needs an own territory of the stationing state
    expect(rules(validate({ bases: [base({ siteType: 'overseas-base' })] }))).toContain('rule-overseas');
    expect(rules(validate({ bases: [base({ siteType: 'overseas-base', host: { country: 'US', territory: 'GU' } })] }))).not.toContain('rule-overseas');
    // a domestic site with global role needs the host state itself
    expect(rules(validate({ bases: [base({ siteType: 'domestic-global', host: { country: 'US' }, presences: [] })] }))).toContain('rule-domestic');
    // a nation must not be listed twice
    expect(rules(validate({ bases: [base({ presences: [{ nation: 'US', role: 'stationing', via: 'tag' }, { nation: 'US', role: 'co-user', via: 'tag' }] })] }))).toContain('presence-duplicate');
    // provenance is mandatory
    expect(rules(validate({ bases: [base({ origin: { url: 'x' } })] }))).toContain('origin');
  });

  it('validates the claims layer and detects obsolete claims', () => {
    const claim = { id: 'c1', base: 'a', field: 'status', op: 'set', value: 'closed', status: 'accepted', decided: '2026-11-07', statement: { de: 'x', en: 'x' }, sources: ['https://example.org/s'] };
    const research = { sources: [{ base: 'a', url: 'https://example.org/s', type: 'media', verdict: 'contradicts', method: 'manual', summary: 's', supports: ['status'], accessed: '2026-11-07' }] };
    expect(validate({ bases: [base()], claims: [claim], research }).errors).toEqual([]);
    expect(rules(validate({ bases: [base({ status: 'closed' })], claims: [claim], research }))).toContain('claim-apply');
    expect(rules(validate({ bases: [base()], claims: [{ ...claim, sources: [] }], research }))).toContain('claim-source');
    expect(rules(validate({ bases: [base()], claims: [{ ...claim, value: 'gone' }], research }))).toContain('claim-value');
    expect(rules(validate({ bases: [base()], claims: [{ ...claim, decided: undefined }], research }))).toContain('claim-decided');
    expect(rules(validate({ bases: [base()], claims: [{ ...claim, base: 'nope' }], research }))).toContain('claim-base');
  });

  it('checks references, image files and licences', () => {
    const r = validate({
      bases: [base({ relations: [{ type: 'member-of', id: 'nope' }], images: [{ url: 'u1', caption: '' }] })],
      media: { u1: { src: 'media/x.webp', thumb: 'media/x-480.webp', credit: 'c' } },
      wikimedia: { a: { url: 'w', credit: 'Someone', license: 'All rights reserved', page: 'p' } },
      news: [{ title: 't', url: '%20https://x', date: '2026-13' }],
      fileExists: () => false,
    });
    expect(rules(r)).toEqual(expect.arrayContaining(['related', 'image-file', 'media-file', 'wikimedia-license', 'news-url']));
  });

  it('treats a malformed data file as an error, never as an empty one', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vb-read-'));
    await fs.writeFile(path.join(dir, 'ok.json'), '{"claims":[]}');
    await fs.writeFile(path.join(dir, 'broken.json'), '{"claims":[');
    expect(await readJson(path.join(dir, 'ok.json'), {})).toEqual({ claims: [] });
    expect(await readJson(path.join(dir, 'missing.json'), { fallback: true })).toEqual({ fallback: true });
    await expect(readJson(path.join(dir, 'broken.json'), {})).rejects.toThrow(/invalid JSON/);
    await fs.rm(dir, { recursive: true });
    // wrong shapes and an empty import are reported
    expect(rules(validate({ bases: {} }))).toContain('file-invalid');
    expect(rules(validate({ bases: [] }))).toContain('bases-empty');
    expect(rules(validate({ bases: [base()], claims: {} }))).toContain('file-invalid');
    expect(rules(validate({ bases: [base()], corrections: { positions: {} } }))).toContain('file-invalid');
  });

  it('checks precision and approximate positions on the resolved records', () => {
    const claim = { id: 'p1', base: 'a', field: 'position', op: 'set', value: { lat: 49.5, lon: 7.6, approx: true }, status: 'accepted', decided: '2026-11-07', statement: { de: 'x', en: 'x' }, sources: ['https://example.org/s'] };
    const research = { sources: [{ base: 'a', url: 'https://example.org/s', type: 'geodata', verdict: 'supports', method: 'manual', summary: 's', supports: ['position'], accessed: '2026-11-07' }] };
    const r = validate({ bases: [base()], claims: [claim], research });
    expect(r.errors).toEqual([]);
    // the claim sets a rounded, approximate position – both are reported, the raw record alone was fine
    expect(r.warnings.filter((w: { rule: string; msg: string }) => w.rule === 'coords-approx').map((w: { msg: string }) => w.msg)).toEqual(['approximate position (set by a position claim)']);
    expect(warnRules(r)).toContain('coords-precision');
    expect(r.stats.approximate).toBe(1);
    expect(warnRules(validate({ bases: [base()] }))).not.toContain('coords-precision');
  });

  it('counts only proposed corrections as unverified positions', () => {
    const positions = [
      { id: 'a', status: 'proposed', issue: 'imprecise' },
      { id: 'b', status: 'applied', issue: 'copied-coordinates' },
    ];
    const r = validate({ bases: [base(), base({ id: 'b', lat: 10 })], corrections: { positions } });
    expect(r.errors).toEqual([]);
    expect(r.stats.positionUnverified).toBe(1);
  });

  it('validates the schema of data/corrections.json', () => {
    const v = (entry: Record<string, unknown>) => rules(validate({ bases: [base()], corrections: { positions: [{ id: 'a', status: 'proposed', issue: 'imprecise', ...entry }] } }));
    expect(v({})).not.toContain('corrections');
    expect(v({ status: 'maybe' })).toContain('corrections');
    expect(v({ issue: 'odd' })).toContain('corrections');
    expect(v({ proposal: { lat: 49, lon: 7, precision: 'town', source: 'OSM', url: 'https://www.openstreetmap.org/node/1', retrieved: '2026-11-07' } })).not.toContain('corrections');
    expect(v({ proposal: { lat: 49, lon: 7, precision: 'street', source: 'OSM', url: 'https://www.openstreetmap.org/node/1' } })).toContain('corrections');
    expect(v({ proposal: { lat: 49, lon: 7, source: 'OSM', url: 'osm' } })).toContain('corrections');
    // confirmed = editorial decision, needs its own evidence
    expect(v({ status: 'confirmed', issue: 'shared-site' })).toContain('corrections');
    expect(v({ status: 'confirmed', issue: 'shared-site', source: 'Garrison website', url: 'https://example.org', retrieved: '2026-11-07' })).not.toContain('corrections');
  });

  it('does not exempt a special facility from duplicate checks without a relation', () => {
    const facility = base({ id: 'f', siteType: 'special-facility', lat: 49.4399 });
    const r = validate({ bases: [base(), facility] });
    expect(rules(r)).not.toContain('duplicate-position');
    expect(warnRules(r)).toContain('duplicate-position-facility');
    // with a relation (or as part of an aggregate) the shared position is expected
    expect(warnRules(validate({ bases: [base(), { ...facility, relations: [{ type: 'part-of', id: 'a' }] }] }))).toContain('duplicate-position-linked');
    expect(warnRules(validate({ bases: [base(), base({ id: 'g', siteType: 'garrison', lat: 49.4399 })] }))).toContain('duplicate-position-linked');
    // an accepted "duplicate-entry" note settles even a plain duplicate
    const note = { id: 'd1', base: 'b', field: 'issues', op: 'add', value: 'duplicate-entry', status: 'accepted', decided: '2026-11-07', statement: { de: 'x', en: 'x' }, sources: ['https://example.org/s'] };
    const research = { sources: [{ base: 'b', url: 'https://example.org/s', type: 'media', verdict: 'supports', method: 'manual', summary: 's', supports: ['presence'], accessed: '2026-11-07' }] };
    const settled = validate({ bases: [base(), base({ id: 'b', lat: 49.4399 })], claims: [note], research });
    expect(rules(settled)).not.toContain('duplicate-position');
    expect(warnRules(settled)).toContain('duplicate-position-reviewed');
  });

  it('exports only proposed corrections as unverified positions', () => {
    const issue = 'duplicate-in-source';
    expect(CSV_COLUMNS.position_check({ positionCheck: { status: 'proposed', issue } })).toBe(`unverified:${issue}`);
    expect(CSV_COLUMNS.position_check({ positionCheck: { status: 'confirmed', issue: 'shared-site' } })).toBe('');
    expect(CSV_COLUMNS.position_check({ positionCheck: { status: 'applied', issue }, approx: true })).toBe('approximate');
  });

  it('warns (does not fail) on weak sourcing and on review notes', () => {
    const r = validate({ bases: [base({ sources: [], wikipedia: { en: 'https://en.wikipedia.org/wiki/X' } }), base({ id: 'b', lat: 10, sources: [], presences: [] })] });
    expect(r.errors).toEqual([]);
    expect(warnRules(r)).toEqual(expect.arrayContaining(['sources-wikipedia-only', 'sources-none', 'issue-nation-missing']));
    expect(report(r, '2026-01-01')).toContain('nur Wikipedia | 1');
  });
});
