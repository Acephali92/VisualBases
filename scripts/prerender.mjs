#!/usr/bin/env node
/**
 * After `vite build`: write one small static HTML page per base (dist/b/<id>.html) so that
 * search engines and link previews (WhatsApp, Signal, Mastodon, Instagram …) see a title,
 * description and image. Humans are forwarded to the app view (#/base/<id>).
 * Also writes sitemap.xml and robots.txt.
 *
 *   SITE_URL=https://example.org/ node scripts/prerender.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { label } from '../src/lib/taxonomy.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SITE = (process.env.SITE_URL ?? 'https://acephali92.github.io/VisualBases/').replace(/\/?$/, '/');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dn = new Intl.DisplayNames(['de'], { type: 'region' });
const country = (cc) => { try { return cc ? dn.of(cc) : ''; } catch { return cc ?? ''; } };

/** short description for search engines and link previews; labels from src/lib/taxonomy.ts */
export function describe(b) {
  const where = b.host.territory ? `${country(b.host.territory)} (${country(b.host.country)})` : country(b.host.country);
  const parts = [`${label('siteType', b.siteType, 'de')} in ${where || 'unbekanntem Land'}`];
  if (b.status !== 'active') parts.push(label('status', b.status, 'de') + (b.period?.to ? ` (bis ${b.period.to})` : ''));
  // the form of a presence is named where documented (a derived "historical" adds nothing to the status "closed")
  const nations = b.presences.filter((p) => p.relation !== 'domestic').map((p) => country(p.nation) + (p.form && p.formVia !== 'status' ? ` (${label('presenceForm', p.form, 'de')})` : ''));
  if (nations.length) parts.push(`${b.presences.some((p) => p.form && p.formVia !== 'status') ? 'Präsenz' : 'stationiert'}: ${nations.join(', ')}`);
  if (b.features?.length) parts.push(b.features.map((f) => label('feature', f, 'de')).join(', '));
  return `${parts.join(' · ')}. Karte, Satellitenbilder, Quellen und Widerstand vor Ort auf VisualBases.`;
}

