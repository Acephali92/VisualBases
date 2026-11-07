#!/usr/bin/env node
/**
 * Data validation – runs before every build in CI and in the weekly data update.
 *
 *   node scripts/validate-data.mjs [--report docs/data-quality-report.md]
 *
 * Errors (exit code 1) block a deployment; warnings are listed in the report.
 * Rules are documented in docs/DATA-QUALITY.md.
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KINDS, FACILITIES, THEMES, CONTINENTS } from '../src/lib/taxonomy.ts';
import { SOURCE_TYPES, CLAIMS, VERDICTS } from './research/lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** distance below which two different records count as the same place */
export const DUPLICATE_METERS = 200;

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
function meters(a, b) {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
/** ISO 3166-1 alpha-2 plus XK (Kosovo, user-assigned but widely used) */
export function validCountry(cc) {
  if (cc === 'XK') return true;
  if (!/^[A-Z]{2}$/.test(cc)) return false;
  try { return regionNames.of(cc) !== cc; } catch { return false; }
}

const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const FREE_LICENSE = /^(cc0|cc[- ]by(-sa)?([- ]\d\.\d)?.*|public domain|pd.*|attribution.*)$/i;

/**
 * @returns {{ errors: {rule:string, id?:string, msg:string}[], warnings: {rule:string, id?:string, msg:string}[], stats: Record<string, number> }}
 */
export function validate({ bases, media = {}, wikimedia = {}, news = [], movement = {}, corrections = {}, research = {}, fileExists = () => true }) {
  const errors = [];
  const warnings = [];
  const err = (rule, msg, id) => errors.push({ rule, id, msg });
  const warn = (rule, msg, id) => warnings.push({ rule, id, msg });
  const ids = new Set();
  const byId = new Map(bases.map((b) => [b.id, b]));
  const reviewed = new Set((corrections.positions ?? []).map((c) => c.id));

  for (const b of bases) {
    if (!b.id || typeof b.id !== 'string') { err('id', 'record without id'); continue; }
    if (ids.has(b.id)) err('duplicate-id', `duplicate id "${b.id}"`, b.id);
    ids.add(b.id);
    if (!b.name?.trim()) err('name', 'missing name', b.id);

    // coordinates
    if (typeof b.lat !== 'number' || typeof b.lon !== 'number' || Number.isNaN(b.lat) || Number.isNaN(b.lon)) err('coords-missing', 'missing coordinates', b.id);
    else if (Math.abs(b.lat) > 90 || Math.abs(b.lon) > 180) err('coords-range', `coordinates out of range (${b.lat}, ${b.lon})`, b.id);
    else if (b.lat === 0 && b.lon === 0) err('coords-null-island', 'coordinates are 0,0', b.id);
    else if ((String(b.lat).split('.')[1]?.length ?? 0) < 3 || (String(b.lon).split('.')[1]?.length ?? 0) < 3) warn('coords-precision', `low precision (${b.lat}, ${b.lon})`, b.id);
    if (b.approx) warn('coords-approx', 'approximate position (geocoded by hand)', b.id);

    // classification
    if (!b.country) err('country-missing', 'no host country', b.id);
    else if (!validCountry(b.country)) err('country-invalid', `invalid country code "${b.country}"`, b.id);
    if (!KINDS.includes(b.kind)) err('kind', `unknown kind "${b.kind}"`, b.id);
    for (const f of b.facilities ?? []) if (!FACILITIES.includes(f)) err('facility', `unknown facility "${f}"`, b.id);
    for (const t of b.themes ?? []) if (!THEMES.includes(t)) err('theme', `unknown theme "${t}"`, b.id);
    if (b.continent && !CONTINENTS.includes(b.continent)) err('continent', `unknown continent "${b.continent}"`, b.id);
    if (!b.continent) warn('continent-missing', 'no continent', b.id);
    for (const n of [...(b.nations ?? []), ...(b.sharedWith ?? [])]) if (n.length === 2 && !validCountry(n)) err('nation-invalid', `invalid nation code "${n}"`, b.id);
    if (!b.group && !(b.nations ?? []).length) warn('nation-missing', 'no stationing nation', b.id);

    // sources
    if (!(b.sources ?? []).length && !b.wikipedia) warn('sources-none', 'no source at all', b.id);
    else if (!(b.sources ?? []).length) warn('sources-wikipedia-only', 'only Wikipedia as source', b.id);
    for (const s of b.sources ?? []) if (!/^https?:\/\//.test(s.url)) err('source-url', `invalid source URL "${s.url}"`, b.id);
    if (b.review) warn('review', 'marked for review on visualbases.org', b.id);
    if (b.lastmod && !DATE.test(b.lastmod)) err('date', `invalid lastmod "${b.lastmod}"`, b.id);

    // references
    for (const r of b.related ?? []) if (!byId.has(r)) err('related', `related id "${r}" does not exist`, b.id);
    for (const img of b.images ?? []) {
      const m = media[img.url];
      if (!m) { warn('image-unprocessed', `image not processed: ${img.url.split('/').pop()}`, b.id); continue; }
      if (!fileExists(m.src) || !fileExists(m.thumb)) err('image-file', `image file missing: ${m.src}`, b.id);
    }
  }

  // near-duplicate positions (not between a community/facility and its members, not when under review)
  const list = bases.filter((b) => typeof b.lat === 'number' && typeof b.lon === 'number');
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], c = list[j];
      if (Math.abs(a.lat - c.lat) > 0.01 || Math.abs(a.lon - c.lon) > 0.01) continue;
      const d = meters(a, c);
      if (d >= DUPLICATE_METERS) continue;
      const linked = a.group || c.group || a.kind === 'facility' || c.kind === 'facility' || a.related?.includes(c.id) || c.related?.includes(a.id);
      if (reviewed.has(a.id) || reviewed.has(c.id)) warn('duplicate-position-reviewed', `same position as ${c.id} (${Math.round(d)} m) – listed in corrections.json`, a.id);
      else if (linked) warn('duplicate-position-linked', `same position as ${c.id} (${Math.round(d)} m)`, a.id);
      else err('duplicate-position', `same position as ${c.id} (${Math.round(d)} m) – check source or add to data/corrections.json`, a.id);
    }
  }

  // corrections layer
  for (const c of corrections.positions ?? []) {
    if (!byId.has(c.id)) err('corrections', `corrections.json refers to unknown id "${c.id}"`, c.id);
    if (c.duplicateOf && !byId.has(c.duplicateOf)) err('corrections', `duplicateOf "${c.duplicateOf}" does not exist`, c.id);
    if (c.proposal && (Math.abs(c.proposal.lat) > 90 || Math.abs(c.proposal.lon) > 180 || !c.proposal.source || !c.proposal.url)) err('corrections', 'proposal needs valid lat/lon, source and url', c.id);
  }

  // media and licences
  for (const [url, m] of Object.entries(media)) {
    if (!fileExists(m.src) || !fileExists(m.thumb)) err('media-file', `media file missing for ${url.split('/').pop()}`);
    if (!m.credit) err('media-credit', `media without credit: ${url.split('/').pop()}`);
  }
  for (const [id, w] of Object.entries(wikimedia)) {
    if (!w) continue;
    if (!byId.has(id)) warn('wikimedia-orphan', `wikimedia.json entry for unknown base "${id}"`, id);
    if (!w.license || !FREE_LICENSE.test(w.license)) err('wikimedia-license', `missing or non-free licence "${w.license ?? ''}"`, id);
    if (!w.credit) err('wikimedia-credit', 'missing author', id);
    if (!w.page) err('wikimedia-page', 'missing file page link', id);
  }

  // news
  const urls = new Set();
  for (const n of news) {
    if (!/^https?:\/\//.test(n.url ?? '')) err('news-url', `news item without valid URL: "${n.title}"`);
    if (n.date && !DATE.test(n.date)) err('news-date', `invalid news date "${n.date}"`);
    if (!n.date || n.date.length < 7) warn('news-date-vague', `news item without exact date: "${n.title?.slice(0, 60)}"`);
    if (urls.has(n.url)) warn('news-duplicate', `duplicate news URL ${n.url}`);
    urls.add(n.url);
    for (const id of n.bases ?? []) if (!byId.has(id)) err('news-base', `news links unknown base "${id}"`);
  }
  for (const s of movement.congress?.speakers ?? []) if (s.base && !byId.has(s.base)) err('movement-base', `speaker ${s.name} links unknown base "${s.base}"`);

  // research files (data/research/*.json)
  for (const [file, list] of Object.entries({ 'sources.json': research.sources ?? [], 'candidates.json': research.candidates ?? [] })) {
    for (const s of list) {
      const where = `${file}: ${s.base} ${s.url}`;
      if (!byId.has(s.base)) err('research-base', `unknown base in ${where}`);
      if (!/^https?:\/\//.test(s.url ?? '')) err('research-url', `invalid URL in ${where}`);
      if (!SOURCE_TYPES.includes(s.type)) err('research-type', `unknown type "${s.type}" in ${where}`);
      if (!VERDICTS.includes(s.verdict)) err('research-verdict', `unknown verdict "${s.verdict}" in ${where}`);
      for (const c of s.supports ?? []) if (!CLAIMS.includes(c)) err('research-claim', `unknown claim "${c}" in ${where}`);
      if (!DATE.test(s.accessed ?? '')) err('research-date', `missing or invalid access date in ${where}`);
      if (s.published && !DATE.test(s.published)) err('research-date', `invalid publication date "${s.published}" in ${where}`);
      // only checked sources may say "supports"/"contradicts"
      if ((s.verdict === 'supports' || s.verdict === 'contradicts') && s.method !== 'manual') err('research-verdict', `"${s.verdict}" needs method "manual" (${where})`);
      if (s.method === 'manual' && !s.summary) err('research-summary', `manual source without summary (${where})`);
    }
  }
  for (const id of Object.keys(research.checks ?? {})) if (!byId.has(id)) err('research-base', `checks.json refers to unknown base "${id}"`);

  const stats = {
    bases: bases.length,
    withSources: bases.filter((b) => (b.sources ?? []).length).length,
    wikipediaOnly: bases.filter((b) => !(b.sources ?? []).length && b.wikipedia).length,
    noSource: bases.filter((b) => !(b.sources ?? []).length && !b.wikipedia).length,
    underReview: bases.filter((b) => b.review).length,
    positionUnverified: reviewed.size,
    approximate: bases.filter((b) => b.approx).length,
    images: Object.keys(media).length,
    imagesWithLicence: Object.values(media).filter((m) => m.license).length,
    news: news.length,
  };
  return { errors, warnings, stats };
}

export function report({ errors, warnings, stats }, date = new Date().toISOString().slice(0, 10)) {
  const group = (items) => {
    const m = new Map();
    for (const i of items) m.set(i.rule, [...(m.get(i.rule) ?? []), i]);
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  };
  const lines = [
    '# Datenqualitätsbericht',
    '',
    `Automatisch erzeugt von \`scripts/validate-data.mjs\` am ${date}. Regeln: [DATA-QUALITY.md](DATA-QUALITY.md).`,
    '',
    '## Überblick',
    '',
    '| Kennzahl | Wert |',
    '|---|---|',
    `| Standorte | ${stats.bases} |`,
    `| mit eigener Quelle (außer Wikipedia) | ${stats.withSources} |`,
    `| nur Wikipedia | ${stats.wikipediaOnly} |`,
    `| ohne jede Quelle | ${stats.noSource} |`,
    `| auf visualbases.org als „Review“ markiert | ${stats.underReview} |`,
    `| Position ungeprüft (corrections.json) | ${stats.positionUnverified} |`,
    `| Position ungefähr | ${stats.approximate} |`,
    `| Bilder / davon mit Lizenzangabe | ${stats.images} / ${stats.imagesWithLicence} |`,
    `| Meldungen | ${stats.news} |`,
    `| **Fehler** | **${errors.length}** |`,
    `| Warnungen | ${warnings.length} |`,
    '',
  ];
  for (const [title, items] of [['Fehler', errors], ['Warnungen', warnings]]) {
    lines.push(`## ${title}`, '');
    if (!items.length) { lines.push('Keine.', ''); continue; }
    for (const [rule, list] of group(items)) {
      lines.push(`### \`${rule}\` (${list.length})`, '');
      for (const i of list.slice(0, 40)) lines.push(`- ${i.id ? `\`${i.id}\`: ` : ''}${i.msg}`);
      if (list.length > 40) lines.push(`- … und ${list.length - 40} weitere`);
      lines.push('');
    }
  }
  return lines.join('\n');
}

async function main() {
  const read = async (f, fallback) => { try { return JSON.parse(await fs.readFile(path.join(ROOT, f), 'utf8')); } catch { return fallback; } };
  const result = validate({
    bases: await read('data/bases.json', []),
    media: await read('data/media.json', {}),
    wikimedia: await read('data/wikimedia.json', {}),
    news: await read('data/news.json', []),
    movement: await read('data/movement.json', {}),
    corrections: await read('data/corrections.json', {}),
    research: {
      sources: await read('data/research/sources.json', []),
      candidates: await read('data/research/candidates.json', []),
      checks: await read('data/research/checks.json', {}),
    },
    fileExists: (rel) => existsSync(path.join(ROOT, 'public', rel)),
  });
  const args = process.argv.slice(2);
  const out = args.includes('--report') ? args[args.indexOf('--report') + 1] : null;
  if (out) await fs.writeFile(path.join(ROOT, out), report(result) + '\n');
  for (const e of result.errors) console.error(`✘ [${e.rule}] ${e.id ? e.id + ': ' : ''}${e.msg}`);
  console.log(`${result.errors.length ? '✘' : '✔'} data validation: ${result.errors.length} errors, ${result.warnings.length} warnings${out ? ` → ${out}` : ''}`);
  if (result.errors.length) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
