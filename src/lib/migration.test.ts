/**
 * Migration v1 → v2: every old record, source, image and classification must survive.
 * Fixture: docs/taxonomy/migration-v1-v2.csv (old values, written by scripts/migration-report.mjs).
 */
import { describe, expect, it } from 'vitest';
import csvText from '../../docs/taxonomy/migration-v1-v2.csv?raw';
// @ts-expect-error – plain ESM build script without type declarations
import { V1_KIND, V1_FACILITY, V1_THEME, V1_SHARED_ORG } from '../../scripts/migration-report.mjs';
import bases from '../../data/bases.json';
import type { SourceRecord } from './types';

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const old = parseCsv(csvText);
const byId = new Map((bases as unknown as SourceRecord[]).map((b) => [b.id, b]));
const list = (s: string) => (s ? s.split(';') : []);

describe('migration v1 → v2', () => {
  it('keeps every site and its ID (URLs unchanged)', () => {
    expect(old.length).toBe(365);
    for (const o of old) expect(byId.has(o.id), o.id).toBe(true);
  });

  it('keeps sources, images, Wikipedia links and notes', () => {
    for (const o of old) {
      const n = byId.get(o.id)!;
      expect(n.sources.length, o.id).toBe(+o.v1_sources);
      expect((n.images ?? []).length, o.id).toBe(+o.v1_images);
      expect(Object.keys(n.wikipedia ?? {}).length, o.id).toBe(+o.v1_wikipedia);
      expect(n.notes.length, o.id).toBe(+o.v1_notes);
    }
  });

  it('maps every old kind to a site type and "closed" to the status', () => {
    for (const o of old) {
      const n = byId.get(o.id)!;
      expect(V1_KIND[o.v1_kind], o.id).toContain(n.siteType);
      if (o.v1_kind === 'closed') expect(n.status, o.id).toBe('closed');
      if (o.v1_group) expect(['garrison', 'region-cluster'], o.id).toContain(n.siteType);
    }
  });

  it('keeps host country (as sovereign state or territory)', () => {
    for (const o of old) {
      const n = byId.get(o.id)!;
      expect([n.host.country, n.host.territory], o.id).toContain(o.v1_country);
    }
  });

  it('keeps every stationing nation and co-user', () => {
    for (const o of old) {
      const n = byId.get(o.id)!;
      const nations = n.presences.map((p) => p.nation);
      for (const x of list(o.v1_nations)) expect(nations, `${o.id} ${x}`).toContain(x);
      for (const x of list(o.v1_shared_with)) {
        if (V1_SHARED_ORG[x]) expect(n.organisations, `${o.id} ${x}`).toContain(V1_SHARED_ORG[x]);
        else expect(nations, `${o.id} ${x}`).toContain(x);
      }
    }
  });

  it('keeps every facility and theme in its new dimension', () => {
    for (const o of old) {
      const n = byId.get(o.id)! as unknown as Record<string, string[]>;
      for (const f of list(o.v1_facilities)) expect(n.features, `${o.id} ${f}`).toContain(V1_FACILITY[f]);
      for (const t of list(o.v1_themes)) {
        const [dim, value] = V1_THEME[t];
        if (value.endsWith('*')) expect(n[dim].some((v) => v.startsWith(value.slice(0, -1))), `${o.id} ${t}`).toBe(true);
        else expect(n[dim], `${o.id} ${t}`).toContain(value);
      }
    }
  });

  it('keeps every related link as a typed relation', () => {
    const linked = (a: string, b: string) => [...(byId.get(a)!.relations ?? []), ...(byId.get(b)!.relations ?? [])].some((r) => r.id === a || r.id === b);
    for (const o of old) for (const r of list(o.v1_related)) expect(linked(o.id, r), `${o.id} → ${r}`).toBe(true);
  });
});
