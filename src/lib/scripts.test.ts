import { describe, expect, it } from 'vitest';
// @ts-expect-error – plain ESM build scripts without type declarations
import { parseDate, parseNewsPage } from '../../scripts/import-news.mjs';
// @ts-expect-error – plain ESM build scripts without type declarations
import { classify } from '../../scripts/build-media.mjs';
// @ts-expect-error – plain ESM build scripts without type declarations
import { parseImages, toBase } from '../../scripts/import-visualbases.mjs';

describe('news import', () => {
  it('parses German and English date formats', () => {
    expect(parseDate('Infosperber | 27.9.26 |')).toBe('2026-09-27');
    expect(parseDate('Space4peace.blogspot – Sept 28, 2026')).toBe('2026-09-28');
    expect(parseDate('Asia Times – Mar 3, 2025')).toBe('2025-03-03');
    expect(parseDate('July 2021')).toBe('2021-07');
    expect(parseDate('no date')).toBeNull();
  });
  it('extracts title, teaser, source and date from a paragraph', () => {
    const html = '<div class="entry-content single-content"><h3>2026</h3><p><a href="https://example.org/a">Six months of <strong>US bombers</strong></a><br /> Teaser text here.<br /> Space4peace.blogspot &#8211; Sept 28, 2026</p></div></article>';
    const [n] = parseNewsPage(html, 'en');
    expect(n).toMatchObject({ title: 'Six months of US bombers', teaser: 'Teaser text here.', source: 'Space4peace.blogspot', date: '2026-09-28', url: 'https://example.org/a' });
  });
});

describe('media import', () => {
  it('classifies images by file name', () => {
    expect(classify('GE_Ramstein_10-2000.png', 'Google Earth 2000')).toMatchObject({ type: 'satellite', year: 2000 });
    expect(classify('GE_Redzikowo_20212020.png', 'Google Earth 2021')).toMatchObject({ type: 'satellite', year: 2021 });
    expect(classify('OSB_Ramstein_complete_13.png').type).toBe('map');
    expect(classify('campaign_Buchel.jpg').type).toBe('logo');
    expect(classify('2021-05-30_Stopp-Ramstein_Fahrradmarathon.jpeg').type).toBe('photo');
  });
  it('only keeps the project’s own uploads and full-size links', () => {
    const body = '<a href="https://visualbases.org/wp-content/uploads/GE_X_2021.png"><img src="https://visualbases.org/wp-content/uploads/GE_X_2021-150x150.png" /></a><figcaption>Google Earth 2021</figcaption>'
      + '<img src="https://visualbases.org/wp-content/uploads/pin_osb-1.png" /><img src="https://example.org/foreign.jpg" />';
    expect(parseImages(body)).toEqual([{ url: 'https://visualbases.org/wp-content/uploads/GE_X_2021.png', caption: 'Google Earth 2021' }]);
  });
});

describe('base import', () => {
  it('derives country, kind and US presence', () => {
    const b = toBase({ slug: 'x', title: 'UK | RAF Lakenheath', cats: ['foreign-bases', 'airfield', 'uk'], tags: ['bsr'], lat: 52.4, lon: 0.56, zoom: 14, approx: false, wikipedia: {}, related: [], sources: [], notes: [], images: [] }, '2026-01-01T00:00:00');
    expect(b).toMatchObject({ country: 'GB', name: 'RAF Lakenheath', kind: 'foreign', facilities: ['airfield'], nations: ['US'], region: 'united-kingdom', lastmod: '2026-01-01' });
  });
});
