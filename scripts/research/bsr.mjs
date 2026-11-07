#!/usr/bin/env node
/**
 * Match the bases against the U.S. Department of Defense "Base Structure Report" (BSR).
 *
 *   node scripts/research/bsr.mjs
 *
 * Uses the FY2023 and FY2019 editions (Excel) from David Vine's archive on basenation.us
 * (the official host www.acq.osd.mil does not answer from cloud networks). For every base the best
 * matching row of the same host country is recorded:
 *   - checks.json  → checks[base].bsr = { fy2023: {...}|null, fy2019: {...}|null }
 *   - sources.json → one "official" source per base found in FY2023 (verdict "unreviewed" until checked
 *     by hand in data/research/bsr-review.json, see applyReview)
 * A base found in FY2019 but not in FY2023 is a candidate for a closure/status review.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import {
  TODAY, RESEARCH, readJson, download, loadBases, matchScore, countryCode, SAME_COUNTRY, saveSources, saveChecks, placeOnlyName, fold, tokens, exactness,
} from './lib.mjs';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const regionName = (cc) => { try { return regionNames.of(cc) ?? ''; } catch { return ''; } };

export const EDITIONS = [
  { year: 2023, asOf: '2022-09-30', file: 'base_structure_report_fy2023.xlsx' },
  { year: 2019, asOf: '2018-09-30', file: 'base_structure_report_fy_2019.xlsx' },
];
const MIRROR = 'https://www.basenation.us/uploads/5/7/1/7/57170837/';
/** a row counts as a match from this share of distinctive name words on */
export const MIN_SCORE = 0.6;

// ---------------------------------------------------------------- minimal xlsx reader (no dependency)

