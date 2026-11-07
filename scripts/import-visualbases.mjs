#!/usr/bin/env node
/**
 * Import the location database of the original visualbases.org (WordPress)
 * into the structured JSON format used by this app.
 *
 * Usage:
 *   node scripts/import-visualbases.mjs [--cache <dir>] [--offline]
 *
 *   --cache <dir>  Store/read downloaded HTML pages in <dir> (default: .cache/visualbases)
 *   --offline      Only use cached pages, never hit the network
 *
 * Output:
 *   data/bases.json    – all locations with coordinates
 *   data/stories.json  – articles / single posts (linked, not copied)
 *
 * The crawler is deliberately slow (one request every 500 ms) and identifies itself.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://visualbases.org';
const UA = 'VisualBases-open-data-import (+https://github.com/Acephali92/VisualBases)';

const args = process.argv.slice(2);
const cacheDir = path.resolve(args.includes('--cache') ? args[args.indexOf('--cache') + 1] : path.join(ROOT, '.cache/visualbases'));
const offline = args.includes('--offline');

/* ---------------------------------------------------------------- taxonomy */

/** WordPress category slug -> kind of location */
export const KIND_BY_CAT = {
  'foreign-bases': 'foreign',
  'shared-bases': 'shared',
  'national-base': 'national',
  'closed': 'closed',
  'civilian-location': 'civilian',
  'meta-site': 'hotspot',
  'us-global': 'usglobal',
  'extra-facility': 'facility',
  'unspecific': 'unspecific',
};
/** priority if a post carries several kind categories */
const KIND_PRIORITY = ['hotspot', 'foreign', 'shared', 'usglobal', 'national', 'civilian', 'closed', 'facility', 'unspecific'];

const FACILITY_BY_CAT = {
  'airfield': 'airfield',
  'command-center': 'command',
  'depot': 'depot',
  'helipad': 'helipad',
  'laboratory': 'laboratory',
  'missile-defence': 'missile',
  'marine-port': 'naval',
  'nuclear': 'nuclear',
  'telecommunications': 'telecom',
  'training-area': 'training',
  'use-of-civil-airport': 'civilairport',
  'use-of-civil-naval-port': 'civilport',
};

/** most specific region wins */
const REGION_BY_CAT = {
  'west-europe': 'europe-west', 'north-europe': 'europe-north', 'east-europe': 'europe-central-east',
  'balkans': 'europe-southeast', 'de': 'germany', 'it': 'italy', 'uk': 'united-kingdom',
  'middle-east': 'asia-west', 'gulf-region': 'gulf', 'south-asia': 'asia-south', 'pacific': 'pacific',
  'jp': 'japan', 'korea': 'south-korea',
  'north-africa': 'africa-north', 'west-africa': 'africa-west', 'east-africa': 'africa-east', 'central-south-africa': 'africa-central-south',
  'north-america': 'america-north', 'caribbean': 'caribbean', 'middle-south-america': 'america-latin',
  'australia': 'oceania', 'atlantic': 'atlantic',
};
const CONTINENT_BY_CAT = { europe: 'europe', asia: 'asia', africa: 'africa', america: 'america', australia: 'oceania', atlantic: 'atlantic' };

const CONTINENT_BY_REGION = {
  'europe-west': 'europe', 'europe-north': 'europe', 'europe-central-east': 'europe', 'europe-southeast': 'europe', germany: 'europe', italy: 'europe', 'united-kingdom': 'europe',
  'asia-west': 'asia', gulf: 'asia', 'asia-south': 'asia', pacific: 'asia', japan: 'asia', 'south-korea': 'asia',
  'africa-north': 'africa', 'africa-west': 'africa', 'africa-east': 'africa', 'africa-central-south': 'africa',
  'america-north': 'america', caribbean: 'america', 'america-latin': 'america', oceania: 'oceania', atlantic: 'atlantic',
};
/** fixes for a few posts whose categories on the original site are incomplete */
const FIXES = {
  'overview-new-us-access-in-sweden': { country: 'SE', region: 'europe-north' },
  'gitmo-guantanamo-bay': { region: 'caribbean' },
  'keflavik-base': { region: 'europe-north' },
  'campia-turzii-air-base': { region: 'europe-southeast' },
};

