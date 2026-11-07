/**
 * Place search for "Your base" (#/near) via OpenStreetMap Nominatim.
 *
 * Pure parsing / decision functions plus a small client (cache, throttling, cancellation, timeout).
 * The public Nominatim instance has a usage policy (max. 1 request/s for the whole application, results
 * must be cached, no search-as-you-type, attribution, switchable at any time) – see docs/GEOCODING.md.
 * The client only runs on explicit submit, caches every answer and can be switched off or pointed at
 * another endpoint through public/config/geocoder.json without a code change.
 *
 * Decision rule: the first hit is never taken unchecked. A postcode that exists in several countries,
 * or a name with several plausible places, makes the user choose; a whole country is too coarse.
 */
import { distanceKm, isValidCoord } from './geo';

export const DEFAULT_ENDPOINT = 'https://nominatim.openstreetmap.org';

export type GeoPrecision = 'address' | 'postcode' | 'locality' | 'region' | 'country';

export interface GeoPlace {
  lat: number;
  lon: number;
  /** name of the hit itself (may be the postcode) */
  name: string;
  postcode?: string;
  /** city, town, village … */
  locality?: string;
  /** state / region / county */
  region?: string;
  country?: string;
  /** ISO 3166-1 alpha-2, upper case */
  countryCode?: string;
  precision: GeoPrecision;
  displayName: string;
  importance?: number;
  osm?: { type: string; id: number };
  source: 'nominatim' | 'device';
  /** device location: accuracy reported by the browser, in metres */
  accuracyM?: number;
}

export type GeoErrorCode = 'network' | 'timeout' | 'rate-limit' | 'blocked' | 'service' | 'invalid-response' | 'disabled';

export type GeocodeOutcome =
  | { kind: 'unique'; place: GeoPlace; alternatives: GeoPlace[] }
  | { kind: 'ambiguous'; options: GeoPlace[] }
  | { kind: 'not-found' }
  | { kind: 'too-coarse'; place: GeoPlace }
  | { kind: 'error'; code: GeoErrorCode }
  | { kind: 'aborted' };

/* ------------------------------------------------------------------ parsing */

export interface ParsedQuery {
  /** the whole input, trimmed */
  input: string;
  /** postcode found in the input (alone or next to a place name) */
  postcode: string | null;
  /** country from the input ("DE-56068", "56068 DE", "Koblenz, Schweiz") */
  countryCode: string | null;
  /** free text to search for; empty if the input is only a postcode (+ country) */
  rest: string;
}

/** postcode formats: numeric (most countries, also with one separator: PL, PT, JP, BR, SE, CZ …), GB, CA, NL, IE, MT */
const POSTCODE = [
  /^\d{3,7}$/,
  /^\d{2,5}[- ]\d{2,4}$/,
  /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
  /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i,
  /^\d{4} ?[A-Z]{2}$/i,
  /^[A-Z]\d{2} ?[A-Z\d]{4}$/i,
  /^[A-Z]{3} ?\d{4}$/i,
];
export const isPostcode = (s: string) => POSTCODE.some((re) => re.test(s));

/** international vehicle codes still used in front of postcodes ("D-56068", "A-1010") */
const PREFIX_ALIAS: Record<string, string> = { D: 'DE', A: 'AT', F: 'FR', I: 'IT', B: 'BE', L: 'LU', S: 'SE', N: 'NO', FL: 'LI', DK: 'DK', NL: 'NL', CH: 'CH', PL: 'PL', CZ: 'CZ', E: 'ES', P: 'PT' };
const NAME_ALIAS: Record<string, string> = { usa: 'US', uk: 'GB', england: 'GB', scotland: 'GB', wales: 'GB', 'great britain': 'GB', grossbritannien: 'GB', holland: 'NL', suisse: 'CH', svizzera: 'CH' };
/** pseudo regions and withdrawn ISO codes (FX would shadow FR, CS/YU Serbia …) */
const NOT_A_COUNTRY = new Set(['EU', 'EZ', 'UN', 'QO', 'XA', 'XB', 'ZZ', 'FX', 'CS', 'DD', 'SU', 'YU', 'ZR', 'TP', 'AN', 'BU', 'NT', 'QU']);

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').toLowerCase().trim();

