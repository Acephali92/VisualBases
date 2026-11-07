/** test fixtures: a valid import record (data/bases.json) and a resolved record (public data) */
import type { Base, SourceRecord } from './types';

export function sourceRecord(p: Partial<SourceRecord> & Record<string, unknown> = {}): SourceRecord {
  return {
    id: 'a', name: 'A', host: { country: 'DE' }, lat: 49.4398, lon: 7.6019, zoom: 14, continent: 'europe', region: 'germany',
    siteType: 'foreign-base', status: 'active', presences: [{ nation: 'US', role: 'stationing', via: 'tag' }], organisations: [],
    features: [], themes: [], activities: [], listedIn: [], sources: [{ url: 'https://example.org', label: 'x' }], notes: [],
    origin: { url: 'https://visualbases.org/a/', terms: { categories: ['foreign-bases'], tags: ['us'] } },
    ...p,
  } as SourceRecord;
}

export function resolved(p: Partial<Base> & Record<string, unknown> = {}): Base {
  const r = sourceRecord(p as Partial<SourceRecord>) as unknown as Base;
  r.presences = (p.presences ?? [{ nation: 'US', role: 'stationing', via: 'tag', relation: 'foreign' }]) as Base['presences'];
  r.scope = (p.scope ?? 'foreign') as Base['scope'];
  r.basis = p.basis ?? { siteType: 'source', status: 'implicit' };
  return r;
}