const NATION_BY_TAG = { us: 'US', fr: 'FR', uk: 'GB', cn: 'CN', ru: 'RU', jp: 'JP', 'base-nation-germany': 'DE' };
const SHARED_BY_TAG = { nato: 'NATO', eu: 'EU', 'base_uk-share': 'GB', de: 'DE', use_it: 'IT', base_nl: 'NL' };
const THEME_BY_TAG = {
  'drone-warfare': 'drones', 'environmental-issues': 'environment', listening: 'surveillance',
  fac_radar: 'radar', campaign: 'resistance', 'un-mission': 'un',
  'defender-2020': 'defender', 'defender-2021': 'defender', 'atlantic-resolve': 'atlantic-resolve',
};
const US_TYPE_BY_TAG = { 'us-mob': 'MOB', 'us-fob': 'FOB', 'us-fos': 'FOS', 'us-csl': 'CSL' };
const SOURCE_BY_TAG = { bsr: 'bsr', bsrx: 'bsr-multi', 'source-wikipedia': 'wikipedia', 'source-other': 'other' };
const SUBREGION_BY_TAG = {
  'de-rlp': 'Rheinland-Pfalz', 'reg_de-rlp-kl': 'Kaiserslautern', 'de-ba': 'Bayern', 'de-bw': 'Baden-Württemberg',
  'de-he': 'Hessen', 'jp-okinawa': 'Okinawa', 'reg_us-overseas': 'US overseas',
};

const STORY_CATS = ['einzelbeitrag-de', 'single-post-en', 'update'];

/** the few location posts on the original site without a map link (manually geocoded, approximate) */
const MANUAL_COORDS = {
  'GL | Camp Century': [77.1797, -61.1100],
  'CU | The U.S. Military Base in Cuba': [19.9062, -75.0961],
  'MA | Inezgane Military Airport': [30.3786, -9.5462],
  'CY | RAF Akrotiri': [34.5904, 32.9879],
  'JP | Okinawa: White Beach Naval Facility': [26.3036, 127.9050],
};

/* ---------------------------------------------------------------- helpers */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', bdquo: '„' };
export function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
export const stripTags = (s) => decode(s.replace(/<[^>]+>/g, '')).replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim();

/** lastmod of every cached page, so that only posts changed on the site are downloaded again */
let lastmodIndex = null;
async function readIndex() {
  if (lastmodIndex) return lastmodIndex;
  try { lastmodIndex = JSON.parse(await fs.readFile(path.join(cacheDir, '_lastmod.json'), 'utf8')); } catch { lastmodIndex = {}; }
  return lastmodIndex;
}

async function fetchCached(url, name, lastmod) {
  const file = path.join(cacheDir, name);
  const index = await readIndex();
  const stale = !offline && lastmod && index[name] && index[name] !== lastmod;
  try {
    if (stale) throw new Error('changed');
    const text = await fs.readFile(file, 'utf8');
    if (lastmod && !index[name]) index[name] = lastmod;
    return text;
  } catch {
    if (offline) return null;
    await sleep(500);
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (!res.ok) { console.warn(`! ${res.status} ${url}`); return null; }
    const text = await res.text();
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(file, text);
    if (lastmod) index[name] = lastmod;
    return text;
  }
}

const isUrlLike = (s) => /^(https?:\/\/|www\.)/i.test(s.trim());
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

/* ---------------------------------------------------------------- parsing */

