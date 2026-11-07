#!/usr/bin/env node
/**
 * Collect the references (external links) of the Wikipedia articles linked to each base.
 *
 *   node scripts/research/wiki-refs.mjs [--targets]
 *
 * Wikipedia is only the entry point: its footnotes often lead to official documents, news reports
 * and research. Every usable link is stored in candidates.json with a source type from classifyUrl()
 * and verdict "unreviewed". Per base at most 20 candidates, official and academic first.
 * --targets: only bases without an own source (the research focus).
 *
 * The external links of each article are cached in .cache/research/wiki-refs/ for
 * WIKI_REFS_MAX_AGE_DAYS (default 25), so a repeated or resumed run only asks Wikipedia for
 * articles it has not seen recently (the workflow keeps .cache/research between runs).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { TODAY, CACHE, fetchWithRetry, loadBases, isTarget, saveSources, classifyUrl, unwrapArchive, TYPE_RANK } from './lib.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const titleOf = (u) => decodeURIComponent(u.split('/wiki/')[1] ?? '').split('#')[0];
export const MAX_PER_BASE = 20;

/** usable, de-duplicated and ranked candidate links of one article */
export function rankLinks(links) {
  const seen = new Set();
  const out = [];
  for (const raw of links) {
    const url = unwrapArchive(raw.startsWith('//') ? `https:${raw}` : raw);
    const type = classifyUrl(url);
    if (!type || !/^https?:\/\//.test(url)) continue;
    const key = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ url, type, archived: url !== raw ? raw : undefined });
  }
  return out.sort((a, b) => TYPE_RANK[a.type] - TYPE_RANK[b.type]).slice(0, MAX_PER_BASE);
}

const CACHE_DIR = path.join(CACHE, 'wiki-refs');
const MAX_AGE_MS = Number(process.env.WIKI_REFS_MAX_AGE_DAYS ?? 25) * 86_400_000;
const cacheFile = (lang, page) => path.join(CACHE_DIR, `${lang}-${createHash('sha1').update(page).digest('hex').slice(0, 16)}.json`);

/** external links of one article: from the cache if fresh, otherwise from the Wikipedia API (null on failure) */
export async function externalLinks(lang, page, { now = Date.now(), fetcher = fetchWithRetry, pause = 800 } = {}) {
  const file = cacheFile(lang, page);
  try {
    const c = JSON.parse(await fs.readFile(file, 'utf8'));
    if (c.page === page && now - c.fetched < MAX_AGE_MS) return { links: c.links, cached: true };
  } catch { /* not cached */ }
  const res = await fetcher(`https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({ action: 'parse', page, prop: 'externallinks', redirects: '1', format: 'json', formatversion: '2' })}`);
  if (pause) await sleep(pause);
  if (res.status !== 200) return null;
  let links;
  try { links = JSON.parse(res.body).parse?.externallinks; } catch { return null; }
  if (!links) return null;
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify({ page, fetched: now, links }));
  return { links, cached: false };
}

async function main() {
  const onlyTargets = process.argv.includes('--targets');
  const bases = (await loadBases()).filter((b) => b.wikipedia && (!onlyTargets || isTarget(b)));
  const candidates = [];
  let done = 0, failed = 0, cached = 0;
  for (const b of bases) {
    for (const [lang, articleUrl] of Object.entries(b.wikipedia)) {
      const page = titleOf(articleUrl);
      const r = await externalLinks(lang, page);
      if (!r) { failed++; continue; }
      if (r.cached) cached++;
      const links = r.links;
      for (const l of rankLinks(links)) candidates.push({
        base: b.id, url: l.url, title: `Reference in Wikipedia (${lang}): ${decodeURIComponent(page).replace(/_/g, ' ')}`,
        publisher: new URL(l.url).hostname.replace(/^www\./, ''), type: l.type, published: null, accessed: TODAY, httpStatus: null,
        supports: [], verdict: 'unreviewed', method: 'auto', summary: '', note: l.archived ? `archived copy: ${l.archived}` : '',
      });
    }
    if (++done % 25 === 0) console.log(`  ${done}/${bases.length}`);
  }
  // keep the per-base limit across languages
  const perBase = new Map();
  const limited = candidates.filter((c) => {
    const n = perBase.get(c.base) ?? 0;
    if (n >= MAX_PER_BASE) return false;
    perBase.set(c.base, n + 1);
    return true;
  });
  const total = await saveSources('wiki-refs', limited, 'candidates.json');
  console.log(`✔ Wikipedia references: ${limited.length} candidates for ${perBase.size}/${bases.length} bases (${failed} article requests failed, ${cached} from cache); candidates.json has ${total} entries`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
