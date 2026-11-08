/**
 * Shared helpers for the source research (scripts/research/*).
 *
 * Research results live in data/research/ and are NOT shown in the app until reviewed:
 *   sources.json – one entry per source found for a base (see docs/research/SOURCE-RESEARCH.md)
 *   checks.json  – automatic position/status checks per base (BSR, Wikidata, OSM)
 *
 * Every collector only replaces its own entries (`collector` field), so manual research is never lost.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const RESEARCH = path.join(ROOT, 'data/research');
export const CACHE = path.join(ROOT, '.cache/research');
export const UA = 'VisualBases-research (+https://github.com/Acephali92/VisualBases)';
export const TODAY = new Date().toISOString().slice(0, 10);

export const SOURCE_TYPES = ['official', 'academic', 'media', 'movement', 'dataset', 'geodata'];
export const CLAIMS = ['presence', 'nation', 'position', 'status', 'facility', 'activity'];
export const VERDICTS = ['supports', 'contradicts', 'context', 'unreviewed'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Read a JSON file. Only a missing file falls back to `fallback`; an unreadable or malformed file throws,
 * so that a broken data file can never be mistaken for an empty one (and overwritten or skipped silently).
 */
export async function readJson(file, fallback) {
  let text;
  try { text = await fs.readFile(file, 'utf8'); } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    throw e;
  }
  try { return JSON.parse(text); } catch (e) {
    throw new Error(`${path.relative(ROOT, file) || file}: invalid JSON (${e.message})`);
  }
}

/**
 * Records of data/bases.json with two convenience fields for the matching code:
 * `country` – the territory code if there is one (GU, PR, GL …), otherwise the host country –
 * and `nations` – all states with a presence.
 */
export async function loadBases() {
  const bases = await readJson(path.join(ROOT, 'data/bases.json'), []);
  return bases.map((b) => ({ ...b, country: b.host?.territory ?? b.host?.country ?? null, nations: (b.presences ?? []).map((p) => p.nation) }));
}

/** bases without an own source besides Wikipedia – the focus of the research */
export const isTarget = (b) => !(b.sources ?? []).length;

/** fetch with descriptive User-Agent, timeout and backoff on 429/5xx; returns { status, text|buffer } */
export async function fetchWithRetry(url, { binary = false, tries = 5, headers = {} } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, 'api-user-agent': UA, ...headers }, signal: AbortSignal.timeout(60000), redirect: 'follow' });
      if (res.status === 429 || res.status >= 500) {
        last = res.status;
        const wait = Math.min(120, 5 * 2 ** i);
        console.log(`  … ${res.status} for ${new URL(url).host}, waiting ${wait}s`);
        await sleep(wait * 1000);
        continue;
      }
      return { status: res.status, url: res.url, body: binary ? Buffer.from(await res.arrayBuffer()) : await res.text() };
    } catch (e) {
      last = e.cause?.code ?? e.name;
      await sleep(3000 * (i + 1));
    }
  }
  return { status: 0, error: String(last), body: binary ? Buffer.alloc(0) : '' };
}

/** cached download into .cache/research */
export async function download(url, name) {
  const file = path.join(CACHE, name);
  try { await fs.access(file); return file; } catch { /* not cached */ }
  const res = await fetchWithRetry(url, { binary: true });
  if (res.status !== 200) throw new Error(`download failed (${res.status}): ${url}`);
  await fs.mkdir(CACHE, { recursive: true });
  await fs.writeFile(file, res.body);
  return file;
}

// ---------------------------------------------------------------- matching

const GENERIC = new Set(
  ('air base ab afb ang angs as station sta naval ns nas nsa nsf navy camp kaserne kasernen caserma barracks army ' +
    'depot training area ta range us usa u s the of de di du la le el al raf rnas field airfield airport aerodrome aeroporto ' +
    'flughafen flugplatz site sites community military garrison usag annex facility facilities fac center centre command ' +
    'joint support activity storage housing complex comp radio relay comm communications station point base militar ' +
    'militaire militare airbase force transmitter ' +
    'north south east west new upper lower').split(/\s+/),
);

