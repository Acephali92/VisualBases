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
import { TERRITORY_SOVEREIGN } from '../src/lib/taxonomy.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://visualbases.org';
const UA = 'VisualBases-open-data-import (+https://github.com/Acephali92/VisualBases)';

const args = process.argv.slice(2);
const cacheDir = path.resolve(args.includes('--cache') ? args[args.indexOf('--cache') + 1] : path.join(ROOT, '.cache/visualbases'));
const offline = args.includes('--offline');

/* ---------------------------------------------------------------- taxonomy */
/*
 * Mapping of the WordPress vocabulary of visualbases.org (categories and tags) to the
 * classification model v2 (src/lib/taxonomy.ts, docs/TAXONOMY.md). The raw terms are stored with
 * every record (origin.terms), so each derived value stays traceable.
 */
/** category "Kind of Location" → site type ('foreign' is resolved to foreign-base / overseas-base) */
export const SITE_TYPE_BY_CAT = {
  'meta-site': 'aggregate',
  'foreign-bases': 'foreign',
  'shared-bases': 'shared-base',
  'us-global': 'domestic-global',
  'national-base': 'host-base-foreign-use',
  'civilian-location': 'civilian-site',
  'extra-facility': 'special-facility',
  'unspecific': 'unspecified',
};
/** if a post carries several kinds, the first in this order is used (as in v1) and the record is flagged */
const SITE_TYPE_PRIORITY = ['aggregate', 'foreign', 'shared-base', 'domestic-global', 'host-base-foreign-use', 'civilian-site', 'special-facility', 'unspecified'];

