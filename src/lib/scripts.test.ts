import { describe, expect, it } from 'vitest';
// @ts-expect-error – plain ESM build scripts without type declarations
import { parseDate, parseNewsPage } from '../../scripts/import-news.mjs';
// @ts-expect-error – plain ESM build scripts without type declarations
import { classify } from '../../scripts/build-media.mjs';
// @ts-expect-error – plain ESM build scripts without type declarations
import { parseImages, toBase, parsePost, resolveCopiedCoordinates, typeRelations } from '../../scripts/import-visualbases.mjs';

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
  const post = (title: string, cats: string[], tags: string[] = []) =>
    toBase({ slug: 'x', title, cats, tags, lat: 52.4, lon: 0.56, zoom: 14, approx: false, wikipedia: {}, related: [], sources: [], notes: [], images: [] }, '2026-01-01T00:00:00');
  it('derives host, site type, status, presences and features and keeps the raw terms', () => {
    const b = post('UK | RAF Lakenheath', ['foreign-bases', 'airfield', 'uk'], ['bsr']);
    expect(b).toMatchObject({
      host: { country: 'GB' }, name: 'RAF Lakenheath', siteType: 'foreign-base', status: 'active', features: ['airfield'],
      presences: [{ nation: 'US', role: 'stationing', via: 'bsr' }], region: 'united-kingdom', listedIn: ['bsr'],
      origin: { lastmod: '2026-01-01', terms: { categories: ['foreign-bases', 'airfield', 'uk'], tags: ['bsr'] } },
    });
  });
  it('treats "Closed Base" as a status, not as a site type', () => {
    expect(post('CA | Argentia', ['closed', 'airfield'], ['us'])).toMatchObject({ siteType: 'military-base', status: 'closed' });
    expect(post('IQ | Al Asad', ['closed', 'foreign-bases'], ['us'])).toMatchObject({ siteType: 'foreign-base', status: 'closed' });
  });
  it('separates host country and territory and recognises own overseas territories', () => {
    expect(post('PR | Aguada', ['foreign-bases'], ['us'])).toMatchObject({ host: { country: 'US', territory: 'PR' }, siteType: 'overseas-base' });
    expect(post('US | Guam: Naval Base', ['foreign-bases'], ['us'])).toMatchObject({ host: { country: 'US', territory: 'GU' }, siteType: 'overseas-base' });
    expect(post('GL | Pituffik Air Base', ['foreign-bases'], ['us'])).toMatchObject({ host: { country: 'DK', territory: 'GL' }, siteType: 'foreign-base' });
    expect(post('FR | Martinique: Pôle', ['foreign-bases'], ['fr'])).toMatchObject({ host: { country: 'FR', territory: 'MQ' }, siteType: 'overseas-base' });
  });
  it('maps "Use:" tags to functions and infrastructure, "Active:" tags to activities', () => {
    const b = post('DE | X', ['shared-bases', 'telecommunications'], ['listening', 'fac_radar', 'defender-2020', 'defender-2021', 'atlantic-resolve', 'campaign', 'nato', 'de']);
    expect(b.features).toEqual(['telecom-station', 'signals-intelligence', 'radar-station']);
    expect(b.activities).toEqual(['defender-europe-20', 'defender-europe-21', 'atlantic-resolve']);
    expect(b.themes).toEqual(['resistance']);
    expect(b.organisations).toEqual(['nato']);
    expect(b.presences).toEqual([{ nation: 'DE', role: 'co-user', via: 'tag' }]);
  });
  it('derives the US presence of "USA Global Base" and summary entries', () => {
    expect(post('US | Hawaii: Lualualei', ['us-global', 'telecommunications'], ['fac_radar'])).toMatchObject({ siteType: 'domestic-global', presences: [{ nation: 'US', via: 'site-type' }] });
    expect(post('DE | U.S. Army Garrison Ansbach (Σ)', ['meta-site'], ['us']).siteType).toBe('garrison');
    expect(post('JP | Okinawa (Σ)', ['meta-site'], ['us']).siteType).toBe('region-cluster');
    expect(post('SE | Overview new US access in Sweden', ['shared-bases']).siteType).toBe('region-cluster');
  });
  it('types the untyped "related" links', () => {
    const list = [
      { id: 'g', siteType: 'garrison', related: [{ slug: 'm' }] },
      { id: 'm', siteType: 'foreign-base' },
      { id: 'f', siteType: 'special-facility', related: ['m'] },
      { id: 'n', siteType: 'foreign-base', related: ['m'] },
    ];
    const out = typeRelations(list);
    expect(out.find((b: { id: string }) => b.id === 'm').relations).toEqual([{ type: 'member-of', id: 'g' }]);
    expect(out.find((b: { id: string }) => b.id === 'f').relations).toEqual([{ type: 'part-of', id: 'm' }]);
    expect(out.find((b: { id: string }) => b.id === 'n').relations).toEqual([{ type: 'related', id: 'm' }]);
    expect(out.find((b: { id: string }) => b.id === 'g').relations).toBeUndefined();
  });
});

