#!/usr/bin/env node
/**
 * Build the public open-data files from data/*.json:
 *   public/data/bases.json     (minified, used by the app)
 *   public/data/bases.geojson  (GeoJSON FeatureCollection)
 *   public/data/bases.csv      (spreadsheet friendly)
 *   public/data/stories.json
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(ROOT, 'public/data');
const bases = JSON.parse(await fs.readFile(path.join(ROOT, 'data/bases.json'), 'utf8'));
const stories = JSON.parse(await fs.readFile(path.join(ROOT, 'data/stories.json'), 'utf8'));
await fs.mkdir(out, { recursive: true });

await fs.writeFile(path.join(out, 'bases.json'), JSON.stringify(bases));
await fs.writeFile(path.join(out, 'stories.json'), JSON.stringify(stories));

const geojson = {
  type: 'FeatureCollection',
  metadata: {
    title: 'VisualBases – foreign military bases worldwide',
    license: 'Data compiled by VisualBases (visualbases.org). See README for attribution.',
    generated: new Date().toISOString().slice(0, 10),
    count: bases.length,
  },
  features: bases.map(({ lat, lon, ...props }) => ({
    type: 'Feature',
    id: props.id,
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: props,
  })),
};
await fs.writeFile(path.join(out, 'bases.geojson'), JSON.stringify(geojson));

const cols = ['id', 'name', 'country', 'lat', 'lon', 'kind', 'nations', 'sharedWith', 'facilities', 'themes', 'usType', 'continent', 'region', 'subregion', 'wikipedia_en', 'origin', 'lastmod'];
const esc = (v) => {
  const s = v == null ? '' : Array.isArray(v) ? v.join(';') : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = [cols.join(','), ...bases.map((b) => cols.map((c) => esc(c === 'wikipedia_en' ? b.wikipedia?.en : b[c])).join(','))].join('\n');
await fs.writeFile(path.join(out, 'bases.csv'), '﻿' + csv + '\n');

console.log(`✔ public/data: ${bases.length} bases (json, geojson, csv), ${stories.length} stories`);
