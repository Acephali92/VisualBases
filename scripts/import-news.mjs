#!/usr/bin/env node
/**
 * Import the curated press reviews of visualbases.org
 *   EN: /updates-on-foreign-military-bases/
 *   DE: /update-fremde-militarbasen-de/
 * into data/news.json (title, teaser, source, date, url, linked base ids).
 * Only headlines and short teasers are stored; every item links to the original article.
 *
 *   node scripts/import-news.mjs [--offline]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, stripTags } from './import-visualbases.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, '.cache/visualbases');
const offline = process.argv.includes('--offline');
const PAGES = [
  { lang: 'en', url: 'https://visualbases.org/updates-on-foreign-military-bases/', file: '_news-en.html' },
  { lang: 'de', url: 'https://visualbases.org/update-fremde-militarbasen-de/', file: '_news-de.html' },
];

/** places that identify a base (or community) in headlines → matched against base names */
const KEYWORDS = [
  'Ramstein', 'Spangdahlem', 'Büchel', 'Grafenwöhr', 'Grafenwoehr', 'Vilseck', 'Baumholder', 'Wiesbaden', 'Stuttgart', 'Ansbach', 'Kaiserslautern', 'Landstuhl', 'Germersheim', 'Hahn',
  'Fairford', 'Lakenheath', 'Mildenhall', 'Menwith Hill', 'Croughton', 'Diego Garcia', 'Akrotiri',
  'Sigonella', 'Aviano', 'Vicenza', 'Niscemi', 'Ghedi', 'Rota', 'Morón', 'Moron', 'Shannon', 'Keflavik', 'Thule', 'Pituffik', 'Lajes', 'Souda',
  'Okinawa', 'Henoko', 'Futenma', 'Kadena', 'Yokosuka', 'Iwakuni', 'Humphreys', 'Jeju', 'Gangjeong', 'Guam', 'Darwin', 'Pine Gap', 'Tindal',
  'Djibouti', 'Dschibuti', 'Lemonnier', 'Agadez', 'Niamey', 'Guantánamo', 'Guantanamo', 'Al Udeid', 'Bahrain', 'Incirlik', 'Redzikowo', 'Deveselu', 'Powidz', 'Mihail Kogalniceanu',
];

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12, mai: 5, okt: 10, dez: 12, mär: 3, mrz: 3 };

/** "Sept 28, 2026" · "27.9.26" · "July 2021" · "2021-04" → YYYY-MM-DD | YYYY-MM | null */
export function parseDate(s) {
  let m = s.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  m = s.match(/\b([A-Za-zä]{3,9})\.?\s+(\d{1,2}),?\s+(20\d{2})\b/);
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()]) return `${m[3]}-${String(MONTHS[m[1].slice(0, 3).toLowerCase()]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
  m = s.match(/\b(\d{1,2})\.?\s+([A-Za-zä]{3,9})\.?\s+(20\d{2})\b/);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) return `${m[3]}-${String(MONTHS[m[2].slice(0, 3).toLowerCase()]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  m = s.match(/\b([A-Za-zä]{3,9})\.?\s+(20\d{2})\b/);
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()]) return `${m[2]}-${String(MONTHS[m[1].slice(0, 3).toLowerCase()]).padStart(2, '0')}`;
  m = s.match(/\b(20\d{2})-(\d{2})\b/);
  if (m) return `${m[1]}-${m[2]}`;
  return null;
}

export function parseNewsPage(html, lang) {
  const i = html.indexOf('<div class="entry-content single-content">');
  const body = html.slice(i, html.indexOf('</article>', i));
  const items = [];
  let year = null;
  for (const m of body.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>|<p>([\s\S]*?)<\/p>/g)) {
    if (m[1]) { const y = stripTags(m[1]).match(/20\d{2}/); if (y) year = +y[0]; continue; }
    const p = m[2];
    const link = p.match(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!link || /visualbases\.org/.test(link[1])) continue;
    const parts = p.split(/<br\s*\/?>/i).map((x) => stripTags(x)).filter(Boolean);
    if (parts.length < 2) continue;
    const titleLine = parts[0];
    const meta = parts.at(-1);
    const teaser = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
    const date = parseDate(meta) ?? (year ? String(year) : null);
    const source = meta
      .replace(/\|\s*\d{1,2}\.\d{1,2}\.\d{2,4}.*$/, '')
      .replace(/[–-]\s*[A-Za-zä]{3,9}\.?\s+\d{1,2},?\s+20\d{2}.*$/, '')
      .replace(/^(von|by)\s+/i, '')
      .replace(/[|\s–-]+$/, '')
      .trim();
    items.push({
      lang,
      title: titleLine.replace(/\s+/g, ' ').trim(),
      teaser: teaser.length > 320 ? teaser.slice(0, 317) + '…' : teaser || undefined,
      source: source || undefined,
      date,
      // some links on the source page start with an encoded space ("%20https://…")
      url: decode(link[1]).trim().replace(/^(%20|\s)+/i, ''),
    });
  }
  return items;
}

async function main() {
  const bases = JSON.parse(await fs.readFile(path.join(ROOT, 'data/bases.json'), 'utf8'));
  const keyToBase = new Map();
  for (const k of KEYWORDS) {
    const hits = bases.filter((b) => b.name.toLowerCase().includes(k.toLowerCase()));
    // prefer a summary entry (garrison/region), then a foreign base
    const best = hits.find((b) => b.siteType === 'garrison' || b.siteType === 'region-cluster') ?? hits.find((b) => b.siteType === 'foreign-base' || b.siteType === 'overseas-base') ?? hits[0];
    if (best) keyToBase.set(k, best.id);
  }

  const all = [];
  for (const pg of PAGES) {
    const file = path.join(CACHE, pg.file);
    let html;
    try {
      if (!offline) throw new Error('refresh'); // press reviews change often – always fetch fresh online
      html = await fs.readFile(file, 'utf8');
    } catch {
      if (offline) { try { html = await fs.readFile(file, 'utf8'); } catch { continue; } }
      else {
      const res = await fetch(pg.url, { headers: { 'user-agent': 'VisualBases-open-data-import' } });
      html = await res.text();
      await fs.mkdir(CACHE, { recursive: true });
      await fs.writeFile(file, html);
      }
    }
    all.push(...parseNewsPage(html, pg.lang));
  }
  for (const n of all) {
    const text = `${n.title} ${n.teaser ?? ''}`;
    const ids = [...new Set([...keyToBase].filter(([k]) => new RegExp(`\\b${k}\\b`, 'i').test(text)).map(([, id]) => id))];
    if (ids.length) n.bases = ids;
  }
  all.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  await fs.writeFile(path.join(ROOT, 'data/news.json'), JSON.stringify(all, null, 1) + '\n');
  console.log(`✔ ${all.length} news items (${all.filter((n) => n.bases).length} linked to bases)`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