export function parsePost(html, slug) {
  const art = html.match(/<article[^>]*class="([^"]*)"/);
  const cls = art ? art[1].split(/\s+/) : [];
  const cats = cls.filter((c) => c.startsWith('category-')).map((c) => c.slice(9));
  const tags = cls.filter((c) => c.startsWith('tag-')).map((c) => c.slice(4));
  const h1 = html.match(/<h1[^>]*class="entry-title"[^>]*>([\s\S]*?)<\/h1>/);
  const title = h1 ? stripTags(h1[1]) : slug;

  const i = html.indexOf('<div class="entry-content single-content">');
  const j = html.indexOf('</article>', i);
  const body = i >= 0 ? html.slice(i, j) : '';
  const bodyMain = body.split(/<footer|class="entry-tags/)[0];

  let lat = null, lon = null, zoom = null, approx = false;
  let m = bodyMain.match(/openstreetbrowser\.org\/#map=(\d+)\/(-?[\d.]+)\/(-?[\d.]+)/);
  if (m) { zoom = +m[1]; lat = +m[2]; lon = +m[3]; }
  else if ((m = bodyMain.match(/earth\.google\.com\/web\/search\/(-?[\d.]+)[,+ ]+(-?[\d.]+)/))) { lat = +m[1]; lon = +m[2]; }
  else {
    const key = Object.keys(MANUAL_COORDS).find((k) => title.startsWith(k));
    if (key) { [lat, lon] = MANUAL_COORDS[key]; approx = true; }
  }

  const links = [...bodyMain.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((x) => ({ href: decode(x[1]).trim(), text: stripTags(x[2]) }));
  const wikipedia = {};
  const related = [];
  const sources = [];
  for (const l of links) {
    if (/openstreetbrowser\.org|earth\.google\.com|\/wp-content\/uploads\//.test(l.href)) continue;
    const wm = l.href.match(/^https?:\/\/(\w+)\.wikipedia\.org\//);
    if (wm) { if (!wikipedia[wm[1]]) wikipedia[wm[1]] = l.href; continue; }
    if (l.href.startsWith(ORIGIN + '/')) {
      const s = l.href.slice(ORIGIN.length).replace(/^\/|\/$/g, '');
      if (s && !s.includes('/') && !related.some((r) => r.slug === s)) related.push({ slug: s, label: l.text });
      continue;
    }
    if (!/^https?:/.test(l.href)) continue;
    if (sources.some((s) => s.url === l.href)) continue;
    sources.push({ url: l.href, label: !l.text || isUrlLike(l.text) ? hostOf(l.href) : l.text });
  }

  // human-readable notes: drop link-only lines, coordinates, boilerplate
  const text = stripTags(bodyMain.replace(/<br\s*\/?>|<\/p>|<\/pre>|<\/li>|<\/h\d>|<\/figcaption>/gi, '\n'))
    .split('\n').map((s) => s.trim()).filter(Boolean);
  const notes = [];
  for (const line of text) {
    if (isUrlLike(line)) continue;
    if (/^-?\d+[.,]\d+\s*,\s*-?\d+[.,]\d+$/.test(line)) continue;
    if (/^(click for full size|google earth \d{4}|wikipedia|en|de|schlagworte|images from resistance)\b/i.test(line) && line.length < 60) continue;
    if (/^Wikipedia (EN|DE)/i.test(line)) continue;
    if (line.startsWith('#')) continue;
    if (/^(EN|DE|FR|IT|ES|JP)\s*:/.test(line) && line.length < 12) continue;
    const hadUrl = /https?:\/\//.test(line);
    const cleaned = line.replace(/https?:\/\/\S+/g, '').replace(/\s{2,}/g, ' ').replace(/[:\s]+$/, '').trim();
    if (cleaned.length < 3 || /^(EN|DE|Notes)\b[\s:|–\-A-Z]{0,6}$/.test(cleaned)) continue;
    // a label whose link was its only content ("Source:", "Local campaign info (DE):")
    if ((hadUrl || /:\s*$/.test(line) || /^(source|sources|official sources?|local campaign info.*)$/i.test(cleaned)) && cleaned.length < 40 && !cleaned.includes(':')) continue;
    if (!notes.includes(cleaned)) notes.push(cleaned.length > 600 ? cleaned.slice(0, 597) + '…' : cleaned);
  }

  const images = parseImages(bodyMain);
  return { slug, title, cats, tags, lat, lon, zoom, approx, wikipedia, related, sources, notes, images };
}

/** images inside a post: full-size URL (link target or src without -WxH suffix) + caption */
export function parseImages(body) {
  const out = [];
  const re = /(?:<a [^>]*href="([^"]+)"[^>]*>\s*)?<img ([^>]+)>(?:\s*<\/a>)?(?:\s*<figcaption[^>]*>([\s\S]*?)<\/figcaption>)?/g;
  for (const m of body.matchAll(re)) {
    const [, href, attrs, cap] = m;
    let src = attrs.match(/src="([^"]+)"/)?.[1];
    if (!src || /pin[_-]|pushpin|figuren|emoji|\/plugins\//.test(src)) continue;
    let url = href && /\/wp-content\/uploads\/.+\.(jpe?g|png|webp|gif)$/i.test(href) ? href : src.replace(/-\d+x\d+(\.\w+)$/, '$1');
    if (url.startsWith('//')) url = 'https:' + url;
    if (!url.startsWith(ORIGIN + '/wp-content/uploads/')) continue; // only the project's own uploads
    const caption = stripTags(cap ?? '');
    if (!out.some((o) => o.url === url)) out.push({ url, caption: /^(click|anklicken)/i.test(caption) ? '' : caption });
  }
  return out;
}

export function toBase(p, lastmod) {
  const tm = p.title.match(/^([A-Z]{2,3})\s*\|\s*(.+)$/);
  let country = tm ? tm[1] : null;
  let name = (tm ? tm[2] : p.title).replace(/\s+/g, ' ').trim();
  if (country === 'UK') country = 'GB';
  if (country === 'RKS') country = 'XK';
  const isGroup = /\(Σ\)/.test(name);
  name = name.replace(/\s*\(Σ\)\s*/g, ' ').trim();

  const kinds = p.cats.map((c) => KIND_BY_CAT[c]).filter(Boolean);
  const kind = KIND_PRIORITY.find((k) => kinds.includes(k)) ?? (isGroup ? 'hotspot' : 'unspecific');
  const fix = FIXES[p.slug] ?? {};
  if (fix.country) country = fix.country;
  const region = fix.region ?? p.cats.map((c) => REGION_BY_CAT[c]).find(Boolean) ?? null;
  const continent = p.cats.map((c) => CONTINENT_BY_CAT[c]).find(Boolean) ?? CONTINENT_BY_REGION[region] ?? null;
  const updates = p.tags.map((t) => t.match(/^update[-_](\d{2,4})$/)).filter(Boolean)
    .map((m) => (m[1].length === 2 ? 2000 + +m[1] : +m[1]));
  const uniq = (a) => [...new Set(a)];

  return {
    id: p.slug,
    name,
    country,
    lat: Math.round(p.lat * 1e5) / 1e5,
    lon: Math.round(p.lon * 1e5) / 1e5,
    zoom: p.zoom ?? 14,
    approx: p.approx || undefined,
    kind,
    group: isGroup || undefined,
    facilities: uniq(p.cats.map((c) => FACILITY_BY_CAT[c]).filter(Boolean)),
    continent,
    region,
    subregion: p.tags.map((t) => SUBREGION_BY_TAG[t]).filter(Boolean).at(-1),
    nations: uniq([
      ...p.tags.map((t) => NATION_BY_TAG[t]).filter(Boolean),
      // US base types and the Pentagon's Base Structure Report imply a US presence
      ...(p.tags.some((t) => t in US_TYPE_BY_TAG || t === 'bsr' || t === 'bsrx') ? ['US'] : []),
    ]),
    sharedWith: uniq(p.tags.map((t) => SHARED_BY_TAG[t]).filter(Boolean)),
    themes: uniq(p.tags.map((t) => THEME_BY_TAG[t]).filter(Boolean)),
    usType: p.tags.map((t) => US_TYPE_BY_TAG[t]).find(Boolean),
    sourceType: uniq(p.tags.map((t) => SOURCE_BY_TAG[t]).filter(Boolean)),
    updates: updates.length ? uniq(updates).sort() : undefined,
    review: p.tags.includes('review1') || undefined,
    wikipedia: Object.keys(p.wikipedia).length ? p.wikipedia : undefined,
    related: p.related.length ? p.related : undefined,
    sources: p.sources,
    notes: p.notes,
    images: p.images.length ? p.images : undefined,
    origin: `${ORIGIN}/${p.slug}/`,
    lastmod: lastmod?.slice(0, 10),
  };
}

/* ---------------------------------------------------------------- main */

async function main() {
  // the sitemap itself is always fetched fresh (unless --offline) to learn about new and changed posts
  if (!offline) await fs.rm(path.join(cacheDir, '_sitemap-posts.xml'), { force: true });
  const sitemap = await fetchCached(`${ORIGIN}/wp-sitemap-posts-post-1.xml`, '_sitemap-posts.xml');
  if (!sitemap) throw new Error('Could not load sitemap');
  const entries = [...sitemap.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)].map((m) => ({ url: m[1], lastmod: m[2] }));
  console.log(`${entries.length} posts in sitemap`);

  const bases = [];
  const stories = [];
  let n = 0;
  for (const e of entries) {
    const slug = e.url.replace(ORIGIN, '').replace(/^\/|\/$/g, '');
    const html = await fetchCached(e.url, `${slug}.html`, e.lastmod);
    if (++n % 50 === 0) console.log(`  ${n}/${entries.length}`);
    if (!html) continue;
    const p = parsePost(html, slug);
    if (p.cats.some((c) => STORY_CATS.includes(c)) && !/^[A-Z]{2,3}\s*\|/.test(p.title)) {
      stories.push({
        id: slug,
        title: p.title,
        lang: p.cats.includes('einzelbeitrag-de') ? 'de' : 'en',
        excerpt: p.notes.find((t) => t.length > 80)?.slice(0, 280),
        url: e.url,
        lastmod: e.lastmod?.slice(0, 10),
      });
      continue;
    }
    if (p.lat == null) { console.warn(`  – no coordinates: ${p.title}`); continue; }
    bases.push(toBase(p, e.lastmod));
  }
  bases.sort((a, b) => (a.country ?? '').localeCompare(b.country ?? '') || a.name.localeCompare(b.name));
  // drop "related" links pointing to non-location pages
  const ids = new Set(bases.map((b) => b.id));
  for (const b of bases) {
    if (b.related) b.related = b.related.filter((r) => ids.has(r.slug) && r.slug !== b.id).map((r) => r.slug);
    if (b.related && !b.related.length) delete b.related;
  }

  await fs.writeFile(path.join(cacheDir, '_lastmod.json'), JSON.stringify(await readIndex()));
  await fs.mkdir(path.join(ROOT, 'data'), { recursive: true });
  await fs.writeFile(path.join(ROOT, 'data/bases.json'), JSON.stringify(bases, null, 1) + '\n');
  await fs.writeFile(path.join(ROOT, 'data/stories.json'), JSON.stringify(stories, null, 1) + '\n');
  console.log(`✔ ${bases.length} bases, ${stories.length} stories written to data/`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
