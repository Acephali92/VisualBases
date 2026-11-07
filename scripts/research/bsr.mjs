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
 *   - sources.json → one "official" source per base found in FY2023 (verdict "unreviewed" until checked)
 * A base found in FY2019 but not in FY2023 is a candidate for a closure/status review.
 */
import { execFileSync } from 'node:child_process';
import {
  TODAY, download, loadBases, matchScore, countryCode, SAME_COUNTRY, saveSources, saveChecks, placeOnlyName, fold, tokens,
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
  const strip = (s) => tokens(s).filter((w) => !(hostPrefix.length === 5 && w.startsWith(hostPrefix))).join(' ');
  const name = strip(base.name);
  // "Ansbach: Katterbach Kaserne" – the part after the colon names the facility itself
  const facility = base.name.includes(':') ? strip(base.name.split(':').slice(1).join(':')) : '';
  if (!name) return null;
  let best = null;
  const rank = (m) => (m.match === 'site' ? 2 : 1) * 10 + m.score * 5 - (SECONDARY.test(m.site) ? 1 : 0);
  for (const r of rows) {
    const cc = countryCode(r.country);
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

async function main() {
  const bases = await loadBases();
  const editions = [];
  for (const e of EDITIONS) {
    const file = await download(MIRROR + e.file, e.file);
    editions.push({ ...e, rows: bsrRows(file) });
    console.log(`  BSR FY${e.year}: ${editions.at(-1).rows.length} rows`);
  }
  const checks = {};
  const sources = [];
  for (const b of bases) {
    const result = {};
    for (const e of editions) result[`fy${e.year}`] = bestMatch(b, e.rows);
    if (!result.fy2023 && !result.fy2019) continue;
    checks[b.id] = result;
    const m = result.fy2023;
    if (m) {
      const e = editions[0];
      sources.push({
        base: b.id,
        url: MIRROR + e.file,
        title: `Base Structure Report FY${e.year} – ${m.site} (${m.component}, ${m.city})`,
        publisher: 'U.S. Department of Defense (archived copy on basenation.us)',
        type: 'official',
        published: e.asOf,
        accessed: TODAY,
        httpStatus: 200,
        supports: ['presence', 'nation'],
        verdict: 'unreviewed',
        method: 'auto',
        summary: `Listed in the DoD Base Structure Report FY${e.year} (as of ${e.asOf}) as "${m.site}", ${m.component}, nearest city ${m.city}, ${m.country}.`,
        note: m.match === 'site' ? `site name match ${Math.round(m.score * 100)} %` : `only the nearest city matches (${Math.round(m.score * 100)} %) – a US site in this place, not necessarily this facility`,
      });
    }
  }
  await saveChecks('bsr', checks);
  const total = await saveSources('bsr', sources);
  const gone = Object.entries(checks).filter(([, v]) => v.fy2019 && !v.fy2023).length;
  console.log(`✔ BSR: ${Object.keys(checks).length} bases matched (${sources.length} in FY2023, ${gone} only in FY2019); sources.json has ${total} entries`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
