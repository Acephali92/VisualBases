import type { Base, Movement, NewsItem, Story } from './types';

export const db = $state({
  bases: [] as Base[],
  stories: [] as Story[],
  news: [] as NewsItem[],
  movement: { initiatives: [] } as Movement,
  byId: new Map<string, Base>(),
  status: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
});

export async function loadData() {
  if (db.status === 'loading' || db.status === 'ready') return;
  db.status = 'loading';
  try {
    const [b, s, n, mv] = await Promise.all([
      fetch('./data/bases.json').then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }),
      fetch('./data/stories.json').then((r) => (r.ok ? r.json() : [])),
      fetch('./data/news.json').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('./data/movement.json').then((r) => (r.ok ? r.json() : { initiatives: [] })).catch(() => ({ initiatives: [] })),
    ]);
    db.movement = mv;
    db.news = n;
    db.bases = b;
    db.stories = s;
    db.byId = new Map(b.map((x: Base) => [x.id, x]));
    db.status = 'ready';
  } catch (e) {
    console.error(e);
    db.status = 'error';
  }
}
