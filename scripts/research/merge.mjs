#!/usr/bin/env node
/**
 * Merge the results of the parallel collector jobs of the workflow "Recherche" into data/research/.
 *
 *   node scripts/research/merge.mjs bsr=<dir> wikidata=<dir> wiki-refs=<dir> osm=<dir>
 *
 * Every <dir> is a copy of data/research/ as one collector job left it. From each copy only that
 * collector's own entries are taken (sources.json / candidates.json entries with its `collector`,
 * its key in checks.json); everything else – manual research above all – stays as it is here.
 * A missing directory (job failed or was skipped) leaves the collector's previous results in place.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { readJson, saveSources, saveChecks } from './lib.mjs';

/** what each collector writes (see the collector scripts) */
export const OUTPUTS = {
  bsr: { sources: 'sources.json', checks: 'bsr' },
  wikidata: { sources: 'candidates.json', checks: 'wikidata' },
  'wiki-refs': { sources: 'candidates.json' },
  osm: { checks: 'osm' },
};

/** entries of one collector from a job's copy; null if the job left no file (keep previous results) */
export async function collectorResults(collector, dir) {
  const out = OUTPUTS[collector];
  if (!out) throw new Error(`unknown collector "${collector}"`);
  const result = {};
  if (out.sources) {
    const list = await readJson(path.join(dir, out.sources), null);
    if (list) result.sources = list.filter((s) => s.collector === collector).map(({ collector: _, ...s }) => s);
  }
  if (out.checks) {
    const checks = await readJson(path.join(dir, 'checks.json'), null);
    if (checks) result.checks = Object.fromEntries(Object.entries(checks).filter(([, c]) => c[out.checks]).map(([id, c]) => [id, c[out.checks]]));
  }
  return result;
}

async function main() {
  for (const arg of process.argv.slice(2)) {
    const [collector, dir] = arg.split('=');
    try { await fs.access(dir); } catch { console.log(`  ${collector}: no results (job failed or skipped) – previous results kept`); continue; }
    const r = await collectorResults(collector, dir);
    const out = OUTPUTS[collector];
    if (r.sources) await saveSources(collector, r.sources, out.sources);
    if (r.checks) await saveChecks(out.checks, r.checks);
    console.log(`  ${collector}: ${r.sources?.length ?? '–'} source entries, ${r.checks ? Object.keys(r.checks).length : '–'} checks`);
  }
  console.log('✔ research results merged into data/research/');
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
