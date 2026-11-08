#!/usr/bin/env node
/**
 * Summarise the research layer (data/research/*) for the report.
 *
 *   node scripts/research/summarize.mjs
 *
 * Writes
 *   - docs/research/coverage.csv – one row per base with sources, checks and open questions
 *   - the generated block between <!-- summary:start --> and <!-- summary:end --> in
 *     docs/research/SOURCE-RESEARCH.md (the hand-written commentary around it stays untouched)
 * All numbers in the report come from here, so they can be reproduced.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, loadBases, loadResearch, CLAIMS, SOURCE_TYPES } from './lib.mjs';
import { verdictFor } from '../lib/resolve.mjs';

const DOCS = path.join(ROOT, 'docs', 'research');
const REPORT = path.join(DOCS, 'SOURCE-RESEARCH.md');
const FAR_KM = 2;

/** evidence level of a base after the research */
export function level(r) {
  if (r.supports.has('presence')) return 'verified';
  if (r.manual.length) return 'context';
  if (r.auto.length || r.candidates) return 'candidates';
  return 'none';
}

export function summarize(bases, { sources, candidates, checks }) {
  const rows = bases.map((b) => {
    const own = (b.sources ?? []).length;
    const mine = sources.filter((s) => s.base === b.id);
    const manual = mine.filter((s) => s.method === 'manual');
    // judged per statement group: a source may support the presence and contradict the nation
    const supports = new Set(manual.flatMap((s) => s.supports.filter((g) => verdictFor(s, g) === 'supports')));
    const contradicting = manual.map((s) => ({ s, groups: s.supports.filter((g) => verdictFor(s, g) === 'contradicts') })).filter((x) => x.groups.length);
    const c = checks[b.id] ?? {};
    const issues = [];
    for (const { s, groups } of contradicting) issues.push(`contradicts (${groups.join('/')}): ${s.note || s.summary}`);
    if (c.wikidata?.dissolved) issues.push(`Wikidata: closed/dissolved ${c.wikidata.dissolved}`);
    if (c.wikidata?.distanceKm > FAR_KM) issues.push(`Wikidata position ${c.wikidata.distanceKm} km away`);
    if (c.osm?.verdict === 'none') issues.push('OSM: no military feature within 3 km');
    if (c.bsr?.fy2019 && !c.bsr?.fy2023) issues.push('BSR: listed FY2019, not FY2023');
    if (b.review) issues.push('marked for review on visualbases.org');
    return {
      b, own, wiki: !!b.wikipedia, manual, supports,
      contradicts: contradicting.length, contradicting,
      context: manual.filter((s) => s.verdict === 'context').length,
      auto: mine.filter((s) => s.method !== 'manual'),
      candidates: candidates.filter((s) => s.base === b.id).length,
      c, issues,
    };
  });
  for (const r of rows) r.level = level(r);
  return rows;
}

