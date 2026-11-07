import { describe, expect, it, vi } from 'vitest';
import { buildSearchUrl, createGeocoder, decide, normalizeResults, parseQuery, parseGeocoderConfig, DEFAULT_ENDPOINT, type GeocodeOutcome } from './geocode';
// Recorded once from the public Nominatim instance (2026-11-07) – tests never call the live service
import pc56068any from './fixtures/nominatim/postcode-56068-any.json';
import pc56068de from './fixtures/nominatim/postcode-56068-de.json';
import pc10115de from './fixtures/nominatim/postcode-10115-de.json';
import pcSw1a from './fixtures/nominatim/postcode-sw1a1aa-gb.json';
import pc75008fr from './fixtures/nominatim/postcode-75008-fr.json';
import pcNone from './fixtures/nominatim/postcode-99999x-any.json';
import qFrankfurt from './fixtures/nominatim/q-frankfurt.json';
import qKoblenz from './fixtures/nominatim/q-koblenz.json';
import qGermany from './fixtures/nominatim/q-deutschland.json';
import q56068Koblenz from './fixtures/nominatim/q-56068-koblenz.json';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** fake fetch: routes a request URL to a fixture by its query parameters */
function fakeFetch(route: (u: URL) => Response | Promise<Response>) {
  return vi.fn(async (input: RequestInfo | URL) => route(new URL(String(input))));
}
const noWait = { minIntervalMs: 0, storage: null };

describe('parseQuery', () => {
  it('recognises postcodes of different countries', () => {
    for (const pc of ['56068', '10115', '1010', '75008', 'SW1A 1AA', '1012 AB', 'K1A 0B1', '00-950', '100-0001', '01310-100']) {
      expect(parseQuery(pc), pc).toMatchObject({ postcode: pc, rest: '', countryCode: null });
    }
  });
  it('keeps place names as free text', () => {
    expect(parseQuery('  Frankfurt ')).toMatchObject({ postcode: null, rest: 'Frankfurt', countryCode: null });
    expect(parseQuery('56068 Koblenz')).toMatchObject({ postcode: '56068', rest: '56068 Koblenz' });
  });
  it('reads country hints in several notations', () => {
    expect(parseQuery('DE-56068')).toMatchObject({ postcode: '56068', countryCode: 'DE', rest: '' });
    expect(parseQuery('D-56068')).toMatchObject({ postcode: '56068', countryCode: 'DE', rest: '' });
    expect(parseQuery('56068 DE')).toMatchObject({ postcode: '56068', countryCode: 'DE', rest: '' });
    expect(parseQuery('56068, Deutschland')).toMatchObject({ postcode: '56068', countryCode: 'DE', rest: '' });
    expect(parseQuery('75008 France')).toMatchObject({ postcode: '75008', countryCode: 'FR', rest: '' });
    expect(parseQuery('Koblenz, Schweiz')).toMatchObject({ postcode: null, countryCode: 'CH', rest: 'Koblenz' });
  });
});

describe('buildSearchUrl', () => {
  it('uses a structured postcode search with full address details', () => {
    const u = new URL(buildSearchUrl(DEFAULT_ENDPOINT, parseQuery('56068'), { lang: 'de' }));
    expect(u.origin + u.pathname).toBe('https://nominatim.openstreetmap.org/search');
    expect(Object.fromEntries(u.searchParams)).toEqual({ format: 'jsonv2', addressdetails: '1', limit: '10', 'accept-language': 'de', postalcode: '56068' });
  });
  it('restricts to a country from the input or from the country selector', () => {
    expect(new URL(buildSearchUrl(DEFAULT_ENDPOINT, parseQuery('DE-56068'), { lang: 'de' })).searchParams.get('countrycodes')).toBe('de');
    const u = new URL(buildSearchUrl(DEFAULT_ENDPOINT, parseQuery('Frankfurt'), { lang: 'en', countryCode: 'DE' }));
    expect(u.searchParams.get('q')).toBe('Frankfurt');
    expect(u.searchParams.get('countrycodes')).toBe('de');
    expect(u.searchParams.has('postalcode')).toBe(false);
  });
});

