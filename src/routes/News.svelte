<script lang="ts">
  import { t, i18n } from '../lib/i18n.svelte';
  import { db } from '../lib/store.svelte';
  import { fold } from '../lib/data';
  import NewsList from '../components/NewsList.svelte';

  let lang = $state<'all' | 'de' | 'en'>('all');
  let q = $state('');
  const items = $derived(
    db.news.filter((n) => (lang === 'all' || n.lang === lang) && (!q.trim() || fold(`${n.title} ${n.teaser ?? ''} ${n.source ?? ''}`).includes(fold(q.trim())))),
  );
  const byYear = $derived.by(() => {
    const m = new Map<string, typeof items>();
    for (const n of items) {
      const y = n.date?.slice(0, 4) ?? '—';
      m.set(y, [...(m.get(y) ?? []), n]);
    }
    return [...m.entries()];
  });
</script>

<div class="news-page container">
  <header>
    <p class="kicker">{t('nav.news')}</p>
    <h1>{t('news.title')}</h1>
    <p class="lead">{t('news.lead')}</p>
  </header>

  <div class="controls">
    <div class="seg" role="group" aria-label="Sprache / language">
      <button class="chip" aria-pressed={lang === 'all'} onclick={() => (lang = 'all')}>{t('news.all')}</button>
      <button class="chip" aria-pressed={lang === 'de'} onclick={() => (lang = 'de')}>🇩🇪 {t('news.onlyDe')}</button>
      <button class="chip" aria-pressed={lang === 'en'} onclick={() => (lang = 'en')}>🇬🇧 {t('news.onlyEn')}</button>
    </div>
    <label class="search">
      <span class="sr-only">{t('news.search')}</span>
      <input type="search" bind:value={q} placeholder={t('news.search')} />
    </label>
  </div>

  {#if db.status !== 'ready'}
    <p class="muted">{t('common.loading')}</p>
  {:else}
    {#each byYear as [year, list]}
      <section>
        <h2>{year} <span>{list.length}</span></h2>
        <NewsList items={list} />
      </section>
    {:else}
      <p class="muted">—</p>
    {/each}
  {/if}
  <p class="muted small">{i18n.lang === 'de' ? 'Quelle der Zusammenstellung' : 'Compiled by'}: <a href="https://visualbases.org/updates-on-foreign-military-bases/" target="_blank" rel="noopener">visualbases.org</a></p>
</div>

<style>
  .news-page { padding: calc(var(--header-h) + 48px) 0 64px; max-width: 860px; }
  h1 { font-size: clamp(1.9rem, 4.5vw, 3rem); font-weight: 800; }
  .lead { color: var(--text-2); }
  .controls { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center; margin: 24px 0 8px; position: sticky; top: var(--header-h); z-index: 5; padding: 10px 0; background: var(--bg); }
  .seg { display: flex; flex-wrap: wrap; gap: 6px; }
  .search input { min-height: 38px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); outline: none; width: min(280px, 100%); }
  .search input:focus { border-color: var(--focus); }
  section { margin-top: 28px; }
  h2 { font-size: 1.4rem; display: flex; align-items: baseline; gap: 10px; border-bottom: 1px solid var(--line); padding-bottom: 8px; margin-bottom: 0; }
  h2 span { color: var(--muted); font-size: 0.9rem; font-weight: 500; }
  .muted { color: var(--muted); }
  .small { font-size: 0.85rem; margin-top: 32px; }
  .small a { color: var(--text-2); }
</style>
