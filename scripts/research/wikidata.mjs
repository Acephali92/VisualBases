#!/usr/bin/env node
/**
 * Wikidata check for every base with a Wikipedia article.
 *
 *   node scripts/research/wikidata.mjs
 *
 * Resolves the item via the Wikipedia sitelink (en, de, fr, …) and records in checks.json:
 *   coordinate + distance to our position, operator (P137), occupant (P466), country (P17),
 *   inception (P571), dissolved/closed (P576, P3999), instance of (P31), official website (P856).
 * Official websites and reference URLs given on operator/occupant statements become source
 * candidates (verdict "unreviewed"). Wikidata itself counts as geodata (position/status only).
 */
import { TODAY, fetchWithRetry, loadBases, saveSources, saveChecks, classifyUrl } from './lib.mjs';
import { distanceKm } from '../../src/lib/data.ts';

const API = 'https://www.wikidata.org/w/api.php';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const titleOf = (u) => decodeURIComponent(u.split('/wiki/')[1] ?? '').split('#')[0].replace(/_/g, ' ');

async function api(params) {
  const res = await fetchWithRetry(`${API}?${new URLSearchParams({ format: 'json', ...params })}`);
  await sleep(500);
  if (res.status !== 200) throw new Error(`Wikidata ${res.status}`);
  return JSON.parse(res.body);
}

const val = (s) => s?.mainsnak?.datavalue?.value;
const time = (s) => val(s)?.time?.replace(/^\+/, '').slice(0, 10).replace(/-00/g, '');
const refUrls = (s) => (s.references ?? []).flatMap((r) => (r.snaks?.P854 ?? []).map((x) => x.datavalue?.value)).filter(Boolean);

async function main() {
  const bases = (await loadBases()).filter((b) => b.wikipedia);
  // 1. items via sitelinks, batched per language
  const qid = new Map();
  const byLang = new Map();
  for (const b of bases) for (const [lang, url] of Object.entries(b.wikipedia)) {
    if (!byLang.has(lang)) byLang.set(lang, []);
    byLang.get(lang).push({ b, title: titleOf(url) });
  }
  const entities = new Map();
  for (const [lang, list] of byLang) {
    const todo = list.filter((x) => !qid.has(x.b.id));
    for (let i = 0; i < todo.length; i += 50) {
      const chunk = todo.slice(i, i + 50);
      // the API normalises titles only for single requests – compare case-insensitively ourselves
      const key = (t) => t.replace(/_/g, ' ').trim().toLowerCase();
      const r = await api({ action: 'wbgetentities', sites: `${lang}wiki`, titles: chunk.map((x) => x.title).join('|'), props: 'claims|sitelinks', sitefilter: `${lang}wiki` });
      const byTitle = new Map();
      for (const e of Object.values(r.entities ?? {})) {
        if (e.missing !== undefined || !e.sitelinks?.[`${lang}wiki`]) continue;
        byTitle.set(key(e.sitelinks[`${lang}wiki`].title), e);
        entities.set(e.id, e);
      }
      for (const x of chunk) {
        const e = byTitle.get(key(x.title));
        if (e && !qid.has(x.b.id)) qid.set(x.b.id, e.id);
      }
      console.log(`  ${lang}: ${Math.min(i + 50, todo.length)}/${todo.length}`);
    }
  }
  // 2. labels of referenced items (operators, occupants, countries, instance of)
  const refIds = new Set();
  for (const e of entities.values()) for (const p of ['P137', 'P466', 'P17', 'P31']) for (const s of e.claims?.[p] ?? []) if (val(s)?.id) refIds.add(val(s).id);
  const labels = new Map();
  const ids = [...refIds];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await api({ action: 'wbgetentities', ids: ids.slice(i, i + 50).join('|'), props: 'labels', languages: 'en|de' });
    for (const e of Object.values(r.entities ?? {})) labels.set(e.id, e.labels?.en?.value ?? e.labels?.de?.value ?? e.id);
  }
  const lab = (e, p) => (e.claims?.[p] ?? []).map((s) => labels.get(val(s)?.id) ?? val(s)?.id).filter(Boolean);

  // 3. checks + source candidates
  const checks = {};
  const sources = [];
  for (const b of bases) {
    const id = qid.get(b.id);
    if (!id) { checks[b.id] = { item: null }; continue; }
    const e = entities.get(id);
    const coord = val(e.claims?.P625?.[0]);
    const dissolved = time(e.claims?.P576?.[0]) ?? time(e.claims?.P3999?.[0]);
    checks[b.id] = {
      item: id,
      coord: coord ? [Math.round(coord.latitude * 1e5) / 1e5, Math.round(coord.longitude * 1e5) / 1e5] : null,
      distanceKm: coord ? Math.round(distanceKm(b.lat, b.lon, coord.latitude, coord.longitude) * 10) / 10 : null,
      operators: lab(e, 'P137'),
      occupants: lab(e, 'P466'),
      country: lab(e, 'P17'),
      instanceOf: lab(e, 'P31'),
      inception: time(e.claims?.P571?.[0]) ?? null,
      dissolved: dissolved ?? null,
      website: val(e.claims?.P856?.[0]) ?? null,
    };
    const site = val(e.claims?.P856?.[0]);
    if (site) sources.push({
      base: b.id, url: site, title: 'Official website (from Wikidata P856)', publisher: checks[b.id].operators[0] ?? 'operator', type: 'official',
      published: null, accessed: TODAY, httpStatus: null, supports: ['presence'], verdict: 'unreviewed', method: 'auto',
      summary: `Official website recorded on Wikidata ${id}; operator: ${checks[b.id].operators.join(', ') || 'n/a'}.`, note: 'not fetched yet',
    });
    for (const p of ['P137', 'P466']) for (const s of e.claims?.[p] ?? []) for (const url of refUrls(s)) sources.push({
      base: b.id, url, title: `Reference for ${p === 'P137' ? 'operator' : 'occupant'} "${labels.get(val(s)?.id) ?? ''}" on Wikidata ${id}`, publisher: new URL(url).hostname.replace(/^www\./, ''), type: classifyUrl(url) ?? 'media',
      published: null, accessed: TODAY, httpStatus: null, supports: ['nation', 'presence'], verdict: 'unreviewed', method: 'auto',
      summary: `Reference URL cited on Wikidata for the ${p === 'P137' ? 'operator' : 'occupant'} statement.`, note: '',
    });
  }
  await saveChecks('wikidata', checks);
  const total = await saveSources('wikidata', sources.filter((s, i, a) => a.findIndex((x) => x.base === s.base && x.url === s.url) === i), 'candidates.json');
  const found = Object.values(checks).filter((c) => c.item).length;
  const far = Object.values(checks).filter((c) => c.distanceKm > 5).length;
  const closed = Object.values(checks).filter((c) => c.dissolved).length;
  console.log(`✔ Wikidata: ${found}/${bases.length} items, ${far} more than 5 km away, ${closed} with closure date; candidates.json has ${total} entries`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