describe('normalizeResults', () => {
  it('maps Nominatim results to places with locality, region, country and precision', () => {
    const { places, invalid } = normalizeResults(pc56068any);
    expect(invalid).toBe(0);
    expect(places.map((p) => [p.countryCode, p.locality, p.region, p.postcode, p.precision])).toEqual([
      ['US', 'Minnesota Lake', 'Minnesota', '56068', 'postcode'],
      ['DE', 'Koblenz', 'Rheinland-Pfalz', '56068', 'postcode'],
    ]);
    expect(places[1]).toMatchObject({ lat: 50.3533174, lon: 7.5949023, country: 'Deutschland', osm: { type: 'relation', id: 1109048 }, source: 'nominatim' });
    expect(normalizeResults(qGermany).places[0].precision).toBe('country');
    expect(normalizeResults(qKoblenz).places.map((p) => p.precision)).toEqual(['locality', 'locality']);
  });
  it('drops results with missing or invalid coordinates and counts them', () => {
    const [ok] = pc56068de as Record<string, unknown>[];
    const broken = [{ ...ok, lat: undefined }, { ...ok, lat: 'abc' }, { ...ok, lon: '200' }, { ...ok, lat: '' }, { ...ok }];
    const { places, invalid } = normalizeResults(broken);
    expect(invalid).toBe(4);
    expect(places).toHaveLength(1);
  });
  it('rejects a response that is not a list', () => {
    expect(() => normalizeResults({ error: 'x' })).toThrow();
  });
});

describe('decide: never take the first hit unchecked', () => {
  it('unique German postcode (with country) → one place', () => {
    const r = decide(parseQuery('DE-56068'), normalizeResults(pc56068de).places);
    expect(r).toMatchObject({ kind: 'unique', place: { locality: 'Koblenz', region: 'Rheinland-Pfalz', countryCode: 'DE', postcode: '56068' } });
  });
  it('postcode without country that exists in several countries → user must choose', () => {
    const r = decide(parseQuery('56068'), normalizeResults(pc56068any).places);
    expect(r.kind).toBe('ambiguous');
    if (r.kind === 'ambiguous') expect(r.options.map((p) => p.countryCode).sort()).toEqual(['DE', 'US']);
  });
  it('several plausible places for a name → user must choose (Frankfurt am Main / Oder)', () => {
    const r = decide(parseQuery('Frankfurt'), normalizeResults(qFrankfurt).places);
    expect(r.kind).toBe('ambiguous');
  });
  it('a clearly dominant hit is used, the others stay available as alternatives', () => {
    const r = decide(parseQuery('Koblenz'), normalizeResults(qKoblenz).places);
    expect(r).toMatchObject({ kind: 'unique', place: { countryCode: 'DE' } });
    if (r.kind === 'unique') expect(r.alternatives.map((p) => p.countryCode)).toEqual(['CH']);
  });
  it('postcode plus town is unique', () => {
    expect(decide(parseQuery('56068 Koblenz'), normalizeResults(q56068Koblenz).places)).toMatchObject({ kind: 'unique', place: { locality: 'Koblenz' } });
  });
  it('a whole country is too coarse for a distance', () => {
    expect(decide(parseQuery('Deutschland'), normalizeResults(qGermany).places).kind).toBe('too-coarse');
  });
  it('no results → not found', () => {
    expect(decide(parseQuery('99999X'), normalizeResults(pcNone).places).kind).toBe('not-found');
  });
});

