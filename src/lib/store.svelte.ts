import type { Base, Story } from './types';

export const db = $state({
  bases: [] as Base[],
  stories: [] as Story[],
  byId: new Map<string, Base>(),
  status: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
});

export async function loadData() {
  if (db.status === 'loading' || db.status === 'ready') return;
  db.status = 'loading';
  try {
    const [b, s] = await Promise.all([
      fetch('./data/bases.json').then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }),
      fetch('./data/stories.json').then((r) => (r.ok ? r.json() : [])),
    ]);
    db.bases = b;
    db.stories = s;
    db.byId = new Map(b.map((x: Base) => [x.id, x]));
    db.status = 'ready';
  } catch (e) {
    console.error(e);
    db.status = 'error';
  }
}
