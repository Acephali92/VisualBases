#!/usr/bin/env node
/**
 * Inspect a web page for manual source review.
 *
 *   node scripts/research/inspect.mjs <url> [keyword …]
 *
 * Prints HTTP status, final URL, title, publisher (og:site_name), publication date (meta/time tags)
 * and short text passages around each keyword (case-insensitive) – enough to judge whether the page
 * supports a statement, without storing third-party text in the repository.
 * PDFs are converted with `pdftotext` when available.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BROWSER_UA = 'Mozilla/5.0 (compatible; VisualBases-research; +https://github.com/Acephali92/VisualBases)';

export function pageText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/\s+/g, ' ')
    .trim();
}

const meta = (html, re) => html.match(re)?.[1]?.trim() ?? null;

export function pageMeta(html) {
  return {
    title: meta(html, /<title[^>]*>([\s\S]*?)<\/title>/i)?.replace(/\s+/g, ' '),
    publisher: meta(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i) ?? meta(html, /<meta[^>]+name=["']publisher["'][^>]+content=["']([^"']+)/i),
    published:
      meta(html, /<meta[^>]+(?:property|name)=["'](?:article:published_time|datePublished|date|dc\.date|DC\.date\.issued|publish-date)["'][^>]+content=["']([^"']+)/i) ??
      meta(html, /"datePublished"\s*:\s*"([^"]+)"/i) ??
      meta(html, /<time[^>]+datetime=["']([^"']+)/i),
  };
}

export function passages(text, keywords, width = 160, max = 3) {
  const out = {};
  for (const k of keywords) {
    const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const hits = [];
    let m;
    while ((m = re.exec(text)) && hits.length < max) hits.push('…' + text.slice(Math.max(0, m.index - width), m.index + k.length + width) + '…');
    out[k] = hits;
  }
  return out;
}

async function main() {
  const [url, ...keywords] = process.argv.slice(2);
  if (!url) { console.error('usage: inspect.mjs <url> [keyword …]'); process.exit(2); }
  // curl is accepted by more sites (CDN bot filters) than Node's fetch and honours HTTPS_PROXY
  const tmp = path.join(os.tmpdir(), `inspect-${process.pid}`);
  let status = 0, finalUrl = url, type = '';
  try {
    const out = execFileSync('curl', ['-sL', '--compressed', '-m', '45', '-A', BROWSER_UA, '-H', 'Accept-Language: en,de;q=0.8,fr;q=0.6', '-o', tmp, '-w', '%{http_code}\t%{url_effective}\t%{content_type}', url]).toString();
    [status, finalUrl, type] = out.split('\t');
    status = +status;
  } catch (e) {
    console.log(JSON.stringify({ url, status: 0, error: String(e.message).slice(0, 200) }));
    return;
  }
  let text = '', info = {};
  if (/pdf/i.test(type) || /\.pdf($|\?)/i.test(finalUrl)) {
    try { text = execFileSync('pdftotext', ['-layout', tmp, '-'], { maxBuffer: 64 << 20 }).toString().replace(/\s+/g, ' '); } catch { text = ''; }
    try {
      const pi = execFileSync('pdfinfo', [tmp]).toString();
      info = { title: pi.match(/Title:\s*(.+)/)?.[1]?.trim() ?? null, published: pi.match(/CreationDate:\s*(.+)/)?.[1]?.trim() ?? null };
    } catch { /* no pdfinfo */ }
  } else {
    const html = fs.readFileSync(tmp, 'utf8');
    info = pageMeta(html);
    text = pageText(html);
  }
  fs.rmSync(tmp, { force: true });
  const res = { status, url: finalUrl };
  console.log(JSON.stringify({ url, status: res.status, finalUrl: res.url, ...info, chars: text.length, passages: passages(text, keywords) }, null, 1));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