let countryIndex: Map<string, string> | null = null;
let isoCodes: Set<string> | null = null;
/** ISO alpha-2 codes and their German and English names, built once from Intl.DisplayNames */
function countries() {
  if (countryIndex && isoCodes) return { names: countryIndex, codes: isoCodes };
  countryIndex = new Map(Object.entries(NAME_ALIAS));
  isoCodes = new Set();
  const dn = ['de', 'en'].map((l) => { try { return new Intl.DisplayNames([l], { type: 'region', fallback: 'none' }); } catch { return null; } });
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const cc = String.fromCharCode(a, b);
      if (NOT_A_COUNTRY.has(cc)) continue;
      for (const d of dn) {
        let name: string | undefined;
        try { name = d?.of(cc); } catch { name = undefined; }
        if (name && name !== cc) {
          isoCodes.add(cc);
          if (!countryIndex.has(fold(name))) countryIndex.set(fold(name), cc);
        }
      }
    }
  }
  return { names: countryIndex, codes: isoCodes };
}

/** "Deutschland", "germany", "DE" → "DE" */
export function countryCodeOf(s: string, allowCode = true): string | null {
  const { names, codes } = countries();
  const t = s.trim();
  if (allowCode && /^[A-Z]{2}$/.test(t) && codes.has(t)) return t;
  return names.get(fold(t)) ?? null;
}

export function parseQuery(raw: string): ParsedQuery {
  const input = raw.trim().replace(/\s+/g, ' ');
  let text = input;
  let countryCode: string | null = null;

  // "DE-56068", "D-56068"
  const pre = /^([A-Z]{1,2})-(.+)$/.exec(text);
  if (pre && isPostcode(pre[2].trim())) {
    const cc = PREFIX_ALIAS[pre[1]] ?? (countries().codes.has(pre[1]) ? pre[1] : null);
    if (cc) { countryCode = cc; text = pre[2].trim(); }
  }
  // "…, Deutschland" (after a comma any country name or code counts)
  if (!countryCode) {
    const i = text.lastIndexOf(',');
    if (i > 0) {
      const cc = countryCodeOf(text.slice(i + 1));
      if (cc) { countryCode = cc; text = text.slice(0, i).trim(); }
    }
  }
  // "56068 DE", "75008 France" (without comma only next to a postcode, so "Atlanta Georgia" stays text)
  if (!countryCode) {
    const words = text.split(' ');
    for (let n = Math.min(3, words.length - 1); n >= 1 && !countryCode; n--) {
      const head = words.slice(0, -n).join(' ');
      const cc = countryCodeOf(words.slice(-n).join(' '));
      if (cc && isPostcode(head)) { countryCode = cc; text = head; }
    }
  }

  if (isPostcode(text)) return { input, postcode: text, countryCode, rest: '' };
  const words = text.split(' ');
  const pc = [words[0], words.at(-1)].find((w) => w && /^\d{3,7}$/.test(w)) ?? null;
  return { input, postcode: pc, countryCode, rest: text };
}

/* ------------------------------------------------------------------ request */

export function buildSearchUrl(endpoint: string, q: ParsedQuery, opts: { lang: string; countryCode?: string | null }): string {
  const p = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', limit: '10', 'accept-language': opts.lang });
  const cc = q.countryCode ?? opts.countryCode ?? null;
  if (q.postcode && !q.rest) p.set('postalcode', q.postcode);
  else p.set('q', q.rest);
  if (cc) p.set('countrycodes', cc.toLowerCase());
  return `${endpoint}/search?${p}`;
}

/* ------------------------------------------------------------------ results */

const LOCALITY_TYPES = ['city', 'town', 'village', 'municipality', 'hamlet', 'suburb', 'borough', 'quarter', 'neighbourhood', 'city_district', 'isolated_dwelling', 'locality', 'farm'];
const REGION_TYPES = ['state', 'region', 'province', 'state_district', 'county', 'district', 'archipelago', 'island'];

function precisionOf(r: Record<string, unknown>): GeoPrecision {
  const t = String(r.addresstype ?? '');
  if (t === 'postcode') return 'postcode';
  if (t === 'country') return 'country';
  if (REGION_TYPES.includes(t)) return 'region';
  if (LOCALITY_TYPES.includes(t)) return 'locality';
  const rank = Number(r.place_rank);
  if (Number.isFinite(rank)) {
    if (rank <= 4) return 'country';
    if (rank <= 11) return 'region';
    if (rank <= 25) return 'locality';
  }
  return 'address';
}