const unzip = (file, entry) => execFileSync('unzip', ['-p', file, entry], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
const decodeXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** rows of the sheet with the given name as arrays of cell strings */
export function readSheet(file, sheetName) {
  const workbook = unzip(file, 'xl/workbook.xml');
  const rels = unzip(file, 'xl/_rels/workbook.xml.rels');
  const sheet = [...workbook.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].find((m) => decodeXml(m[1]) === sheetName);
  if (!sheet) throw new Error(`sheet "${sheetName}" not found`);
  const target = rels.match(new RegExp(`Id="${sheet[2]}"[^>]*Target="([^"]+)"`))?.[1] ?? rels.match(new RegExp(`Target="([^"]+)"[^>]*Id="${sheet[2]}"`))?.[1];
  const shared = [...unzip(file, 'xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => decodeXml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
  const xml = unzip(file, `xl/${target.replace(/^\/?xl\//, '')}`);
  const rows = [];
  for (const r of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const col = [...c[1]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      const v = c[3]?.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? c[3]?.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1];
      if (v == null) continue;
      row[col] = /t="s"/.test(c[2]) ? shared[+v] : decodeXml(v);
    }
    rows.push(row);
  }
  return rows;
}

/** the "Federal DoD Main Report" rows: { country, site, component, city } */
export function bsrRows(file) {
  const rows = readSheet(file, 'Federal DoD Main Report');
  const start = rows.findIndex((r) => r[0] === 'Country/State');
  return rows.slice(start + 1).filter((r) => r[0] && r[1]).map((r) => ({ country: String(r[0]).trim(), site: String(r[1]).trim(), component: String(r[2] ?? '').trim(), city: String(r[3] ?? '').trim() }));
}

/** the BSR's "Country/State" column names US states directly – "Georgia" there is the state, never the country */
const US_STATES = new Set(('alabama alaska arizona arkansas california colorado connecticut delaware florida georgia hawaii idaho illinois ' +
  'indiana iowa kansas kentucky louisiana maine maryland massachusetts michigan minnesota mississippi missouri montana nebraska ' +
  'nevada new_hampshire new_jersey new_mexico new_york north_carolina north_dakota ohio oklahoma oregon pennsylvania rhode_island ' +
  'south_carolina south_dakota tennessee texas utah vermont virginia washington west_virginia wisconsin wyoming district_of_columbia')
  .split(' ').map((s) => s.replace(/_/g, ' ')));
export const rowCountry = (r) => (US_STATES.has(fold(r.country).trim()) ? 'US' : countryCode(r.country));

const SECONDARY = /housing|school|family|commissary|exchange|clinic|hospital|chapel|annex|storage|warehouse|hotel/i;

/**
 * best row of the same host country for a base, or null.
 * `match: "site"` – the distinctive words are in the site name (strong);
 * `match: "city"` – only the nearest city matches (weaker: shows a US site in that place, not necessarily this one).
 */
export function bestMatch(base, rows) {
  if (placeOnlyName(base.name)) return null;
  const countries = new Set([base.country, ...(SAME_COUNTRY[base.country] ?? [])]);
  // words that only name the host country ("Kenyan", "Japan") must not create a match
  const hostPrefix = fold(regionName(base.country)).slice(0, 5);
  // … nor the US state in "Beale Air Force Base, California"
  const strip = (s) => tokens(s).filter((w) => !(hostPrefix.length === 5 && w.startsWith(hostPrefix)) && !(base.country === 'US' && US_STATES.has(w))).join(' ');
  const name = strip(base.name);
  // "Ansbach: Katterbach Kaserne" – the part after the colon names the facility itself
  const facility = base.name.includes(':') ? strip(base.name.split(':').slice(1).join(':')) : '';
  // "Landstuhl: US-Hospital" – the part before the colon names the place; rows in that place rank higher
  const place = base.name.includes(':') ? strip(base.name.split(':')[0]) : '';
  if (!name) return null;
  let best = null;
  const rank = (m) =>
    (m.match === 'site' ? 2 : 1) * 10 + m.score * 5 - (SECONDARY.test(m.site) ? 1 : 0) +
    (place && matchScore(place, m.city) >= MIN_SCORE ? 3 : 0) + exactness(facility ? base.name.split(':').slice(1).join(':') : base.name, m.site);
  for (const r of rows) {
    const cc = rowCountry(r);
    if (!cc || !(countries.has(cc) || (SAME_COUNTRY[cc] ?? []).includes(base.country))) continue;
    const site = Math.max(matchScore(name, r.site), facility ? matchScore(facility, r.site) : 0);
    const city = matchScore(name, `${r.site} ${r.city}`);
    const m = site >= MIN_SCORE ? { match: 'site', score: site } : city >= MIN_SCORE ? { match: 'city', score: city } : null;
    if (!m) continue;
    const cand = { ...r, match: m.match, score: Math.round(m.score * 100) / 100 };
    if (!best || rank(cand) > rank(best)) best = cand;
  }
  return best;
}

/**
 * Manual review of a match (data/research/bsr-review.json, keyed by base id):
 *   { "site": "<BSR site name>", "verdict": "supports"|"contradicts"|"context"|"reject", "note": "…" }
 * `site` names the row that was checked; if the automatic match points elsewhere, that row is used instead
 * (manual assignment). "reject" drops the source. Returns { row, review } or { row: null } when rejected.
 */
export function applyReview(match, review, rows, country) {
  if (!review) return { row: match, review: null };
  if (review.verdict === 'reject') return { row: null, review };
  if (match && match.site === review.site) return { row: match, review };
  const row = rows.find((r) => r.site === review.site && (!country || rowCountry(r) === country || (SAME_COUNTRY[country] ?? []).includes(rowCountry(r)) || (SAME_COUNTRY[rowCountry(r)] ?? []).includes(country)));
  return row ? { row: { ...row, match: 'manual', score: 1 }, review } : { row: match, review: null, stale: true };
}

function source(b, e, m, review) {
  const reviewed = review && review.verdict !== 'reject';
  const auto = m.match === 'manual' ? 'row assigned by hand'
    : m.match === 'site' ? `site name match ${Math.round(m.score * 100)} %`
    : `only the nearest city matches (${Math.round(m.score * 100)} %) – a US site in this place, not necessarily this facility`;
  return {
    base: b.id,
    url: MIRROR + e.file,
    title: `Base Structure Report FY${e.year} – ${m.site} (${m.component}, ${m.city})`,
    publisher: 'U.S. Department of Defense (archived copy on basenation.us)',
    type: 'official',
    published: e.asOf,
    accessed: TODAY,
    httpStatus: 200,
    supports: ['presence', 'nation'],
    verdict: reviewed ? review.verdict : 'unreviewed',
    method: reviewed ? 'manual' : 'auto',
    summary: `Listed in the DoD Base Structure Report FY${e.year} (as of ${e.asOf}) as "${m.site}", ${m.component}, nearest city ${m.city}, ${m.country}.`,
    note: reviewed ? [review.note, `(${auto})`].filter(Boolean).join(' ') : auto,
  };
}

async function main() {
  const bases = await loadBases();
  const reviews = await readJson(path.join(RESEARCH, 'bsr-review.json'), {});
  const editions = [];
  for (const e of EDITIONS) {
    const file = await download(MIRROR + e.file, e.file);
    editions.push({ ...e, rows: bsrRows(file) });
    console.log(`  BSR FY${e.year}: ${editions.at(-1).rows.length} rows`);
  }
  const [current, previous] = editions;
  const checks = {};
  const sources = [];
  const stale = [];
  for (const b of bases) {
    const result = {};
    for (const e of editions) result[`fy${e.year}`] = bestMatch(b, e.rows);
    const review = reviews[b.id];
    // a review may name a FY2023 row the matcher missed, or confirm a FY2019-only row
    const now = applyReview(result.fy2023, review?.edition === previous.year ? null : review, current.rows, b.country);
    const before = applyReview(result.fy2019, review?.edition === previous.year ? review : null, previous.rows, b.country);
    if (now.stale || before.stale) stale.push(b.id);
    if (now.row && now.row !== result.fy2023) result.fy2023 = now.row;
    if (before.row && before.row !== result.fy2019) result.fy2019 = before.row;
    if (review) result.review = review.verdict;
    if (!result.fy2023 && !result.fy2019) continue;
    checks[b.id] = result;
    if (now.row) sources.push(source(b, current, now.row, now.review));
    // only in FY2019: historical evidence (and a status question), recorded once reviewed
    else if (before.row && before.review) sources.push(source(b, previous, before.row, before.review));
  }
  await saveChecks('bsr', checks);
  const total = await saveSources('bsr', sources);
  const gone = Object.entries(checks).filter(([, v]) => v.fy2019 && !v.fy2023).length;
  const reviewed = sources.filter((s) => s.method === 'manual').length;
  console.log(`✔ BSR: ${Object.keys(checks).length} bases matched (${sources.length} sources, ${reviewed} reviewed; ${gone} only in FY2019); sources.json has ${total} entries`);
  if (stale.length) console.warn(`⚠ review names a row that no longer exists: ${stale.join(', ')}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
