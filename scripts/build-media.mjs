#!/usr/bin/env node
/**
 * Download (cached) and optimise all images referenced in data/bases.json.
 *
 *   node scripts/build-media.mjs [--offline]
 *
 * Writes:
 *   public/media/<name>.webp        (max 1400 px wide)
 *   public/media/<name>-480.webp    (thumbnail)
 *   data/media.json                 (type, year, size, credit per image – keyed by original URL)
 *
 * Images come from the project's own uploads on visualbases.org (permission granted by
 * the project's author) and from Wikimedia Commons (free licences, see data/wikimedia.json).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, '.cache/images');
const OUT = path.join(ROOT, 'public/media');
const offline = process.argv.includes('--offline');
const UA = 'VisualBases-open-data-import (+https://github.com/Acephali92/VisualBases)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** classify an image by its file name and caption */
export function classify(file, caption = '') {
  const yearOf = (s) => (s.match(/\b(19[89]\d|20[0-4]\d)\b/g) ?? []).map(Number);
  if (/^(GE|GA)[_-]|^niger201|^plant_drone_base|^powidz/i.test(file)) {
    const years = yearOf(caption).length ? yearOf(caption) : yearOf(file.replace(/[_-]/g, ' '));
    return { type: 'satellite', year: years[0], credit: 'Google Earth' };
  }
  if (/^OSB[_-]/i.test(file)) return { type: 'map', credit: '© OpenStreetMap contributors · OpenStreetBrowser' };
  if (/^campaign[_-]/i.test(file)) return { type: 'logo', credit: 'Kampagne / campaign' };
  // slides, charts, infographics and maps from talks or reports
  if (/guantanomo-(titel|interventions)|pipeline|statistic|statista|webinar|military_facilities|sk_update|nato-nord|logistik|aps_afsb|artikelbild|vortrag|quadriga|rader|luftpost|defendereurope/i.test(file))
    return { type: 'document', credit: 'visualbases.org' };
  if (/wikimedia|wikipedia/i.test(file + caption)) return { type: 'photo', credit: 'Wikimedia Commons' };
  if (/flickr/i.test(file)) return { type: 'photo', credit: 'Flickr' };
  return { type: 'photo', credit: 'visualbases.org' };
}

const slugify = (s) => s.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

let limitedInARow = 0;
/** after several rate-limited images in a row, stop downloading for this run (resume later) */
const MAX_LIMITED = 3;

async function download(url, file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    if (offline || limitedInARow >= MAX_LIMITED) return false;
    await sleep(400);
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(60000) });
      } catch (e) {
        console.warn(`  ! ${e.cause?.code ?? e.name} ${url}`);
        await sleep(3000);
        continue;
      }
      if (res.status !== 429) break;
      const wait = 15 * 2 ** attempt;
      console.log(`  … rate limited, waiting ${wait}s`);
      await sleep(wait * 1000);
    }
    if (res?.status === 429) {
      if (++limitedInARow >= MAX_LIMITED) console.warn('  ! rate limited repeatedly – stopping downloads for now, run again later');
      return false;
    }
    limitedInARow = 0;
    if (!res || !res.ok || !/^image\//.test(res.headers.get('content-type') ?? '')) { console.warn(`  ! ${res?.status ?? 'failed'} ${url}`); return false; }
    await fs.writeFile(file, Buffer.from(await res.arrayBuffer()));
    return true;
  }
}

async function main() {
  const bases = JSON.parse(await fs.readFile(path.join(ROOT, 'data/bases.json'), 'utf8'));
  let wiki = {};
  try { wiki = JSON.parse(await fs.readFile(path.join(ROOT, 'data/wikimedia.json'), 'utf8')); } catch { /* optional */ }

  let media = {};
  try { media = JSON.parse(await fs.readFile(path.join(ROOT, 'data/media.json'), 'utf8')); } catch { /* first run */ }

  await fs.mkdir(CACHE, { recursive: true });
  await fs.mkdir(OUT, { recursive: true });

  const jobs = new Map();
  for (const b of bases) for (const img of b.images ?? []) jobs.set(img.url, { caption: img.caption, ...classify(decodeURIComponent(img.url.split('/').pop()), img.caption) });
  let movement = {};
  try { movement = JSON.parse(await fs.readFile(path.join(ROOT, 'data/movement.json'), 'utf8')); } catch { /* optional */ }
  for (const s of movement.congress?.speakers ?? []) if (s.photo) jobs.set(`https://visualbases.org/wp-content/uploads/${s.photo}`, { caption: s.name, type: 'portrait', credit: 'visualbases.org' });
  for (const w of Object.values(wiki)) if (w?.url) jobs.set(w.url, { caption: w.title ?? '', type: 'photo', credit: w.credit, license: w.license, licenseUrl: w.licenseUrl, sourceUrl: w.page });

  let done = 0, skipped = 0;
  for (const [url, meta] of jobs) {
    const file = decodeURIComponent(url.split('/').pop().split('?')[0]);
    const name = slugify(file);
    const src = path.join(CACHE, file);
    const full = path.join(OUT, `${name}.webp`);
    const thumb = path.join(OUT, `${name}-480.webp`);
    if (media[url] && (await fs.access(full).then(() => true, () => false))) { skipped++; continue; }
    if (!(await download(url, src))) continue;
    try {
      const img = sharp(src, { animated: false }).rotate();
      const m = await img.metadata();
      if (!m.width || m.width < 120) continue;
      const q = meta.type === 'logo' || meta.type === 'map' ? 86 : 78;
      const f = await img.clone().resize({ width: 1400, withoutEnlargement: true }).webp({ quality: q }).toFile(full);
      const t = meta.type === 'portrait'
        ? await img.clone().resize({ width: 320, height: 320, fit: 'cover', position: 'attention' }).webp({ quality: 78 }).toFile(thumb)
        : await img.clone().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 72 }).toFile(thumb);
      media[url] = {
        src: `media/${name}.webp`, thumb: `media/${name}-480.webp`,
        w: f.width, h: f.height, tw: t.width, th: t.height,
        type: meta.type, year: meta.year, credit: meta.credit,
        license: meta.license, licenseUrl: meta.licenseUrl, sourceUrl: meta.sourceUrl ?? url,
      };
      done++;
      if (done % 10 === 0) await fs.writeFile(path.join(ROOT, 'data/media.json'), JSON.stringify(media, null, 1) + '\n');
    } catch (e) {
      console.warn(`  ! ${file}: ${e.message}`);
    }
  }
  if (process.argv.includes('--prune')) {
    // drop entries and files that no base, speaker or Wikimedia record refers to any more
    for (const url of Object.keys(media)) if (!jobs.has(url)) delete media[url];
    const keep = new Set(Object.values(media).flatMap((m) => [path.basename(m.src), path.basename(m.thumb)]));
    let removed = 0;
    for (const f of await fs.readdir(OUT)) if (!keep.has(f)) { await fs.unlink(path.join(OUT, f)); removed++; }
    console.log(`  pruned ${removed} unused files`);
  }
  await fs.writeFile(path.join(ROOT, 'data/media.json'), JSON.stringify(media, null, 1) + '\n');
  console.log(`✔ media: ${done} processed, ${skipped} cached, ${Object.keys(media).length} total`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