/** strict number parsing: '' / null / 'abc' are invalid (Number('') would be 0) */
const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);

/** Nominatim jsonv2 → places; results with missing or invalid coordinates are dropped and counted */
export function normalizeResults(json: unknown): { places: GeoPlace[]; invalid: number } {
  if (!Array.isArray(json)) throw new TypeError('unexpected geocoder response');
  const places: GeoPlace[] = [];
  let invalid = 0;
  for (const r of json as Record<string, unknown>[]) {
    const lat = num(r?.lat);
    const lon = num(r?.lon);
    if (!r || typeof r !== 'object' || !isValidCoord(lat, lon)) { invalid++; continue; }
    const a = (r.address ?? {}) as Record<string, string | undefined>;
    const display = String(r.display_name ?? '');
    const locality = LOCALITY_TYPES.slice(0, 6).map((k) => a[k]).find(Boolean) ?? a.suburb;
    const place: GeoPlace = {
      lat, lon,
      name: String(r.name || locality || display.split(',')[0] || ''),
      postcode: a.postcode || undefined,
      locality: locality || undefined,
      region: a.state || a.region || a.province || a.county || undefined,
      country: a.country || undefined,
      countryCode: a.country_code ? a.country_code.toUpperCase() : undefined,
      precision: precisionOf(r),
      displayName: display,
      importance: typeof r.importance === 'number' ? r.importance : undefined,
      osm: r.osm_type && r.osm_id ? { type: String(r.osm_type), id: Number(r.osm_id) } : undefined,
      source: 'nominatim',
    };
    places.push(place);
  }
  return { places, invalid };
}

/** two hits for the same place: same OSM object, or same country and closer than this */
const SAME_PLACE_KM = 15;
/** a free-text hit is taken without asking only if its importance leads by at least this much */
export const DOMINANCE = 0.15;

function dedupe(places: GeoPlace[]): GeoPlace[] {
  const out: GeoPlace[] = [];
  for (const p of places) {
    const dup = out.some((q) => (p.osm && q.osm && p.osm.type === q.osm.type && p.osm.id === q.osm.id)
      || (p.countryCode === q.countryCode && distanceKm(p.lat, p.lon, q.lat, q.lon) < SAME_PLACE_KM));
    if (!dup) out.push(p);
  }
  return out;
}

export function decide(q: ParsedQuery, places: GeoPlace[]): GeocodeOutcome {
  if (!places.length) return { kind: 'not-found' };
  const usable = dedupe(places.filter((p) => p.precision !== 'country'));
  if (!usable.length) return { kind: 'too-coarse', place: places[0] };
  if (usable.length === 1) return { kind: 'unique', place: usable[0], alternatives: [] };
  // a bare postcode in several places (usually several countries): Nominatim ranks them equally
  if (q.postcode && !q.rest) return { kind: 'ambiguous', options: usable };
  const [a, b] = usable;
  if ((a.importance ?? 0) - (b.importance ?? 0) >= DOMINANCE) return { kind: 'unique', place: a, alternatives: usable.slice(1) };
  return { kind: 'ambiguous', options: usable };
}

/** "Koblenz, Rheinland-Pfalz, Deutschland" */
export function placeLabel(p: GeoPlace): string {
  const parts = [p.name !== p.postcode && p.name !== p.locality ? p.name : null, p.locality, p.region, p.country];
  return [...new Set(parts.filter((x): x is string => !!x))].join(', ') || p.displayName;
}

/** "56068 Koblenz" – used in sentences like "43 km from …" */
export function placeShort(p: GeoPlace): string {
  const town = p.locality ?? p.name;
  return p.precision === 'postcode' && p.postcode && town !== p.postcode ? `${p.postcode} ${town}` : town;
}

/* ------------------------------------------------------------------ client */

export interface GeocoderConfig {
  enabled: boolean;
  endpoint: string;
}

