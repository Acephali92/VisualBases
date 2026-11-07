<script lang="ts">
  import type { NewsItem } from '../lib/types';
  import { db } from '../lib/store.svelte';
  import { href } from '../lib/router.svelte';
  import { i18n } from '../lib/i18n.svelte';

  let { items, compact = false }: { items: NewsItem[]; compact?: boolean } = $props();

  function fmt(d: string | null) {
    if (!d) return '';
    const [y, m, day] = d.split('-').map(Number);
    const loc = i18n.lang === 'de' ? 'de-DE' : 'en-GB';
    if (day) return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    if (m) return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(loc, { month: 'short', year: 'numeric', timeZone: 'UTC' });
    return String(y);
  }
</script>

<ul class="news" class:compact>
  {#each items as n (n.url + n.title)}
    <li>
      <div class="meta">
        <span class="lang">{n.lang.toUpperCase()}</span>
        {#if n.date}<time datetime={n.date}>{fmt(n.date)}</time>{/if}
        {#if n.source}<span class="src">{n.source}</span>{/if}
      </div>
      <a class="title" href={n.url} target="_blank" rel="noopener">{n.title} <span aria-hidden="true">↗</span></a>
      {#if n.teaser && !compact}<p>{n.teaser}</p>{/if}
      {#if n.bases?.length}
        <div class="bases">
          {#each n.bases as id}
            {@const b = db.byId.get(id)}
            {#if b}<a class="chip" href={href(`/base/${id}`)}>📍 {b.name}</a>{/if}
          {/each}
        </div>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .news { list-style: none; margin: 0; padding: 0; display: grid; gap: 0; }
  li { padding: 16px 0; border-bottom: 1px solid var(--line); }
  .compact li { padding: 12px 0; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; color: var(--muted); font-size: 0.8rem; margin-bottom: 4px; }
  .lang { font-weight: 800; font-size: 0.68rem; letter-spacing: 0.08em; padding: 1px 6px; border-radius: 4px; background: var(--surface-2); color: var(--text-2); }
  .title { font-weight: 700; font-size: 1.05rem; text-decoration: none; line-height: 1.35; }
  .compact .title { font-size: 0.98rem; }
  .title:hover { text-decoration: underline; text-decoration-color: var(--accent); text-underline-offset: 3px; }
  .title span { color: var(--muted); font-weight: 400; font-size: 0.85em; }
  p { color: var(--text-2); font-size: 0.93rem; margin: 6px 0 0; }
  .bases { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .bases .chip { text-decoration: none; min-height: 28px; font-size: 0.8rem; }
</style>
