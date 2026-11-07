import type { Base, Evidence, Movement, NewsItem, Story } from './types';

export const db = $state({
  bases: [] as Base[],
  stories: [] as Story[],
  news: [] as NewsItem[],
  movement: { initiatives: [] } as Movement,
  byId: new Map<string, Base>(),
  /** checked sources per record (public/data/research.json), loaded with the first profile */
  research: null as Record<string, Evidence[]> | null,
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

let researchLoading: Promise<void> | null = null;
export function loadResearch() {
  researchLoading ??= fetch('./data/research.json')
    .then((r) => (r.ok ? r.json() : {}))
    .then((r) => { db.research = r; })
    .catch(() => { db.research = {}; });
  return researchLoading;
}