const pct = (n, d) => (d ? `${Math.round((n / d) * 100)} %` : '–');
const csvCell = (v) => (/[",\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

function csv(rows) {
  const head = ['id', 'name', 'country', 'nations', 'dataset_sources', 'wikipedia', 'level', 'verified_claims', 'manual_sources', 'contradicts', 'context', 'unreviewed_sources', 'candidates',
    'bsr_fy2023', 'bsr_fy2019', 'wikidata', 'wikidata_km', 'wikidata_dissolved', 'osm', 'osm_km', 'issues'];
  const out = [head.join(',')];
  for (const r of rows) {
    out.push([r.b.id, r.b.name, r.b.country, (r.b.nations ?? []).join(' '), r.own, r.wiki ? 'yes' : 'no', r.level, [...r.supports].join(' '), r.manual.length, r.contradicts, r.context, r.auto.length, r.candidates,
      r.c.bsr?.fy2023?.site ?? '', r.c.bsr?.fy2019?.site ?? '', r.c.wikidata?.item ?? '', r.c.wikidata?.distanceKm ?? '', r.c.wikidata?.dissolved ?? '', r.c.osm?.verdict ?? '', r.c.osm?.nearest?.km ?? '',
      r.issues.join(' | ')].map(csvCell).join(','));
  }
  return out.join('\n') + '\n';
}

function table(head, body) {
  return [`| ${head.join(' | ')} |`, `| ${head.map((h, i) => (i ? '---:' : '---')).join(' | ')} |`, ...body.map((r) => `| ${r.join(' | ')} |`)].join('\n');
}

function markdown(rows, { sources, checks }) {
  const target = rows.filter((r) => !r.own);
  const none = target.filter((r) => !r.wiki);
  const L = (set, l) => set.filter((r) => r.level === l).length;
  const levels = ['verified', 'context', 'candidates', 'none'];
  const label = { verified: 'Präsenz von Hand belegt', context: 'nur Kontext oder Widerspruch', candidates: 'nur ungeprüfte Hinweise', none: 'nichts gefunden' };
  const lines = [];
  lines.push(`_Erzeugt mit \`node scripts/research/summarize.mjs\` – ${new Date().toISOString().slice(0, 10)}._`, '');
  lines.push('### Abdeckung der Standorte ohne eigene Quelle', '');
  lines.push(table(['Belegstand nach der Recherche', `ohne eigene Quelle (${target.length})`, `davon ganz ohne Quelle (${none.length})`],
    levels.map((l) => [label[l], `${L(target, l)} (${pct(L(target, l), target.length)})`, `${L(none, l)} (${pct(L(none, l), none.length)})`])), '');

  lines.push('### Belegte Aussagen (Standorte ohne eigene Quelle)', '');
  lines.push(table(['Aussage', 'Standorte mit handgeprüfter stützender Quelle'], CLAIMS.map((c) => [c, `${target.filter((r) => r.supports.has(c)).length} (${pct(target.filter((r) => r.supports.has(c)).length, target.length)})`])), '');

  const manual = sources.filter((s) => s.method === 'manual');
  lines.push('### Handgeprüfte Quellen nach Art', '');
  lines.push(table(['Art', 'Einträge', 'Standorte', 'supports', 'contradicts', 'context'], SOURCE_TYPES.map((t) => {
    const m = manual.filter((s) => s.type === t);
    return [t, m.length, new Set(m.map((s) => s.base)).size, m.filter((s) => s.verdict === 'supports').length, m.filter((s) => s.verdict === 'contradicts').length, m.filter((s) => s.verdict === 'context').length];
  }).filter((r) => r[1])), '');
  lines.push(`Sammler: ${Object.entries(Object.groupBy(sources, (s) => s.collector ?? '?')).map(([k, v]) => `${k} ${v.length}`).join(', ')} Quelleneinträge; davon ${sources.filter((s) => s.method !== 'manual').length} noch ungeprüft.`, '');

  lines.push('### Nach Gastland (Standorte ohne eigene Quelle)', '');
  const byCountry = Object.entries(Object.groupBy(target, (r) => r.b.country)).sort((a, b) => b[1].length - a[1].length);
  lines.push(table(['Land', 'Standorte', 'belegt', 'nur Kontext', 'nur Hinweise', 'nichts'], byCountry.filter(([, v]) => v.length >= 4).map(([cc, v]) => [cc, v.length, ...levels.map((l) => L(v, l))])), '');
  const small = byCountry.filter(([, v]) => v.length < 4);
  lines.push(`Weitere ${small.length} Länder mit weniger als 4 solchen Standorten: ${small.reduce((n, [, v]) => n + v.length, 0)} Standorte, davon ${small.reduce((n, [, v]) => n + L(v, 'verified'), 0)} belegt.`, '');

  const checked = Object.values(checks);
  lines.push('### Automatische Prüfungen (alle Standorte)', '');
  lines.push(table(['Prüfung', 'Ergebnis'], [
    ['BSR-FY2023-Treffer', checked.filter((c) => c.bsr?.fy2023).length],
    ['BSR nur FY2019 (Statusfrage)', checked.filter((c) => c.bsr?.fy2019 && !c.bsr?.fy2023).length],
    ['Wikidata-Objekt gefunden', checked.filter((c) => c.wikidata?.item).length],
    [`Wikidata-Position > ${FAR_KM} km entfernt`, checked.filter((c) => c.wikidata?.distanceKm > FAR_KM).length],
    ['Wikidata: Schließungs-/Auflösungsdatum', checked.filter((c) => c.wikidata?.dissolved).length],
    ['OSM: militärisches Objekt ≤ 1 km', checked.filter((c) => c.osm?.verdict === 'confirmed').length],
    ['OSM: militärisches Objekt 1–3 km', checked.filter((c) => c.osm?.verdict === 'near').length],
    ['OSM: nichts im Umkreis von 3 km', checked.filter((c) => c.osm?.verdict === 'none').length],
  ]), '');

  const contra = rows.filter((r) => r.contradicts);
  lines.push(`### Gefundene Widersprüche (${contra.length} Standorte)`, '');
  for (const r of contra) lines.push(`- **${r.b.name}** (\`${r.b.id}\`, ${r.b.country}): ${r.contradicting.map(({ s }) => s.note || s.summary).join(' – ')}`);
  lines.push('');

  const open = target.filter((r) => r.level === 'none' || r.level === 'candidates');
  lines.push(`### Weiterhin ohne geprüften Beleg (${open.length} Standorte)`, '');
  lines.push(open.map((r) => `\`${r.b.id}\``).join(', '), '');
  return lines.join('\n');
}

async function main() {
  const bases = await loadBases();
  const research = await loadResearch();
  const rows = summarize(bases, research);
  await fs.mkdir(DOCS, { recursive: true });
  await fs.writeFile(path.join(DOCS, 'coverage.csv'), csv(rows));
  const block = markdown(rows, research);
  let report = await fs.readFile(REPORT, 'utf8').catch(() => '<!-- summary:start -->\n<!-- summary:end -->\n');
  report = report.replace(/<!-- summary:start -->[\s\S]*?<!-- summary:end -->/, `<!-- summary:start -->\n${block}\n<!-- summary:end -->`);
  await fs.writeFile(REPORT, report);
  const t = rows.filter((r) => !r.own);
  console.log(`✔ summary: ${t.length} bases without own source – ${t.filter((r) => r.level === 'verified').length} verified, ${t.filter((r) => r.level === 'context').length} context only, ${t.filter((r) => r.level === 'candidates').length} leads only, ${t.filter((r) => r.level === 'none').length} nothing`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
