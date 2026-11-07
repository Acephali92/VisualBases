import { describe, expect, it } from 'vitest';
// @ts-expect-error – plain ESM build script without type declarations
import { validate, validCountry, report } from '../../scripts/validate-data.mjs';
import bases from '../../data/bases.json';
import media from '../../data/media.json';
import wikimedia from '../../data/wikimedia.json';
import news from '../../data/news.json';
import movement from '../../data/movement.json';
import corrections from '../../data/corrections.json';

const base = (p: Record<string, unknown> = {}) => ({
  id: 'a', name: 'A', country: 'DE', lat: 49.4398, lon: 7.6019, kind: 'foreign', facilities: [], themes: [], nations: ['US'],
  sharedWith: [], sources: [{ url: 'https://example.org', label: 'x' }], notes: [], continent: 'europe', ...p,
});
const rules = (r: { errors: { rule: string }[] }) => r.errors.map((e) => e.rule);

describe('data validation', () => {
  it('the committed dataset has no errors', () => {
    const r = validate({ bases, media, wikimedia, news, movement, corrections });
    expect(r.errors).toEqual([]);
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

  it('checks countries and categories', () => {
    expect(validCountry('DE')).toBe(true);
    expect(validCountry('XK')).toBe(true);
    expect(validCountry('RP')).toBe(false);
    const r = validate({ bases: [base({ country: 'RP', kind: 'castle', facilities: ['ufo'], themes: ['x'] })] });
    expect(rules(r)).toEqual(expect.arrayContaining(['country-invalid', 'kind', 'facility', 'theme']));
  });

  it('checks references, image files and licences', () => {
    const r = validate({
      bases: [base({ related: ['nope'], images: [{ url: 'u1' }] })],
      media: { u1: { src: 'media/x.webp', thumb: 'media/x-480.webp', credit: 'c' } },
      wikimedia: { a: { url: 'w', credit: 'Someone', license: 'All rights reserved', page: 'p' } },
      news: [{ title: 't', url: '%20https://x', date: '2026-13' }],
      fileExists: () => false,
    });
    expect(rules(r)).toEqual(expect.arrayContaining(['related', 'image-file', 'media-file', 'wikimedia-license', 'news-url']));
  });

  it('warns (does not fail) on weak sourcing', () => {
    const r = validate({ bases: [base({ sources: [], wikipedia: { en: 'https://en.wikipedia.org/wiki/X' } }), base({ id: 'b', lat: 10, sources: [] })] });
    expect(r.errors).toEqual([]);
    expect(r.warnings.map((w: { rule: string }) => w.rule)).toEqual(expect.arrayContaining(['sources-wikipedia-only', 'sources-none']));
    expect(report(r, '2026-01-01')).toContain('nur Wikipedia | 1');
  });
});
