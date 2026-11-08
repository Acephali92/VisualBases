#!/usr/bin/env node
/**
 * Build the public open-data files from data/*.json:
 *   public/data/bases.json     (minified, used by the app; without research sources and raw terms)
 *   public/data/research.json  (checked sources per record, loaded with a profile)
 *   public/data/bases.geojson  (GeoJSON FeatureCollection)
 *   public/data/bases.csv      (spreadsheet friendly)
 *   public/data/taxonomy.json  (vocabulary: IDs, labels de/en, definitions)
 *   public/data/stories.json
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBases } from './lib/resolve.mjs';
import { toCsv, toGeoJSON } from './lib/export.mjs';
import { readJson } from './research/lib.mjs';
import { VOCABULARIES, TERRITORY_SOVEREIGN } from '../src/lib/taxonomy.ts';

/** attribution required by the CC BY 4.0 data licence (data/LICENSE.md) */
export const ATTRIBUTION = 'VisualBases – visualbases.org (Karl-Heinz Peil, Friedens- und Zukunftswerkstatt e. V.), CC BY 4.0';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(ROOT, 'public/data');
const sourceBases = JSON.parse(await fs.readFile(path.join(ROOT, 'data/bases.json'), 'utf8'));
const stories = JSON.parse(await fs.readFile(path.join(ROOT, 'data/stories.json'), 'utf8'));
// optional files may be missing, but a malformed file stops the build (it must not drop corrections silently)
const readOpt = (f) => readJson(path.join(ROOT, f), {});
const media = await readOpt('data/media.json');
const wikimedia = await readOpt('data/wikimedia.json');
const corrections = await readOpt('data/corrections.json');
const claims = (await readOpt('data/claims.json')).claims ?? [];
const researchFile = await readOpt('data/research/sources.json');
const research = Array.isArray(researchFile) ? researchFile : [];

const { bases, problems, notices } = resolveBases(sourceBases, { claims, research, corrections, media, wikimedia });
for (const p of [...problems, ...notices]) console.warn(`! [${p.rule}] ${p.id}: ${p.msg}`);
await fs.mkdir(out, { recursive: true });

// the app loads a lean file; research sources are loaded only when a profile is opened, and the raw
// source terms are only needed for the open-data exports (GeoJSON keeps everything)
const lean = bases.map(({ research, origin, ...b }) => ({ ...b, origin: { ...origin, terms: undefined } }));
await fs.writeFile(path.join(out, 'bases.json'), JSON.stringify(lean));
await fs.writeFile(path.join(out, 'research.json'), JSON.stringify(Object.fromEntries(bases.filter((b) => b.research).map((b) => [b.id, b.research]))));
await fs.writeFile(path.join(out, 'stories.json'), JSON.stringify(stories));
const movement = await readOpt('data/movement.json');
for (const s of movement.congress?.speakers ?? []) {
  const m = media[`https://visualbases.org/wp-content/uploads/${s.photo}`];
  s.photo = m ? m.thumb : undefined;
}
await fs.writeFile(path.join(out, 'movement.json'), JSON.stringify(movement));
// the data licence travels with every download
await fs.copyFile(path.join(ROOT, 'data/LICENSE.md'), path.join(out, 'LICENSE.txt'));
const news = await readOpt('data/news.json');
await fs.writeFile(path.join(out, 'news.json'), JSON.stringify(Array.isArray(news) ? news : []));

await fs.writeFile(path.join(out, 'bases.geojson'), JSON.stringify(toGeoJSON(bases, ATTRIBUTION)));
// vocabulary export: every ID with its German and English label and definition
await fs.writeFile(path.join(out, 'taxonomy.json'), JSON.stringify({ schema: 'visualbases-taxonomy-v2', territories: TERRITORY_SOVEREIGN, ...VOCABULARIES }));
await fs.writeFile(path.join(out, 'bases.csv'), toCsv(bases));

console.log(`✔ public/data: ${bases.length} bases (json, geojson, csv, taxonomy), ${stories.length} stories`);
