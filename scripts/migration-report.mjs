#!/usr/bin/env node
/**
 * Migration v1 → v2 (taxonomy refactoring, 2026-11-07): compares the old records with the new
 * import layer and the resolved records and writes
 *
 *   docs/taxonomy/migration-v1-v2.csv   one row per site: old values → new values, review notes
 *   docs/taxonomy/MIGRATION-REPORT.md   summary, mapping counts, records for manual review
 *
 *   node scripts/migration-report.mjs <old data/bases.json>
 *   (e.g. git show c89a84c:data/bases.json > /tmp/v1.json)
 *
 * The CSV is also the fixture of src/lib/migration.test.ts, which checks that no site, source,
 * image or classification got lost.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBases } from './lib/resolve.mjs';
import { label } from '../src/lib/taxonomy.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** old value → new value(s); the documented mapping (docs/TAXONOMY.md, "Migrationsregeln") */
export const V1_KIND = {
  foreign: ['foreign-base', 'overseas-base'], shared: ['shared-base', 'region-cluster'] /* overview entry */, national: ['host-base-foreign-use'], usglobal: ['domestic-global'],
  civilian: ['civilian-site'], facility: ['special-facility'], hotspot: ['garrison', 'region-cluster'], unspecific: ['unspecified'],
  closed: ['military-base', 'unspecified'], // + status closed
};
export const V1_FACILITY = {
  airfield: 'airfield', naval: 'naval-port', command: 'command', missile: 'missile-defence', nuclear: 'nuclear-sharing', telecom: 'telecom-station',
  training: 'training-area', depot: 'depot', helipad: 'helipad', laboratory: 'laboratory', civilairport: 'civil-airport-use', civilport: 'civil-port-use',
};
/** old themes → [dimension, new value] */
export const V1_THEME = {
  resistance: ['themes', 'resistance'], drones: ['themes', 'drone-warfare'], environment: ['themes', 'environment'],
  surveillance: ['features', 'signals-intelligence'], radar: ['features', 'radar-station'],
  defender: ['activities', 'defender-europe-*'], 'atlantic-resolve': ['activities', 'atlantic-resolve'], un: ['activities', 'un-mission'],
};
export const V1_SHARED_ORG = { NATO: 'nato', EU: 'eu' };

const join = (a) => (a ?? []).join(';');
const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function rows(v1, v2, resolved) {
  const byId2 = new Map(v2.map((b) => [b.id, b]));
  const byIdR = new Map(resolved.map((b) => [b.id, b]));
  return v1.map((o) => {
    const n = byId2.get(o.id);
    const r = byIdR.get(o.id);
    return {
      id: o.id,
      name: o.name,
      v1_country: o.country,
      v1_kind: o.kind,
      v1_group: o.group ? 'yes' : '',
      v1_nations: join(o.nations),
      v1_shared_with: join(o.sharedWith),
      v1_facilities: join(o.facilities),
      v1_themes: join(o.themes),
      v1_sources: (o.sources ?? []).length,
      v1_images: (o.images ?? []).length,
      v1_wikipedia: Object.keys(o.wikipedia ?? {}).length,
      v1_notes: (o.notes ?? []).length,
      v1_related: join(o.related),
      host_country: n?.host.country ?? '',
      host_territory: n?.host.territory ?? '',
      site_type: n?.siteType ?? 'MISSING',
      status: n?.status ?? '',
      presences: join(n?.presences.map((p) => `${p.nation}:${p.role}:${p.via}`)),
      organisations: join(n?.organisations),
      features: join(n?.features),
      themes: join(n?.themes),
      activities: join(n?.activities),
      relations: join(n?.relations?.map((x) => `${x.type}:${x.id}`)),
      sources: (n?.sources ?? []).length,
      images: (n?.images ?? []).length,
      wikipedia: Object.keys(n?.wikipedia ?? {}).length,
      notes: (n?.notes ?? []).length,
      raw_kind_terms: join(n?.origin.terms.categories.filter((c) => ['foreign-bases', 'shared-bases', 'national-base', 'us-global', 'civilian-location', 'extra-facility', 'meta-site', 'unspecific', 'closed'].includes(c))),
      corrections: join(r?.corrections?.map((c) => c.id)),
      proposals: join(r?.proposals?.map((c) => c.id)),
      issues: join(r?.issues),
      scope: r?.scope ?? '',
    };
  });
}

