#!/usr/bin/env node
/**
 * Guards for the first visit: the service worker precaches every file listed in dist/sw.js. Big files (map
 * engine, country shapes) are meant to be cached on first use instead (vite.config.ts, globIgnores). A renamed
 * chunk slips past those patterns silently, so the build fails when the precache grows beyond the budget.
 *
 *   node scripts/check-precache.mjs [dist]
 */
import fs from 'node:fs';
import path from 'node:path';

/** budget for the precache of the first visit (P0-6: 721 KB); room for data growth, but a map engine (1.1 MB) or the detailed country shapes (0.75 MB) break it */
export const PRECACHE_BUDGET_KB = 1280;
/** budget for the app shell (index-*.js: Svelte runtime, router, translations, taxonomy); views are own chunks (P1-8) */
export const SHELL_BUDGET_KB = 130;

export function precacheEntries(swSource) {
  return [...new Set([...swSource.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]))];
}

export function checkPrecache(dist) {
  const entries = precacheEntries(fs.readFileSync(path.join(dist, 'sw.js'), 'utf8'));
  const files = entries.map((url) => ({ url, kb: fs.statSync(path.join(dist, url)).size / 1024 })).sort((a, b) => b.kb - a.kb);
  const total = files.reduce((n, f) => n + f.kb, 0);
  const shell = fs.readdirSync(path.join(dist, 'assets')).filter((f) => /^index-.*\.js$/.test(f)).reduce((n, f) => n + fs.statSync(path.join(dist, 'assets', f)).size / 1024, 0);
  return { total, files, shell, ok: total <= PRECACHE_BUDGET_KB && shell <= SHELL_BUDGET_KB };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { total, files, shell, ok } = checkPrecache(process.argv[2] ?? 'dist');
  const top = files.slice(0, 5).map((f) => `${f.url} ${Math.round(f.kb)} KB`).join(', ');
  if (!ok) {
    console.error(`✖ precache ${Math.round(total)} KB (budget ${PRECACHE_BUDGET_KB} KB) – largest: ${top}. Exclude big chunks in vite.config.ts (workbox.globIgnores).`);
    console.error(`  app shell ${Math.round(shell)} KB (budget ${SHELL_BUDGET_KB} KB) – load view code with import() (src/App.svelte).`);
    process.exit(1);
  }
  console.log(`✔ precache ${Math.round(total)} KB (${files.length} files, budget ${PRECACHE_BUDGET_KB} KB) · app shell ${Math.round(shell)} KB (budget ${SHELL_BUDGET_KB} KB)`);
}