export function fold(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** distinctive words of a site name (place names, unit names), generic military vocabulary removed */
/** abbreviations used in the Base Structure Report */
const ALIAS = { ammo: 'ammunition', tng: 'training', ord: 'ordnance', ordinance: 'ordnance', hosp: 'hospital' };

export function tokens(s) {
  return fold(s)
    .replace(/\(.*?\)/g, ' ')
    .split(/[^a-z0-9]+/)
    .map((w) => ALIAS[w] ?? w)
    .filter((w) => w.length >= 3 && !GENERIC.has(w) && !/^\d+$/.test(w));
}

/** Jaccard similarity of all words incl. generic ones and numbers – tie-breaker between equally good matches */
export function exactness(a, b) {
  const words = (s) => new Set(fold(s).replace(/\ba[fb]?b\b|\bafb\b/g, 'air base').split(/[^a-z0-9]+/).filter(Boolean).map((w) => ALIAS[w] ?? w));
  const A = words(a), B = words(b);
  const inter = [...A].filter((w) => B.has(w)).length;
  return inter / (A.size + B.size - inter || 1);
}

/** share of the base's distinctive words found in the candidate text (0..1) */
export function matchScore(baseName, candidateText) {
  const a = [...new Set(tokens(baseName))];
  if (!a.length) return 0;
  const b = new Set(tokens(candidateText));
  const hits = a.filter((w) => b.has(w) || [...b].some((x) => x.length >= 5 && w.length >= 5 && (x.startsWith(w) || w.startsWith(x))));
  return hits.length / a.length;
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const COUNTRY_ALIASES = {
  'korea, republic of': 'KR', 'south korea': 'KR', 'republic of korea': 'KR', turkey: 'TR', turkiye: 'TR',
  'united kingdom': 'GB', 'great britain': 'GB', 'british indian ocean territory': 'IO', 'diego garcia': 'IO',
  'bahamas, the': 'BS', 'the bahamas': 'BS', 'virgin islands, u.s.': 'VI', 'u.s. virgin islands': 'VI', 'guam': 'GU',
  'wake island': 'UM', 'johnston atoll': 'UM', 'kwajalein atoll': 'MH', 'marshall islands': 'MH', 'ascension island': 'SH',
  'saint helena': 'SH', 'netherlands antilles': 'CW', 'curacao': 'CW', 'cuba': 'CU', 'greenland': 'GL', 'kosovo': 'XK',
  'guantanamo bay naval base': 'CU', 'saint helena, ascension, and tristan da cunha': 'SH', 'northern mariana is': 'MP',
  'northern mariana islands': 'MP', 'virgin islands': 'VI',
};
let nameToCode;
/** ISO alpha-2 for an English country name as used in the Base Structure Report */
export function countryCode(name) {
  if (!nameToCode) {
    nameToCode = new Map();
    for (let i = 65; i <= 90; i++) for (let j = 65; j <= 90; j++) {
      const cc = String.fromCharCode(i, j);
      try { const n = regionNames.of(cc); if (n && n !== cc) nameToCode.set(fold(n), cc); } catch { /* skip */ }
    }
  }
  const k = fold(name).trim();
  return COUNTRY_ALIASES[k] ?? nameToCode.get(k) ?? null;
}

/** territories that the dataset files under another host country code */
export const SAME_COUNTRY = { IO: ['GB'], GU: ['US'], UM: ['US'], VI: ['US'], PR: ['US'], MP: ['US'], SH: ['GB'], GL: ['DK', 'GL'], CW: ['NL'] };

/** words that only name a country or territory – a base called "Bahrain" or "Guam" says nothing about a specific row */
export function placeOnlyName(name) {
  const t = tokens(name);
  return t.length > 0 && t.every((w) => countryCode(w) || ['guam', 'okinawa', 'bahrain', 'djibouti', 'singapore', 'qatar', 'kuwait'].includes(w));
}

// ---------------------------------------------------------------- research files

export async function loadResearch() {
  return {
    sources: await readJson(path.join(RESEARCH, 'sources.json'), []),
    candidates: await readJson(path.join(RESEARCH, 'candidates.json'), []),
    checks: await readJson(path.join(RESEARCH, 'checks.json'), {}),
  };
}

/**
 * replace all entries of one collector, keep everything else (manual research above all).
 * file: 'sources.json' (evaluated or structured sources) or 'candidates.json' (unreviewed leads)
 */
export async function saveSources(collector, entries, file = 'sources.json') {
  const sources = await readJson(path.join(RESEARCH, file), []);
  const kept = sources.filter((s) => s.collector !== collector);
  const all = [...kept, ...entries.map((e) => ({ ...e, collector }))]
    .sort((a, b) => a.base.localeCompare(b.base) || a.collector.localeCompare(b.collector) || a.url.localeCompare(b.url));
  await fs.mkdir(RESEARCH, { recursive: true });
  await fs.writeFile(path.join(RESEARCH, file), JSON.stringify(all, null, 1) + '\n');
  return all.length;
}

// ---------------------------------------------------------------- source classification

const OFFICIAL = /(\.mil|\.gov|\.gouv\.fr|\.gob\.|\.go\.jp|\.go\.kr|\.gc\.ca|\.gov\.uk|nato\.int|bundeswehr\.de|bmvg\.de|bundestag\.de|defensa\.gob|defense\.gouv|defence\.gov|mod\.gov|mod\.uk|forsvaret\.no|forsvarsmakten\.se|gov\.pl|mon\.gov|europa\.eu|un\.org|congress\.gov|gao\.gov|parliament\.uk|riksdagen\.se)$/;
const ACADEMIC = /(\.edu|\.ac\.[a-z]{2}|doi\.org|jstor\.org|springer|tandfonline|sciencedirect|cambridge\.org|oup\.com|researchgate|sipri\.org|iiss\.org|csis\.org|rand\.org|brookings\.edu|cfr\.org|crsreports|fas\.org|basenation\.us|davidvine\.net|books\.google)/;
const MOVEMENT = /(worldbeyondwar|codepink|cnduk|yorkshirecnd|stoppramstein|ramstein-kampagne|frieden-und-zukunft|friedenskooperative|ippnw|dfg-vk|imi-online|no-to-nato|space4peace|noforeignbases|overseasbases|nousnatobases|anti-bases|shannonwatch|nomuos|peaceforokinawa|savejejunow|drohnen-kampagne|atomwaffenfrei|lebenshaus-alb|ag-friedensforschung|friedensratschlag)/;
const DATASET = /(globalsecurity\.org|militarybases\.com|militaryonesource|installations\.militaryonesource|wikimapia|openstreetmap)/;
const SKIP = /(wikipedia\.org|wikimedia\.org|wikidata\.org|wiktionary|archive\.org\/details|google\.com\/maps|geohack|toolforge|worldcat\.org|viaf\.org|isni|d-nb\.info)/;

/** unwrap web.archive.org links so the original publisher is classified */
export function unwrapArchive(url) {
  const m = url.match(/^https?:\/\/(?:web\.)?archive\.org\/web\/\d+[a-z_]*\/(.+)$/i);
  return m ? (/^https?:/.test(m[1]) ? m[1] : `http://${m[1]}`) : url;
}

/** source type for a URL, or null if it is not a usable source (wikis, authority files, maps) */
export function classifyUrl(url) {
  let host;
  try { host = new URL(unwrapArchive(url)).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; }
  const full = unwrapArchive(url).toLowerCase();
  if (SKIP.test(full)) return null;
  if (OFFICIAL.test(host)) return 'official';
  if (ACADEMIC.test(host) || ACADEMIC.test(full)) return 'academic';
  if (MOVEMENT.test(host)) return 'movement';
  if (DATASET.test(host)) return 'dataset';
  return 'media';
}

export const TYPE_RANK = { official: 0, academic: 1, media: 2, movement: 3, dataset: 4, geodata: 5 };

/** set checks[base][key] for one collector */
export async function saveChecks(key, perBase) {
  const { checks } = await loadResearch();
  for (const id of Object.keys(checks)) delete checks[id][key];
  for (const [id, v] of Object.entries(perBase)) (checks[id] ??= {})[key] = v;
  for (const id of Object.keys(checks)) if (!Object.keys(checks[id]).length) delete checks[id];
  const sorted = Object.fromEntries(Object.entries(checks).sort((a, b) => a[0].localeCompare(b[0])));
  await fs.mkdir(RESEARCH, { recursive: true });
  await fs.writeFile(path.join(RESEARCH, 'checks.json'), JSON.stringify(sorted, null, 1) + '\n');
}
