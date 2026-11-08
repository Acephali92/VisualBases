#!/usr/bin/env node
/**
 * Launch check: the hard launch criteria that can be verified from the repository
 * (docs/IMPROVEMENT-ROADMAP.md, section 0 and Block C).
 *
 *   npm run build && npm run launch:check
 *
 * Exit code 1 if a criterion fails. Settings on GitHub (workflow permissions, labels, branch protection,
 * Pages) cannot be checked from here and are listed as reminders.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { IMPRINT, missingImprintFields } from '../src/lib/legal.ts';
import { readJson } from './research/lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** the quality report should not be older than this when launching */
export const REPORT_MAX_AGE_DAYS = 14;

/** media of data/media.json with unsettled rights that still appear in the published data or the build */
export function leakedMedia(media, publishedJson, distFiles) {
  const unclear = Object.values(media).filter((m) => m.rights === 'unclear');
  return unclear.filter((m) => publishedJson.includes(m.src) || publishedJson.includes(m.thumb) || distFiles.has(m.src) || distFiles.has(m.thumb)).map((m) => m.src);
}

export function reportAge(history, today = new Date()) {
  const last = history.at(-1)?.date;
  return last ? Math.round((today - new Date(last)) / 86_400_000) : null;
}

async function main() {
  const results = [];
  const check = (ok, label, detail = '') => results.push({ ok, label, detail });

  const missing = missingImprintFields(IMPRINT);
  check(!missing.length, 'Impressum vollständig (src/lib/legal.ts)', missing.length ? `fehlt: ${missing.join(', ')}` : IMPRINT.name);

  const v = spawnSync(process.execPath, [path.join(ROOT, 'scripts/validate-data.mjs')], { encoding: 'utf8' });
  check(v.status === 0, 'Datenvalidierung ohne Fehler', (v.stdout + v.stderr).trim().split('\n').at(-1));

  const media = await readJson(path.join(ROOT, 'data/media.json'), {});
  let published = '';
  for (const f of ['bases.json', 'movement.json']) published += await fs.readFile(path.join(ROOT, 'dist/data', f), 'utf8').catch(() => '');
  const distMedia = new Set((await fs.readdir(path.join(ROOT, 'dist/media')).catch(() => [])).map((f) => `media/${f}`));
  if (!published) check(false, 'Build vorhanden (dist/)', 'erst `npm run build` ausführen');
  else {
    const leaked = leakedMedia(media, published, distMedia);
    check(!leaked.length, 'keine Bilder mit ungeklärten Rechten veröffentlicht', leaked.length ? leaked.join(', ') : `${Object.values(media).filter((m) => m.rights === 'unclear').length} ausgeblendet`);
  }

  const history = await readJson(path.join(ROOT, 'docs/data-quality-history.json'), []);
  const age = reportAge(history);
  check(age !== null && age <= REPORT_MAX_AGE_DAYS, `Qualitätsbericht höchstens ${REPORT_MAX_AGE_DAYS} Tage alt`, age === null ? 'kein Bericht – `npm run data:report`' : `${age} Tage (Stand ${history.at(-1).date})`);

  for (const r of results) console.log(`${r.ok ? '✔' : '✘'} ${r.label}${r.detail ? ` – ${r.detail}` : ''}`);
  console.log('\nVon Hand auf GitHub prüfen: Workflow-Rechte (Settings → Actions), Labels hinweis/korrektur/daten, Branch-Schutz für main, Pages-Quelle „GitHub Actions“, Kontakt-E-Mail.');
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\n✘ ${failed} Launch-Kriterium/-Kriterien nicht erfüllt` : '\n✔ Launch-Kriterien aus dem Repository erfüllt');
  if (failed) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
