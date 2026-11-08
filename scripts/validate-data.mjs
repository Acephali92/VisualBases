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
import { VOCABULARIES, TERRITORY_SOVEREIGN, ids } from '../src/lib/taxonomy.ts';
import { resolveBases, CLAIM_FIELDS } from './lib/resolve.mjs';
import { SITE_TYPE_BY_CAT, FEATURE_BY_TERM, NATION_BY_TAG, CO_USER_BY_TAG, ORGANISATION_BY_TAG, THEME_BY_TAG, ACTIVITY_BY_TAG } from './import-visualbases.mjs';
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
/** vocabulary IDs per field */
const V = Object.fromEntries(Object.entries(VOCABULARIES).map(([k, list]) => [k, new Set(ids(list))]));

/**
 * Source terms that are known but intentionally not mapped to the classification (geography is mapped
 * separately, the rest is editorial). Any other term is reported, so that new vocabulary on
 * visualbases.org is noticed after an import.
 */
const KNOWN_TERM = /^(cat:(europe|asia|africa|america|australia|atlantic|west-europe|north-europe|east-europe|balkans|de|it|uk|middle-east|gulf-region|south-asia|pacific|jp|korea|north-africa|west-africa|east-africa|central-south-africa|north-america|caribbean|middle-south-america|closed|update|single-post-en|einzelbeitrag-de)|tag:(review1|update[-_]\d+|us-(mob|fob|fos|csl)|bsr|bsrx|source-wikipedia|source-other|de-rlp|reg_de-rlp-kl|de-ba|de-bw|de-he|jp-okinawa|reg_us-overseas))$/;
export function mappedTerm(t) {
  const [kind, v] = t.split(':');
  if (kind === 'cat') return v in SITE_TYPE_BY_CAT || t in FEATURE_BY_TERM || KNOWN_TERM.test(t);
  return t in FEATURE_BY_TERM || v in NATION_BY_TAG || v in CO_USER_BY_TAG || v in ORGANISATION_BY_TAG || v in THEME_BY_TAG || v in ACTIVITY_BY_TAG || KNOWN_TERM.test(t);
}

