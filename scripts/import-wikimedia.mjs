#!/usr/bin/env node
/**
 * Find a freely licensed lead photo on Wikimedia Commons for every base that has a Wikipedia article.
 *
 *   node scripts/import-wikimedia.mjs
 *
 * - batches of 50 titles per API request, 1 s pause between requests, descriptive User-Agent
 * - keeps only free licences (CC0, CC BY, CC BY-SA, public domain) and skips maps, logos, insignia, flags
 * - stores author, licence and file page for attribution in data/wikimedia.json
 * The images themselves are downloaded and optimised by scripts/build-media.mjs.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'VisualBases-OpenData/0.1 (https://github.com/Acephali92/VisualBases)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const SKIP_FILE = /map|karte|locator|location|lage|logo|emblem|insignia|insigne|seal|flag|flagge|wappen|coat[_ ]of|patch|badge|crest|diagram|chart|\.svg$|\.gif$|\.tif/i;
export const FREE = /^(cc0|cc[- ]by(-sa)?([- ]\d\.\d)?.*|public domain|pd.*|attribution.*)$/i;

async function api(host, params) {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let attempt = 0; attempt < 7; attempt++) {
    const res = await fetch(url, { headers: { 'user-agent': UA, 'api-user-agent': UA } });
    if (res.status === 429) {
      const wait = Math.min(120, 10 * 2 ** attempt);
      console.log(`  … rate limited, waiting ${wait}s`);
      await sleep(wait * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    await sleep(1000);
    return res.json();
  }
  throw new Error(`rate limited: ${url}`);
}

/**
 * Several Wikipedia links of the source data point to the surrounding town, whose lead image is a
 * church or a town hall. Keep a photo only if the article is about a military installation – or the
 * file is an official US military photo (DoD naming scheme "YYMMDD-X-…").
 */
const MILITARY = /air ?base|airbase|\bbase\b|camp|station|airport|aerodrome|airfield|barracks|kaserne|caserma|fort\b|garrison|naval|field|range|depot|facility|military|milit[äa]r|\braf\b|\bnas\b|\bab\b|training|fliegerhorst|stützpunkt|flugplatz|truppenübungsplatz|command|centre|center|headquarters|port|harbou?r|army|navy|marine|joint|radar|defen[cs]e|pipeline|shoal|globus|sinjajevina|pine gap|menwith|diego garcia|guant[aá]namo|lemonnier|installation|complex|test site|proving ground/i;
export const relevant = (article, file = '') => MILITARY.test(article) || /^\d{6}-[A-Z]-/.test(file);

const titleOf = (u) => decodeURIComponent(u.split('/wiki/')[1] ?? '').split('#')[0].replace(/_/g, ' ');
const plain = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function main() {
  const bases = JSON.parse(await fs.readFile(path.join(ROOT, 'data/bases.json'), 'utf8'));
  let out = {};
  try { out = JSON.parse(await fs.readFile(path.join(ROOT, 'data/wikimedia.json'), 'utf8')); } catch { /* first run */ }

  // 1. lead image file names per article (en first, de as fallback) – cached so runs can resume
  const CAND = path.join(ROOT, '.cache/wiki-candidates.json');
  let cached = { done: {} };
  try { cached = JSON.parse(await fs.readFile(CAND, 'utf8')); } catch { /* none yet */ }
  const candidates = new Map(Object.entries(cached.done).filter(([, v]) => v)); // base id -> file title
  const saveCand = () => fs.writeFile(CAND, JSON.stringify(cached));
  for (const lang of ['en', 'de']) {
    const todo = bases.filter((b) => b.wikipedia?.[lang] && !candidates.has(b.id) && !(b.id in out) && !(`${lang}:${b.id}` in cached.done));
    for (let i = 0; i < todo.length; i += 50) {
      const chunk = todo.slice(i, i + 50);
      const titles = chunk.map((b) => titleOf(b.wikipedia[lang]));
      const r = await api(`${lang}.wikipedia.org`, { action: 'query', prop: 'pageimages', piprop: 'name', pilicense: 'free', redirects: '1', titles: titles.join('|') });
      const norm = new Map();
      for (const n of r.query?.normalized ?? []) norm.set(n.from, n.to);
      for (const n of r.query?.redirects ?? []) norm.set(n.from, n.to);
      const byTitle = new Map((r.query?.pages ?? []).map((p) => [p.title, p.pageimage]));
      chunk.forEach((b, k) => {
        let tt = titles[k];
        while (norm.has(tt)) tt = norm.get(tt);
        const img = byTitle.get(tt);
        cached.done[`${lang}:${b.id}`] = true;
        if (img && !SKIP_FILE.test(img) && relevant(titles[k], img)) { candidates.set(b.id, img); cached.done[b.id] = img; }
      });
      await saveCand();
      console.log(`  ${lang}: ${Math.min(i + 50, todo.length)}/${todo.length} articles, ${candidates.size} candidates`);
    }
  }

  // 2. licence + author from Commons, thumbnail URL 1600 px
  const ids = [...candidates.keys()].filter((id) => !(id in out));
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const files = chunk.map((id) => `File:${candidates.get(id)}`);
    const r = await api('commons.wikimedia.org', { action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size', iiurlwidth: '1600', titles: files.join('|') });
    const norm = new Map((r.query?.normalized ?? []).map((n) => [n.from, n.to]));
    const pages = new Map((r.query?.pages ?? []).map((p) => [p.title, p]));
    chunk.forEach((id, k) => {
      const p = pages.get(norm.get(files[k]) ?? files[k]);
      const ii = p?.imageinfo?.[0];
      if (!ii || !/^image\/(jpeg|png|webp)$/.test(ii.mime) || ii.width < 600) { out[id] = null; return; }
      const md = ii.extmetadata ?? {};
      const license = plain(md.LicenseShortName?.value);
      if (!FREE.test(license) || /fair use|non-free/i.test(license)) { out[id] = null; return; }
      out[id] = {
        // thumb.wikimedia.org and upload.wikimedia.org serve the same paths; drop tracking parameters
        url: (ii.thumburl ?? ii.url).replace('://thumb.wikimedia.org/', '://upload.wikimedia.org/').split('?')[0],
        title: plain(md.ObjectName?.value) || candidates.get(id).replace(/\.[a-z]+$/i, '').replace(/_/g, ' '),
        credit: (plain(md.Artist?.value) || 'Wikimedia Commons').slice(0, 120),
        license,
        licenseUrl: md.LicenseUrl?.value,
        page: ii.descriptionurl,
      };
    });
    console.log(`  commons: ${Math.min(i + 50, ids.length)}/${ids.length}`);
    await fs.writeFile(path.join(ROOT, 'data/wikimedia.json'), JSON.stringify(out, null, 1) + '\n');
  }
  await fs.writeFile(path.join(ROOT, 'data/wikimedia.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(`✔ wikimedia: ${Object.values(out).filter(Boolean).length} free photos for ${bases.length} bases`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
