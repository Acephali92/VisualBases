#!/usr/bin/env node
/**
 * Merge the hand-checked research (data/research/manual.json) into sources.json.
 *
 *   node scripts/research/manual.mjs
 *
 * manual.json is edited by hand. One entry describes one checked source and may cover several bases
 * (e.g. a defence agreement listing many sites). Per-base deviations go into `perBase`:
 *   { "url": …, "title": …, "publisher": …, "type": …, "published": …, "accessed": …, "httpStatus": 200,
 *     "supports": ["presence","nation"], "verdict": "supports", "summary": "…",
 *     "bases": ["s-berga", …], "perBase": { "s-halmstad-…": { "verdict": "context", "note": "…" } } }
 * Every entry is a page that was actually opened and read (scripts/research/inspect.mjs).
 */
import path from 'node:path';
import { RESEARCH, readJson, saveSources } from './lib.mjs';

export function expandManual(entries) {
  const out = [];
  for (const e of entries) {
    const { bases = [], perBase = {}, ...src } = e;
    for (const base of bases) out.push({ ...src, ...(perBase[base] ?? {}), base, method: 'manual', note: perBase[base]?.note ?? src.note ?? '' });
  }
  return out;
}

async function main() {
  const entries = await readJson(path.join(RESEARCH, 'manual.json'), []);
  const expanded = expandManual(entries);
  const total = await saveSources('manual', expanded);
  console.log(`✔ manual research: ${entries.length} sources → ${expanded.length} base entries; sources.json has ${total} entries`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