/** schema of data/claims.json */
export function validateClaims(claims, byId, err) {
  const seen = new Set();
  for (const c of claims) {
    const where = `claim "${c.id}"`;
    if (!c.id || seen.has(c.id)) err('claim-id', `${where}: missing or duplicate id`, c.base);
    seen.add(c.id);
    if (!byId.has(c.base)) err('claim-base', `${where}: unknown base "${c.base}"`, c.base);
    if (!CLAIM_FIELDS.includes(c.field)) err('claim-field', `${where}: unknown field "${c.field}"`, c.base);
    if (!['set', 'add', 'remove'].includes(c.op)) err('claim-op', `${where}: unknown op "${c.op}"`, c.base);
    if (!['accepted', 'proposed'].includes(c.status)) err('claim-status', `${where}: status must be accepted or proposed`, c.base);
    if (c.status === 'accepted' && !DATE.test(c.decided ?? '')) err('claim-decided', `${where}: accepted claims need a decision date`, c.base);
    if (!c.statement?.de || !c.statement?.en) err('claim-statement', `${where}: statement in German and English required`, c.base);
    if (!(c.sources ?? []).length || c.sources.some((u) => !/^https?:\/\//.test(u))) err('claim-source', `${where}: at least one source URL required`, c.base);
    const vals = c.field === 'presences' ? [].concat(c.value ?? []) : [];
    for (const p of vals) {
      if (!validCountry(p.nation)) err('claim-value', `${where}: invalid nation "${p.nation}"`, c.base);
      if (c.op !== 'remove' && !V.presenceRole.has(p.role)) err('claim-value', `${where}: invalid role "${p.role}"`, c.base);
    }
    if (c.field === 'status' && !V.status.has(c.value)) err('claim-value', `${where}: invalid status "${c.value}"`, c.base);
    if (c.field === 'siteType' && !V.siteType.has(c.value)) err('claim-value', `${where}: invalid site type "${c.value}"`, c.base);
    if (c.field === 'issues' && !V.issue.has(c.value)) err('claim-value', `${where}: invalid issue "${c.value}"`, c.base);
    if (c.field === 'host' && !validCountry(c.value?.country ?? '')) err('claim-value', `${where}: invalid host country`, c.base);
    if (c.field === 'period' && Object.values(c.value ?? {}).some((d) => !DATE.test(d))) err('claim-value', `${where}: invalid period`, c.base);
    if (c.field === 'position' && (c.op !== 'set' || !(Math.abs(c.value?.lat) <= 90) || !(Math.abs(c.value?.lon) <= 180))) err('claim-value', `${where}: position needs op "set" and valid lat/lon`, c.base);
    if (c.field === 'name' && (c.op !== 'set' || typeof c.value !== 'string' || !c.value.trim())) err('claim-value', `${where}: name needs op "set" and a non-empty string`, c.base);
  }
}

/**
 * @returns {{ errors: {rule:string, id?:string, msg:string}[], warnings: {rule:string, id?:string, msg:string}[], stats: Record<string, number> }}
 */
export function validate({ bases, media = {}, wikimedia = {}, news = [], movement = {}, corrections = {}, claims = [], research = {}, fileExists = () => true }) {
  const errors = [];
  const warnings = [];
  const err = (rule, msg, id) => errors.push({ rule, id, msg });
  const warn = (rule, msg, id) => warnings.push({ rule, id, msg });
  const ids = new Set();
  const byId = new Map(bases.map((b) => [b.id, b]));
  const reviewed = new Set((corrections.positions ?? []).map((c) => c.id));
  const inVocab = (dim, value, rule, id) => { if (!V[dim].has(value)) err(rule, `unknown ${dim} "${value}"`, id); };

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

    // host: sovereign state + optional dependent territory
    const host = b.host ?? {};
    if (!host.country) err('country-missing', 'no host country', b.id);
    else if (!validCountry(host.country)) err('country-invalid', `invalid country code "${host.country}"`, b.id);
    else if (TERRITORY_SOVEREIGN[host.country]) err('country-territory', `"${host.country}" is a territory – host.country must be the sovereign state`, b.id);
    if (host.territory && TERRITORY_SOVEREIGN[host.territory] !== host.country) err('territory-invalid', `territory "${host.territory}" does not belong to "${host.country}"`, b.id);

    // classification: every value from the vocabulary
    inVocab('siteType', b.siteType, 'site-type', b.id);
    inVocab('status', b.status, 'status', b.id);
    for (const f of b.features ?? []) inVocab('feature', f, 'feature', b.id);
    for (const t of b.themes ?? []) inVocab('theme', t, 'theme', b.id);
    for (const a of b.activities ?? []) inVocab('activity', a, 'activity', b.id);
    for (const o of b.organisations ?? []) inVocab('organisation', o, 'organisation', b.id);
    for (const l of b.listedIn ?? []) inVocab('listing', l, 'listing', b.id);
    if (b.usPosture) inVocab('usPosture', b.usPosture, 'us-posture', b.id);
    if (b.continent) inVocab('continent', b.continent, 'continent', b.id);
    else warn('continent-missing', 'no continent', b.id);
    for (const k of ['features', 'themes', 'activities', 'organisations', 'presences']) if (!Array.isArray(b[k])) err('schema', `"${k}" must be a list`, b.id);
    const nations = new Set();
    for (const p of b.presences ?? []) {
      if (!validCountry(p.nation ?? '')) err('nation-invalid', `invalid nation code "${p.nation}"`, b.id);
      if (!V.presenceRole.has(p.role)) err('presence-role', `unknown role "${p.role}"`, b.id);
      if (!V.presenceVia.has(p.via)) err('presence-via', `unknown derivation "${p.via}"`, b.id);
      if (nations.has(p.nation)) err('presence-duplicate', `nation "${p.nation}" listed twice`, b.id);
      nations.add(p.nation);
    }

    // taxonomy rules (docs/TAXONOMY.md, "Regeln")
    const stationing = (b.presences ?? []).filter((p) => p.role === 'stationing');
    if (b.siteType === 'overseas-base' && (!host.territory || !stationing.length || stationing.some((p) => p.nation !== host.country)))
      err('rule-overseas', 'overseas-base needs a dependent territory of the stationing state', b.id);
    if (b.siteType === 'domestic-global' && !(b.presences ?? []).some((p) => p.nation === host.country))
      err('rule-domestic', 'domestic-global needs a presence of the host state itself', b.id);
    if (b.siteType === 'civilian-site' && (b.features ?? []).some((f) => f === 'nuclear-sharing'))
      warn('rule-civilian', 'civilian site with nuclear sharing – check', b.id);

    // provenance
    if (!b.origin?.url || !Array.isArray(b.origin?.terms?.categories) || !Array.isArray(b.origin?.terms?.tags)) err('origin', 'origin.url and origin.terms are required', b.id);
    else for (const t of [...b.origin.terms.categories.map((c) => `cat:${c}`), ...b.origin.terms.tags.map((x) => `tag:${x}`)])
      if (!mappedTerm(t)) warn('term-unmapped', `term "${t}" of visualbases.org is not mapped to the classification`, b.id);

    // sources
    if (!(b.sources ?? []).length && !b.wikipedia) warn('sources-none', 'no source at all', b.id);
    else if (!(b.sources ?? []).length) warn('sources-wikipedia-only', 'only Wikipedia as source', b.id);
    for (const s of b.sources ?? []) if (!/^https?:\/\//.test(s.url)) err('source-url', `invalid source URL "${s.url}"`, b.id);
    if (b.origin?.lastmod && !DATE.test(b.origin.lastmod)) err('date', `invalid lastmod "${b.origin.lastmod}"`, b.id);

    // references
    for (const r of b.relations ?? []) {
      if (!byId.has(r.id)) err('related', `related id "${r.id}" does not exist`, b.id);
      if (!['part-of', 'member-of', 'related'].includes(r.type)) err('relation-type', `unknown relation type "${r.type}"`, b.id);
    }
    for (const img of b.images ?? []) {
      const m = media[img.url];
      if (!m) { warn('image-unprocessed', `image not processed: ${img.url.split('/').pop()}`, b.id); continue; }
      if (!fileExists(m.src) || !fileExists(m.thumb)) err('image-file', `image file missing: ${m.src}`, b.id);
    }
  }

  // claims layer and the resolved records (review notes become warnings)
  validateClaims(claims, byId, err);
  let resolved = [];
  try {
    const r = resolveBases(bases.filter((b) => b.host && Array.isArray(b.presences)), { claims, research: research.sources ?? [], corrections });
    resolved = r.bases;
    for (const p of r.problems) err(p.rule, p.msg, p.id);
    for (const b of resolved) for (const i of b.issues ?? []) if (i !== 'position-unverified') warn(`issue-${i}`, i, b.id);
  } catch (e) { err('resolve', `records cannot be resolved: ${e.message}`); }

  // near-duplicate positions (not between a community/facility and its members, not when under review);
  // checked on the resolved records, so an accepted position claim settles a duplicate
  const list = (resolved.length ? resolved : bases).filter((b) => typeof b.lat === 'number' && typeof b.lon === 'number');
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], c = list[j];
      if (Math.abs(a.lat - c.lat) > 0.01 || Math.abs(a.lon - c.lon) > 0.01) continue;
      const d = meters(a, c);
      if (d >= DUPLICATE_METERS) continue;
      const agg = (x) => x.siteType === 'garrison' || x.siteType === 'region-cluster' || x.siteType === 'special-facility';
      const rel = (x, y) => (x.relations ?? []).some((r) => r.id === y.id);
      const linked = agg(a) || agg(c) || rel(a, c) || rel(c, a);
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
  for (const [id, r] of Object.entries(research.bsrReview ?? {})) {
    if (!byId.has(id)) err('research-base', `bsr-review.json refers to unknown base "${id}"`);
    if (![...VERDICTS.filter((v) => v !== 'unreviewed'), 'reject'].includes(r.verdict)) err('research-verdict', `bsr-review.json: unknown verdict "${r.verdict}" for ${id}`);
    if (r.verdict !== 'reject' && !r.site) err('research-review', `bsr-review.json: ${id} names no BSR row`);
  }

  const stats = {
    bases: bases.length,
    withSources: bases.filter((b) => (b.sources ?? []).length).length,
    wikipediaOnly: bases.filter((b) => !(b.sources ?? []).length && b.wikipedia).length,
    noSource: bases.filter((b) => !(b.sources ?? []).length && !b.wikipedia).length,
    underReview: bases.filter((b) => b.origin?.review).length,
    corrections: resolved.reduce((n, b) => n + (b.corrections?.length ?? 0), 0),
    proposals: resolved.reduce((n, b) => n + (b.proposals?.length ?? 0), 0),
    withIssues: resolved.filter((b) => (b.issues ?? []).some((i) => i !== 'position-unverified')).length,
    contextSites: resolved.filter((b) => b.scope === 'domestic').length,
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
    `| angewandte Korrekturen (claims.json) / offene Vorschläge | ${stats.corrections} / ${stats.proposals} |`,
    `| Einträge mit Prüfhinweis | ${stats.withIssues} |`,
    `| Kontext-Standorte (eigenes Staatsgebiet) | ${stats.contextSites} |`,
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
    claims: (await read('data/claims.json', {})).claims ?? [],
    research: {
      sources: await read('data/research/sources.json', []),
      candidates: await read('data/research/candidates.json', []),
      checks: await read('data/research/checks.json', {}),
      bsrReview: await read('data/research/bsr-review.json', {}),
    },
    fileExists: (rel) => existsSync(path.join(ROOT, 'public', rel)),
  });
  const args = process.argv.slice(2);
  const out = args.includes('--report') ? args[args.indexOf('--report') + 1] : null;
  if (out) await fs.writeFile(path.resolve(ROOT, out), report(result) + '\n');
  for (const e of result.errors) console.error(`✘ [${e.rule}] ${e.id ? e.id + ': ' : ''}${e.msg}`);
  console.log(`${result.errors.length ? '✘' : '✔'} data validation: ${result.errors.length} errors, ${result.warnings.length} warnings${out ? ` → ${out}` : ''}`);
  if (result.errors.length) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