/** category "Kind of Special Facilities" and two "Use:" tags → features */
export const FEATURE_BY_TERM = {
  'cat:airfield': 'airfield',
  'cat:helipad': 'helipad',
  'cat:marine-port': 'naval-port',
  'cat:training-area': 'training-area',
  'cat:depot': 'depot',
  'cat:laboratory': 'laboratory',
  'cat:telecommunications': 'telecom-station',
  'tag:fac_radar': 'radar-station',
  'cat:use-of-civil-airport': 'civil-airport-use',
  'cat:use-of-civil-naval-port': 'civil-port-use',
  'cat:command-center': 'command',
  'cat:missile-defence': 'missile-defence',
  'tag:listening': 'signals-intelligence',
  'cat:nuclear': 'nuclear-sharing',
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

/** "Base nation: …" tags → stationing nation */
export const NATION_BY_TAG = { us: 'US', fr: 'FR', uk: 'GB', cn: 'CN', ru: 'RU', jp: 'JP', 'base-nation-germany': 'DE' };
/** "Base shared: …" tags → co-using state */
export const CO_USER_BY_TAG = { 'base_uk-share': 'GB', de: 'DE', use_it: 'IT', base_nl: 'NL' };
/** "Base shared: NATO/EU" tags → organisation */
export const ORGANISATION_BY_TAG = { nato: 'nato', eu: 'eu' };
/** "Campaign info" and "Use: …" tags → themes */
export const THEME_BY_TAG = { campaign: 'resistance', 'drone-warfare': 'drone-warfare', 'environmental-issues': 'environment' };
/** "Active: …" and "Use: UN mission" tags → activities */
export const ACTIVITY_BY_TAG = { 'atlantic-resolve': 'atlantic-resolve', 'defender-2020': 'defender-europe-20', 'defender-2021': 'defender-europe-21', 'un-mission': 'un-mission' };
const US_POSTURE_BY_TAG = { 'us-mob': 'MOB', 'us-fob': 'FOB', 'us-fos': 'FOS', 'us-csl': 'CSL' };
const LISTING_BY_TAG = { bsr: 'bsr', bsrx: 'bsr-multi', 'source-wikipedia': 'wikipedia-list', 'source-other': 'other-list' };
const SUBREGION_BY_TAG = {
  'de-rlp': 'Rheinland-Pfalz', 'reg_de-rlp-kl': 'Kaiserslautern', 'de-ba': 'Bayern', 'de-bw': 'Baden-Württemberg',
  'de-he': 'Hessen', 'jp-okinawa': 'Okinawa', 'reg_us-overseas': 'US overseas',
};

/**
 * Sites filed under the code of the sovereign state although they lie in a dependent territory with
 * an own ISO code. Recognised by the place name in the title; only applied if the sovereign matches.
 */
export const TERRITORY_BY_NAME = [
  [/\bGuam\b/, 'GU'], [/Johnston Atoll/, 'UM'], [/Puerto Rico|Vieques|Aguada/, 'PR'],
  [/Martinique/, 'MQ'], [/Guadeloupe/, 'GP'], [/Guayana|Guyane|French Guiana/, 'GF'], [/R[ée]union/, 'RE'],
  [/Tahiti|Polyn[ée]si/, 'PF'], [/New Caledonia|Nouvelle-Cal[ée]donie/, 'NC'],
  [/Aruba/, 'AW'], [/Cura[cç]ao/, 'CW'],
  [/Diego Garcia/, 'IO'], [/Falkland/, 'FK'], [/Gibraltar/, 'GI'], [/Ascension|St\.? Helena/, 'SH'],
];

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
  // every distinct map link of the post – the first one is not always the post's own location
  const candidates = [];
  for (const c of bodyMain.matchAll(/openstreetbrowser\.org\/#map=(\d+)\/(-?[\d.]+)\/(-?[\d.]+)/g)) {
    if (!candidates.some((x) => x.lat === +c[2] && x.lon === +c[3])) candidates.push({ zoom: +c[1], lat: +c[2], lon: +c[3] });
  }
  let m;
  if (candidates.length) ({ zoom, lat, lon } = candidates[0]);
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
  return { slug, title, cats, tags, lat, lon, zoom, approx, candidates, wikipedia, related, sources, notes, images };
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

const coordKey = (lat, lon) => `${lat.toFixed(3)},${lon.toFixed(3)}`;

/**
 * Some posts first link to another site's map view (e.g. "Ghedi" starts with the link of Aviano).
 * If a post's first coordinate is also the first coordinate of another post and the post has a
 * further map link that is not used as another post's location, take that one instead.
 * Returns the slugs that were changed.
 */
export function resolveCopiedCoordinates(posts) {
  const owners = new Map();
  for (const p of posts) if (p.lat != null) {
    const k = coordKey(p.lat, p.lon);
    owners.set(k, [...(owners.get(k) ?? []), p.slug]);
  }
  const changed = [];
  for (const p of posts) {
    if (p.lat == null || !p.candidates || p.candidates.length < 2) continue;
    if ((owners.get(coordKey(p.lat, p.lon)) ?? []).length < 2) continue;
    const own = p.candidates.slice(1).find((c) => !owners.has(coordKey(c.lat, c.lon)));
    if (!own) continue;
    p.lat = own.lat; p.lon = own.lon; p.zoom = own.zoom;
    changed.push(p.slug);
  }
  return changed;
}

/** outdated or non-ISO country codes used in post titles on the original site */
const COUNTRY_ALIASES = { UK: 'GB', RKS: 'XK', RP: 'PH' };

export function toBase(p, lastmod) {
  const tm = p.title.match(/^([A-Z]{2,3})\s*\|\s*(.+)$/);
  let code = tm ? tm[1] : null;
  let name = (tm ? tm[2] : p.title).replace(/\s+/g, ' ').trim();
  if (code && COUNTRY_ALIASES[code]) code = COUNTRY_ALIASES[code];
  const isGroup = /\(Σ\)/.test(name);
  name = name.replace(/\s*\(Σ\)\s*/g, ' ').trim();
  const fix = FIXES[p.slug] ?? {};
  if (fix.country) code = fix.country;
  const uniq = (a) => [...new Set(a)];
  const has = (t) => p.tags.includes(t);

  // host: always the sovereign state; a dependent territory is kept separately
  const host = { country: code };
  if (code && TERRITORY_SOVEREIGN[code]) host.country = TERRITORY_SOVEREIGN[code], host.territory = code;
  else if (code) {
    const t = TERRITORY_BY_NAME.find(([re, tc]) => re.test(p.title) && TERRITORY_SOVEREIGN[tc] === code);
    if (t) host.territory = t[1];
  }

  // presences: stationing nations from "Base nation" tags, US implied by BSR listing / US posture / "USA Global Base"
  const presences = [];
  const add = (nation, role, via) => { if (!presences.some((x) => x.nation === nation)) presences.push({ nation, role, via }); };
  for (const t of p.tags) if (NATION_BY_TAG[t]) add(NATION_BY_TAG[t], 'stationing', 'tag');
  if (has('bsr') || has('bsrx')) add('US', 'stationing', 'bsr');
  if (p.tags.some((t) => t in US_POSTURE_BY_TAG)) add('US', 'stationing', 'us-posture');
  if (p.cats.includes('us-global')) add('US', 'stationing', 'site-type');
  for (const t of p.tags) if (CO_USER_BY_TAG[t]) add(CO_USER_BY_TAG[t], 'co-user', 'tag');

  // site type and status are separate dimensions ("Closed Base" is a status)
  const types = uniq(p.cats.map((c) => SITE_TYPE_BY_CAT[c]).filter(Boolean));
  let type = SITE_TYPE_PRIORITY.find((k) => types.includes(k)) ?? (isGroup ? 'aggregate' : null);
  if (/^overview\b/i.test(name)) type = 'aggregate';
  if (!type) type = p.cats.includes('closed') ? 'military-base' : 'unspecified';
  if (type === 'aggregate') type = /garrison|usag\b|community/i.test(name) ? 'garrison' : 'region-cluster';
  if (type === 'foreign') {
    const stationing = presences.filter((x) => x.role === 'stationing');
    const ownTerritory = host.territory && stationing.length && stationing.every((x) => x.nation === host.country);
    type = ownTerritory ? 'overseas-base' : 'foreign-base';
  }

  const region = fix.region ?? p.cats.map((c) => REGION_BY_CAT[c]).find(Boolean) ?? null;
  const continent = p.cats.map((c) => CONTINENT_BY_CAT[c]).find(Boolean) ?? CONTINENT_BY_REGION[region] ?? null;
  const updates = p.tags.map((t) => t.match(/^update[-_](\d{2,4})$/)).filter(Boolean)
    .map((m) => (m[1].length === 2 ? 2000 + +m[1] : +m[1]));
  const terms = [...p.cats.map((c) => `cat:${c}`), ...p.tags.map((t) => `tag:${t}`)];

  return {
    id: p.slug,
    name,
    host,
    lat: Math.round(p.lat * 1e5) / 1e5,
    lon: Math.round(p.lon * 1e5) / 1e5,
    zoom: p.zoom ?? 14,
    approx: p.approx || undefined,
    continent,
    region,
    subregion: p.tags.map((t) => SUBREGION_BY_TAG[t]).filter(Boolean).at(-1),
    siteType: type,
    status: p.cats.includes('closed') ? 'closed' : 'active',
    presences,
    organisations: uniq(p.tags.map((t) => ORGANISATION_BY_TAG[t]).filter(Boolean)),
    features: uniq(terms.map((t) => FEATURE_BY_TERM[t]).filter(Boolean)),
    themes: uniq(p.tags.map((t) => THEME_BY_TAG[t]).filter(Boolean)),
    activities: uniq(p.tags.map((t) => ACTIVITY_BY_TAG[t]).filter(Boolean)),
    usPosture: p.tags.map((t) => US_POSTURE_BY_TAG[t]).find(Boolean),
    listedIn: uniq(p.tags.map((t) => LISTING_BY_TAG[t]).filter(Boolean)),
    related: p.related, // resolved to typed relations in main()
    sources: p.sources,
    wikipedia: Object.keys(p.wikipedia).length ? p.wikipedia : undefined,
    notes: p.notes,
    images: p.images.length ? p.images : undefined,
    origin: {
      url: `${ORIGIN}/${p.slug}/`,
      lastmod: lastmod?.slice(0, 10),
      review: has('review1') || undefined,
      updates: updates.length ? uniq(updates).sort() : undefined,
      terms: { categories: p.cats, tags: p.tags },
    },
  };
}

/**
 * Turn the untyped "related" links of the source into typed relations:
 * member-of (site → garrison/region entry), part-of (special facility → base), related (anything else).
 * A link stated on the summary entry or on the base is moved to the member / facility, so that every
 * relation is stored once, in its natural direction. The inverse lists are computed when building.
 */
export function typeRelations(bases) {
  const byId = new Map(bases.map((b) => [b.id, b]));
  const isAggregate = (b) => b.siteType === 'garrison' || b.siteType === 'region-cluster';
  const isFacility = (b) => b.siteType === 'special-facility';
  const out = new Map(bases.map((b) => [b.id, []]));
  const put = (from, type, to) => { if (!out.get(from).some((r) => r.id === to)) out.get(from).push({ type, id: to }); };
  for (const a of bases) {
    for (const r of a.related ?? []) {
      const slug = typeof r === 'string' ? r : r.slug;
      const b = byId.get(slug);
      if (!b || b.id === a.id) continue;
      if (isAggregate(b) && !isAggregate(a)) put(a.id, 'member-of', b.id);
      else if (isAggregate(a) && !isAggregate(b)) put(b.id, 'member-of', a.id);
      else if (isFacility(a) && !isFacility(b)) put(a.id, 'part-of', b.id);
      else if (isFacility(b) && !isFacility(a)) put(b.id, 'part-of', a.id);
      else if (!out.get(b.id).some((x) => x.id === a.id)) put(a.id, 'related', b.id);
    }
  }
  for (const b of bases) {
    delete b.related;
    const rel = out.get(b.id);
    if (rel.length) b.relations = rel;
  }
  return bases;
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
  const parsed = [];
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
    parsed.push({ p, lastmod: e.lastmod });
  }
  const fixed = resolveCopiedCoordinates(parsed.map((x) => x.p));
  if (fixed.length) console.log(`  coordinates taken from the post's own map link: ${fixed.join(', ')}`);
  for (const { p, lastmod } of parsed) bases.push(toBase(p, lastmod));
  bases.sort((a, b) => (a.host.territory ?? a.host.country ?? '').localeCompare(b.host.territory ?? b.host.country ?? '') || a.name.localeCompare(b.name));
  // "related" links to non-location pages are dropped, the rest become typed relations
  typeRelations(bases);

  await fs.writeFile(path.join(cacheDir, '_lastmod.json'), JSON.stringify(await readIndex()));
  await fs.mkdir(path.join(ROOT, 'data'), { recursive: true });
  await fs.writeFile(path.join(ROOT, 'data/bases.json'), JSON.stringify(bases, null, 1) + '\n');
  await fs.writeFile(path.join(ROOT, 'data/stories.json'), JSON.stringify(stories, null, 1) + '\n');
  console.log(`✔ ${bases.length} bases, ${stories.length} stories written to data/`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