export function page(b) {
  const url = `${SITE}b/${b.id}.html`;
  const app = `../#/base/${b.id}`;
  const img = b.images?.find((i) => i.type === 'photo') ?? b.images?.find((i) => i.type === 'satellite') ?? b.images?.[0];
  const ogImage = img ? `${SITE}${img.src}` : `${SITE}og.png`;
  const title = `${b.name}${b.host.country ? ` (${country(b.host.territory ?? b.host.country)})` : ''} – VisualBases`;
  const desc = describe(b);
  const ld = {
    '@context': 'https://schema.org', '@type': 'Place', name: b.name, description: desc, url,
    geo: { '@type': 'GeoCoordinates', latitude: b.lat, longitude: b.lon },
    ...(b.host.country ? { address: { '@type': 'PostalAddress', addressCountry: b.host.territory ?? b.host.country } } : {}),
    ...(img ? { image: ogImage } : {}),
  };
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="place">
<meta property="og:site_name" content="VisualBases">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="place:location:latitude" content="${b.lat}">
<meta property="place:location:longitude" content="${b.lon}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#07090f">
<link rel="icon" href="../icons/icon.svg" type="image/svg+xml">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<script>location.replace(${JSON.stringify(app)});</script>
<style>body{background:#07090f;color:#eef1f7;font:16px/1.5 system-ui,sans-serif;max-width:640px;margin:10vh auto;padding:0 16px}a{color:#ff5a3c}img{max-width:100%;border-radius:10px}</style>
</head>
<body>
<h1>${esc(b.name)}</h1>
<p>${esc(desc)}</p>
${img ? `<img src="../${esc(img.thumb)}" alt="${esc(b.name)}" width="${img.tw}" height="${img.th}">` : ''}
${(b.notes ?? []).slice(0, 4).map((n) => `<p>${esc(n)}</p>`).join('\n')}
<p><a href="${esc(app)}">Auf der Karte ansehen →</a></p>
</body>
</html>
`;
}

export function countryPage(cc, list) {
  const isAgg = (b) => b.siteType === 'garrison' || b.siteType === 'region-cluster';
  const all = list.filter((b) => !isAgg(b));
  // context sites (a state's own sites on its own territory) are listed separately, not counted as foreign
  const sites = all.filter((b) => b.scope !== 'domestic');
  const context = all.filter((b) => b.scope === 'domestic');
  const name = country(cc) || cc;
  const url = `${SITE}c/${cc}.html`;
  const app = `../#/atlas?countries=${cc}`;
  const nations = [...new Set(sites.flatMap((b) => b.presences.filter((p) => p.relation !== 'domestic').map((p) => p.nation)))].map(country).filter(Boolean);
  const img = list.flatMap((b) => b.images ?? []).find((i) => i.type === 'photo') ?? list.flatMap((b) => b.images ?? []).find((i) => i.type === 'satellite');
  const title = `Fremde Militärbasen in ${name} – ${sites.length} Standorte | VisualBases`;
  const desc = `${sites.length} ausländische Militärstandorte in ${name}${nations.length ? ` (stationiert: ${nations.join(', ')})` : ''} – mit Karte, Satellitenbildern, Quellen und Widerstand vor Ort.`;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="VisualBases">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(img ? SITE + img.src : SITE + 'og.png')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#07090f">
<link rel="icon" href="../icons/icon.svg" type="image/svg+xml">
<script>location.replace(${JSON.stringify(app)});</script>
<style>body{background:#07090f;color:#eef1f7;font:16px/1.5 system-ui,sans-serif;max-width:640px;margin:10vh auto;padding:0 16px}a{color:#ff5a3c}</style>
</head>
<body>
<h1>Fremde Militärbasen in ${esc(name)}</h1>
<p>${esc(desc)}</p>
<ul>
${sites.map((b) => `<li><a href="../b/${esc(b.id)}.html">${esc(b.name)}</a> – ${esc(label('siteType', b.siteType, 'de'))}${b.status === 'closed' ? ' (geschlossen)' : ''}</li>`).join('\n')}
</ul>
${context.length ? `<h2>Kontext-Standorte auf eigenem Staatsgebiet</h2>\n<ul>\n${context.map((b) => `<li><a href="../b/${esc(b.id)}.html">${esc(b.name)}</a> – ${esc(label('siteType', b.siteType, 'de'))}</li>`).join('\n')}\n</ul>` : ''}
<p><a href="${esc(app)}">Auf der Karte ansehen →</a></p>
</body>
</html>
`;
}

async function main() {
  const bases = JSON.parse(await fs.readFile(path.join(DIST, 'data/bases.json'), 'utf8'));
  await fs.mkdir(path.join(DIST, 'b'), { recursive: true });
  for (const b of bases) await fs.writeFile(path.join(DIST, 'b', `${b.id}.html`), page(b));

  // one page per host country and per territory (keeps c/GL.html, c/PR.html … of earlier versions)
  const byCountry = new Map();
  for (const b of bases) for (const cc of new Set([b.host.country, b.host.territory].filter(Boolean))) byCountry.set(cc, [...(byCountry.get(cc) ?? []), b]);
  await fs.mkdir(path.join(DIST, 'c'), { recursive: true });
  for (const [cc, list] of byCountry) await fs.writeFile(path.join(DIST, 'c', `${cc}.html`), countryPage(cc, list));

  const today = new Date().toISOString().slice(0, 10);
  const urls = [`${SITE}`, ...[...byCountry.keys()].map((cc) => `${SITE}c/${cc}.html`), ...bases.map((b) => `${SITE}b/${b.id}.html`)];
  const lastmod = new Map(bases.map((b) => [`${SITE}b/${b.id}.html`, b.origin.lastmod ?? today]));
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(u)}</loc><lastmod>${lastmod.get(u) ?? today}</lastmod></url>`).join('\n')}
</urlset>
`;
  await fs.writeFile(path.join(DIST, 'sitemap.xml'), sitemap);
  await fs.writeFile(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
  console.log(`✔ prerendered ${bases.length} base pages, ${byCountry.size} country pages, sitemap.xml, robots.txt (${SITE})`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