export function toCsv(list) {
  const cols = Object.keys(list[0]);
  return [cols.join(','), ...list.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
}

function report(list, v2, resolved) {
  const count = (f) => { const m = new Map(); for (const r of list) for (const k of [].concat(f(r))) m.set(k, (m.get(k) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const pairs = count((r) => `${r.v1_kind} → ${r.site_type}${r.status === 'closed' ? ' + closed' : ''}`);
  const review = resolved.filter((b) => (b.issues ?? []).length || (b.proposals ?? []).length);
  const byIssue = count((r) => (r.issues ? r.issues.split(';') : []));
  const L = (dim, id) => label(dim, id, 'de');
  const lines = [
    '# Migrationsbericht Taxonomie v1 → v2',
    '',
    `Erzeugt mit \`scripts/migration-report.mjs\` am ${new Date().toISOString().slice(0, 10)}. Einzelwerte je Standort: [migration-v1-v2.csv](migration-v1-v2.csv). Regeln: [TAXONOMY.md](../TAXONOMY.md#12-migrationsregeln).`,
    '',
    '## Vollständigkeit',
    '',
    '| Prüfung | v1 | v2 |',
    '|---|---:|---:|',
    `| Standorte | ${list.length} | ${v2.length} |`,
    `| Quellenlinks | ${list.reduce((n, r) => n + r.v1_sources, 0)} | ${list.reduce((n, r) => n + r.sources, 0)} |`,
    `| Bildreferenzen | ${list.reduce((n, r) => n + r.v1_images, 0)} | ${list.reduce((n, r) => n + r.images, 0)} |`,
    `| Wikipedia-Links | ${list.reduce((n, r) => n + r.v1_wikipedia, 0)} | ${list.reduce((n, r) => n + r.wikipedia, 0)} |`,
    `| Notizen | ${list.reduce((n, r) => n + r.v1_notes, 0)} | ${list.reduce((n, r) => n + r.notes, 0)} |`,
    `| Standorte ohne Standorttyp | – | ${list.filter((r) => r.site_type === 'MISSING').length} |`,
    '',
    'Standort-IDs und damit alle URLs (`#/base/<id>`, `b/<id>.html`) sind unverändert.',
    '',
    '## Standortart (v1) → Standorttyp und Status (v2)',
    '',
    '| v1 → v2 | Standorte |',
    '|---|---:|',
    ...pairs.map(([k, v]) => `| ${k} | ${v} |`),
    '',
    '## Angewandte Korrekturen (data/claims.json)',
    '',
    ...resolved.filter((b) => b.corrections?.length).flatMap((b) => b.corrections.map((c) => `- \`${b.id}\` – ${c.field}: ${JSON.stringify(c.from) ?? "–"} → ${JSON.stringify(c.to) ?? "–"}. ${c.statement.de}`)),
    '',
    '## Manuell zu prüfen',
    '',
    `${review.length} Einträge tragen einen Prüfhinweis oder einen offenen Korrekturvorschlag.`,
    '',
    '| Hinweis | Einträge |',
    '|---|---:|',
    ...byIssue.map(([k, v]) => `| ${L('issue', k)} (\`${k}\`) | ${v} |`),
    `| Offener Korrekturvorschlag | ${resolved.filter((b) => b.proposals?.length).length} |`,
    '',
    '| Standort | Hinweise | Vorschläge |',
    '|---|---|---|',
    ...review.map((b) => `| [${b.name}](../../data/bases.json) (\`${b.id}\`) | ${(b.issues ?? []).map((i) => L('issue', i)).join(', ')} | ${(b.proposals ?? []).map((p) => p.statement.de).join(' ')} |`),
    '',
  ];
  return lines.join('\n');
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('usage: node scripts/migration-report.mjs <old bases.json>');
  const read = async (f, fb) => { try { return JSON.parse(await fs.readFile(path.resolve(ROOT, f), 'utf8')); } catch { return fb; } };
  const v1 = await read(file);
  const v2 = await read('data/bases.json');
  const { bases: resolved } = resolveBases(v2, {
    claims: (await read('data/claims.json', {})).claims ?? [],
    research: await read('data/research/sources.json', []),
    corrections: await read('data/corrections.json', {}),
  });
  const list = rows(v1, v2, resolved);
  await fs.mkdir(path.join(ROOT, 'docs/taxonomy'), { recursive: true });
  await fs.writeFile(path.join(ROOT, 'docs/taxonomy/migration-v1-v2.csv'), toCsv(list));
  await fs.writeFile(path.join(ROOT, 'docs/taxonomy/MIGRATION-REPORT.md'), report(list, v2, resolved));
  console.log(`✔ migration report: ${list.length} sites → docs/taxonomy/`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
