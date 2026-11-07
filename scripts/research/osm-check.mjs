#!/usr/bin/env node
/**
 * Position check against OpenStreetMap (Overpass API).
 *
 *   node scripts/research/osm-check.mjs
 *
 * For every base: military areas (landuse=military, military=*) and aerodromes within 3 km.
 * Records in checks.json the nearest feature (distance, name, operator) and a position verdict:
 *   "confirmed" ≤ 1 km · "near" ≤ 3 km · "none" (nothing military within 3 km)
 * OpenStreetMap confirms the location of a military site, never who is stationed there.
 */
import { fetchWithRetry, loadBases, saveChecks } from './lib.mjs';
import { distanceKm } from '../../src/lib/data.ts';

const OVERPASS = process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter';
const RADIUS = 3000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function query(lat, lon) {
  return `[out:json][timeout:60];(
    nwr(around:${RADIUS},${lat},${lon})["landuse"="military"];
    nwr(around:${RADIUS},${lat},${lon})["military"];
    nwr(around:${RADIUS},${lat},${lon})["aeroway"="aerodrome"];
  );out center tags 40;`;
}

/** evaluate Overpass elements for one base */
export function evaluate(base, elements) {
  const feats = elements
    .map((e) => {
      const c = e.center ?? (e.lat != null ? { lat: e.lat, lon: e.lon } : null);
      if (!c) return null;
      const t = e.tags ?? {};
      return {
        km: Math.round(distanceKm(base.lat, base.lon, c.lat, c.lon) * 100) / 100,
        osm: `${e.type}/${e.id}`,
        name: t.name ?? t['name:en'] ?? null,
        operator: t.operator ?? t['military:operator'] ?? null,
        kind: t.military ?? (t.landuse === 'military' ? 'military area' : t.aeroway === 'aerodrome' ? 'aerodrome' : null),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.km - b.km);
  const nearest = feats[0] ?? null;
  return {
    verdict: !nearest ? 'none' : nearest.km <= 1 ? 'confirmed' : 'near',
    nearest,
    named: feats.filter((f) => f.name).slice(0, 3),
    count: feats.length,
  };
}

async function main() {
  const bases = await loadBases();
  const checks = {};
  let failed = 0;
  for (const [i, b] of bases.entries()) {
    const r = await fetchWithRetry(`${OVERPASS}?data=${encodeURIComponent(query(b.lat, b.lon))}`, { tries: 4 });
    await sleep(1200);
    if (!r || r.status !== 200) { failed++; continue; }
    try { checks[b.id] = evaluate(b, JSON.parse(r.body).elements ?? []); } catch { failed++; }
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${bases.length}`);
  }
  await saveChecks('osm', checks);
  const v = Object.values(checks);
  console.log(`✔ OSM: ${v.filter((c) => c.verdict === 'confirmed').length} confirmed, ${v.filter((c) => c.verdict === 'near').length} near, ${v.filter((c) => c.verdict === 'none').length} none, ${failed} failed`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