/** public/config/geocoder.json: switch the service off or point it elsewhere without a code change */
export function parseGeocoderConfig(raw: unknown): GeocoderConfig {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  let endpoint = DEFAULT_ENDPOINT;
  if (typeof c.endpoint === 'string') {
    try {
      const u = new URL(c.endpoint);
      if (u.protocol === 'https:') endpoint = c.endpoint.replace(/\/+$/, '');
    } catch { /* keep default */ }
  }
  return { enabled: c.enabled !== false, endpoint };
}

export async function loadGeocoderConfig(fetchFn: typeof fetch = fetch): Promise<GeocoderConfig> {
  try {
    const r = await fetchFn('./config/geocoder.json', { cache: 'no-cache' });
    return parseGeocoderConfig(r.ok ? await r.json() : null);
  } catch {
    return parseGeocoderConfig(null);
  }
}

type KV = Pick<Storage, 'getItem' | 'setItem'>;

export interface GeocoderDeps {
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  endpoint?: string;
  enabled?: boolean;
  /** minimum time between two requests from this browser (policy: ≤ 1/s for the whole app) */
  minIntervalMs?: number;
  timeoutMs?: number;
  /** persistent cache across page loads of this tab (sessionStorage); null = memory only */
  storage?: KV | null;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const CACHE_PREFIX = 'vb-geocode:';

function defaultStorage(): KV | null {
  try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; } catch { return null; }
}

export function createGeocoder(deps: GeocoderDeps = {}) {
  const doFetch = deps.fetch ?? ((i, init) => fetch(i, init));
  const endpoint = deps.endpoint ?? DEFAULT_ENDPOINT;
  const minInterval = deps.minIntervalMs ?? 1100;
  const timeoutMs = deps.timeoutMs ?? 10_000;
  const storage = deps.storage === undefined ? defaultStorage() : deps.storage;
  const now = deps.now ?? (() => Date.now());
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const memory = new Map<string, unknown[]>();
  let last = -Infinity;
  let current: { controller: AbortController; superseded: boolean } | null = null;

  function cached(url: string): unknown[] | null {
    const m = memory.get(url);
    if (m) return m;
    try {
      const s = storage?.getItem(CACHE_PREFIX + url);
      if (s) { const v = JSON.parse(s); if (Array.isArray(v)) { memory.set(url, v); return v; } }
    } catch { /* storage unavailable */ }
    return null;
  }
  function remember(url: string, v: unknown[]) {
    memory.set(url, v);
    try { storage?.setItem(CACHE_PREFIX + url, JSON.stringify(v)); } catch { /* quota / private mode */ }
  }
  function outcome(q: ParsedQuery, json: unknown): GeocodeOutcome {
    const { places, invalid } = normalizeResults(json);
    if (!places.length && invalid) return { kind: 'error', code: 'invalid-response' };
    return decide(q, places);
  }

  async function search(input: string, opts: { lang: string; countryCode?: string | null }): Promise<GeocodeOutcome> {
    if (deps.enabled === false) return { kind: 'error', code: 'disabled' };
    const q = parseQuery(input);
    if (!q.input) return { kind: 'not-found' };
    const url = buildSearchUrl(endpoint, q, opts);
    const hit = cached(url);
    if (hit) return outcome(q, hit);

    if (current) { current.superseded = true; current.controller.abort(); }
    const me = { controller: new AbortController(), superseded: false };
    current = me;
    const wait = last + minInterval - now();
    if (wait > 0) await sleep(wait);
    if (me.superseded) return { kind: 'aborted' };
    last = now();

    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; me.controller.abort(); }, timeoutMs);
    try {
      const res = await doFetch(url, { headers: { Accept: 'application/json' }, signal: me.controller.signal });
      if (res.status === 429 || res.status === 503) return { kind: 'error', code: 'rate-limit' };
      if (res.status === 403) return { kind: 'error', code: 'blocked' };
      if (!res.ok) return { kind: 'error', code: 'service' };
      let json: unknown;
      try { json = JSON.parse(await res.text()); } catch { return { kind: 'error', code: 'invalid-response' }; }
      if (!Array.isArray(json)) return { kind: 'error', code: 'invalid-response' };
      const result = outcome(q, json);
      if (result.kind !== 'error') remember(url, json);
      return result;
    } catch {
      if (me.superseded) return { kind: 'aborted' };
      return { kind: 'error', code: timedOut ? 'timeout' : 'network' };
    } finally {
      clearTimeout(timer);
      if (current === me) current = null;
    }
  }

  return { search };
}