describe('coordinates', () => {
  const post = (slug: string, links: string[]) =>
    `<article class="post category-europe"><h1 class="entry-title">IT | ${slug}</h1><div class="entry-content single-content">${links
      .map((l) => `<a href="https://www.openstreetbrowser.org/#map=13/${l}&categories=military">x</a>`)
      .join('')}</div></article>`;
  it('takes the post’s own map link when the first one belongs to another post', () => {
    const aviano = parsePost(post('aviano', ['46.0348/12.5963']), 'aviano');
    const ghedi = parsePost(post('ghedi', ['46.0348/12.5963', '45.4310/10.2981']), 'ghedi');
    expect(resolveCopiedCoordinates([aviano, ghedi])).toEqual(['ghedi']);
    expect([ghedi.lat, ghedi.lon]).toEqual([45.431, 10.2981]);
    expect([aviano.lat, aviano.lon]).toEqual([46.0348, 12.5963]);
  });
  it('leaves identical coordinates alone if there is no alternative link', () => {
    const a = parsePost(post('a', ['14.3820/-87.6179']), 'a');
    const b = parsePost(post('b', ['14.3820/-87.6179']), 'b');
    expect(resolveCopiedCoordinates([a, b])).toEqual([]);
  });
  it('normalises outdated country codes', () => {
    const base = (title: string) => toBase({ slug: 'x', title, cats: [], tags: [], lat: 1, lon: 1, zoom: 14, approx: false, wikipedia: {}, related: [], sources: [], notes: [], images: [] }, undefined);
    expect(base('RP | Mount Santa Rita').host.country).toBe('PH');
    expect(base('UK | RAF Fairford').host.country).toBe('GB');
    expect(base('RKS | Camp Bondsteel').host.country).toBe('XK');
  });
});

describe('node scripts', () => {
  it('load in plain Node (type stripping needs explicit .ts imports down the chain)', async () => {
    // @ts-expect-error – Node built-ins are untyped here (no @types/node dependency)
    const { execFileSync } = await import('node:child_process');
    const files = ['scripts/research/wikidata.mjs', 'scripts/research/osm-check.mjs', 'scripts/research/bsr.mjs', 'scripts/research/wiki-refs.mjs', 'scripts/research/summarize.mjs', 'scripts/research/merge.mjs', 'scripts/validate-data.mjs', 'scripts/migration-report.mjs', 'scripts/lib/resolve.mjs', 'scripts/lib/export.mjs'];
    const code = `for (const f of ${JSON.stringify(files)}) await import('./' + f);`;
    expect(() => execFileSync('node', ['--input-type=module', '-e', code], { stdio: 'pipe' })).not.toThrow();
  });
});

describe('exports', () => {
  it('carry the CC BY 4.0 licence and the new classification', async () => {
    // @ts-expect-error – Node built-ins are untyped here (no @types/node dependency)
    const { execSync } = await import('node:child_process');
    // @ts-expect-error – see above
    const fs = await import('node:fs');
    execSync('node scripts/build-data.mjs', { stdio: 'ignore' });
    const geo = JSON.parse(fs.readFileSync('public/data/bases.geojson', 'utf8'));
    expect(geo.metadata.license).toBe('CC-BY-4.0');
    expect(geo.metadata.schema).toBe('visualbases-taxonomy-v2');
    expect(geo.metadata.attribution).toContain('visualbases.org');
    expect(geo.features).toHaveLength(geo.metadata.count);
    const f = geo.features.find((x: { id: string }) => x.id === 'buechel-nato-air-base');
    expect(f.properties).toMatchObject({ siteType: 'shared-base', status: 'active', host: { country: 'DE' }, features: ['airfield', 'nuclear-sharing'] });
    expect(f.properties.lat).toBeUndefined();
    expect(fs.readFileSync('public/data/LICENSE.txt', 'utf8')).toContain('CC BY 4.0');

    const csv: string[] = fs.readFileSync('public/data/bases.csv', 'utf8').replace(/^\ufeff/, '').trim().split('\n');
    const head = csv[0].split(',');
    expect(head).toEqual(expect.arrayContaining(['id', 'host_country', 'host_territory', 'site_type', 'status', 'stationing_nations', 'co_users', 'infrastructure', 'civil_use', 'functions', 'arrangements', 'themes', 'activities', 'evidence', 'corrections', 'issues']));
    expect(csv.length - 1).toBe(geo.metadata.count);
    const row = csv.find((l) => l.startsWith('buechel-nato-air-base,'))!.split(',');
    expect(row[head.indexOf('infrastructure')]).toBe('airfield');
    expect(row[head.indexOf('arrangements')]).toBe('nuclear-sharing');

    const tax = JSON.parse(fs.readFileSync('public/data/taxonomy.json', 'utf8'));
    expect(tax.siteType.map((t: { id: string }) => t.id)).toContain('shared-base');
  });
});