describe('createGeocoder', () => {
  it('international postcodes resolve to the right country', async () => {
    const fetch = fakeFetch((u) => json(u.searchParams.get('countrycodes') === 'gb' ? pcSw1a : pc75008fr));
    const g = createGeocoder({ fetch, ...noWait });
    expect(await g.search('SW1A 1AA', { lang: 'en', countryCode: 'GB' })).toMatchObject({ kind: 'unique', place: { countryCode: 'GB', postcode: 'SW1A 1AA', locality: 'City of Westminster' } });
    expect(await g.search('75008', { lang: 'de', countryCode: 'FR' })).toMatchObject({ kind: 'unique', place: { countryCode: 'FR', locality: 'Paris' } });
  });
  it('Berlin 10115 with country hint', async () => {
    const g = createGeocoder({ fetch: fakeFetch(() => json(pc10115de)), ...noWait });
    expect(await g.search('10115 DE', { lang: 'de' })).toMatchObject({ kind: 'unique', place: { locality: 'Berlin', countryCode: 'DE' } });
  });
  it('ambiguous postcode end to end', async () => {
    const g = createGeocoder({ fetch: fakeFetch(() => json(pc56068any)), ...noWait });
    expect((await g.search('56068', { lang: 'de' })).kind).toBe('ambiguous');
  });
  it('unknown postcode → not found', async () => {
    const g = createGeocoder({ fetch: fakeFetch(() => json(pcNone)), ...noWait });
    expect((await g.search('99999X', { lang: 'de' })).kind).toBe('not-found');
  });
  it('only invalid coordinates in the response → error, no position', async () => {
    const g = createGeocoder({ fetch: fakeFetch(() => json([{ ...pc56068de[0], lat: 'NaN' }])), ...noWait });
    expect(await g.search('56068', { lang: 'de' })).toEqual({ kind: 'error', code: 'invalid-response' });
  });
  it.each([
    [429, 'rate-limit'], [503, 'rate-limit'], [403, 'blocked'], [500, 'service'],
  ] as const)('HTTP %i → %s', async (status, code) => {
    const g = createGeocoder({ fetch: fakeFetch(() => json({ error: 'x' }, status)), ...noWait });
    expect(await g.search('56068', { lang: 'de' })).toEqual({ kind: 'error', code });
  });
  it('network failure and broken JSON are reported as such', async () => {
    const offline = createGeocoder({ fetch: vi.fn(async () => { throw new TypeError('Failed to fetch'); }), ...noWait });
    expect(await offline.search('56068', { lang: 'de' })).toEqual({ kind: 'error', code: 'network' });
    const broken = createGeocoder({ fetch: fakeFetch(() => new Response('<html>', { status: 200 })), ...noWait });
    expect(await broken.search('56068', { lang: 'de' })).toEqual({ kind: 'error', code: 'invalid-response' });
  });
  it('times out', async () => {
    const hang = vi.fn((_: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const g = createGeocoder({ fetch: hang, ...noWait, timeoutMs: 20 });
    expect(await g.search('56068', { lang: 'de' })).toEqual({ kind: 'error', code: 'timeout' });
  });
  it('caches answers: the same search does not hit the service twice', async () => {
    const fetch = fakeFetch(() => json(pc56068de));
    const g = createGeocoder({ fetch, ...noWait });
    await g.search('DE-56068', { lang: 'de' });
    await g.search(' DE-56068 ', { lang: 'de' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('does not cache errors', async () => {
    let n = 0;
    const fetch = fakeFetch(() => (n++ === 0 ? json({}, 429) : json(pc56068de)));
    const g = createGeocoder({ fetch, ...noWait });
    expect((await g.search('DE-56068', { lang: 'de' })).kind).toBe('error');
    expect((await g.search('DE-56068', { lang: 'de' })).kind).toBe('unique');
  });
  it('keeps at least the minimum interval between requests', async () => {
    let clock = 0;
    const waits: number[] = [];
    const g = createGeocoder({
      fetch: fakeFetch(() => json(pcNone)), storage: null, minIntervalMs: 1000,
      now: () => clock, sleep: async (ms) => { waits.push(ms); clock += ms; },
    });
    await g.search('11111', { lang: 'de' });
    clock += 300;
    await g.search('22222', { lang: 'de' });
    expect(waits).toEqual([700]);
  });
  it('a newer search cancels the pending one', async () => {
    let release: (r: Response) => void = () => {};
    const fetch = vi.fn((_: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
      release = resolve;
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const g = createGeocoder({ fetch, ...noWait });
    const first = g.search('11111', { lang: 'de' });
    await Promise.resolve();
    const second = g.search('DE-56068', { lang: 'de' });
    await new Promise((r) => setTimeout(r, 0));
    release(json(pc56068de));
    expect(await first).toEqual({ kind: 'aborted' } satisfies GeocodeOutcome);
    expect((await second).kind).toBe('unique');
  });
  it('can be switched off by configuration', async () => {
    const fetch = fakeFetch(() => json(pc56068de));
    const g = createGeocoder({ fetch, ...noWait, enabled: false });
    expect(await g.search('56068', { lang: 'de' })).toEqual({ kind: 'error', code: 'disabled' });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('parseGeocoderConfig', () => {
  it('accepts a https endpoint and the on/off switch, falls back to defaults otherwise', () => {
    expect(parseGeocoderConfig({ enabled: false, endpoint: 'https://geo.example.org/' })).toEqual({ enabled: false, endpoint: 'https://geo.example.org' });
    expect(parseGeocoderConfig({ endpoint: 'http://insecure.example.org' })).toEqual({ enabled: true, endpoint: DEFAULT_ENDPOINT });
    expect(parseGeocoderConfig(null)).toEqual({ enabled: true, endpoint: DEFAULT_ENDPOINT });
  });
});
