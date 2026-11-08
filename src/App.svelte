<script lang="ts">
  import { onMount } from 'svelte';
  import { route, initRouter, href } from './lib/router.svelte';
  import { t, i18n, setLang } from './lib/i18n.svelte';
  import { db, loadData } from './lib/store.svelte';
  import Home from './routes/Home.svelte';
  import Atlas from './routes/Atlas.svelte';
  import Near from './routes/Near.svelte';
  import Stats from './routes/Stats.svelte';
  import About from './routes/About.svelte';
  import News from './routes/News.svelte';
  import Act from './routes/Act.svelte';
  import Embed from './routes/Embed.svelte';
  import Quiz from './routes/Quiz.svelte';
  import Space from './routes/Space.svelte';
  import School from './routes/School.svelte';

  initRouter();
  onMount(loadData);

  const section = $derived(route.path.split('/')[1] || '');
  const isMapView = $derived(section === 'atlas' || section === 'base');
  let menuOpen = $state(false);
  let scrolled = $state(false);
  onMount(() => {
    const on = () => (scrolled = scrollY > 40);
    on();
    addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  });

  const nav = [
    { path: '/', key: 'nav.home', match: '' },
    { path: '/atlas', key: 'nav.atlas', match: 'atlas' },
    { path: '/near', key: 'nav.near', match: 'near' },
    { path: '/space', key: 'nav.space', match: 'space' },
    { path: '/news', key: 'nav.news', match: 'news' },
    { path: '/act', key: 'nav.act', match: 'act' },
    { path: '/about', key: 'nav.about', match: 'about' },
  ] as const;

  // page title per view (tabs, bookmarks, screen readers)
  $effect(() => {
    const id = route.path.startsWith('/base/') ? decodeURIComponent(route.path.slice(6)) : null;
    const base = id ? db.byId.get(id) : null;
    const titles: Record<string, string> = {
      atlas: t('nav.atlas'), near: t('nav.near'), news: t('nav.news'), stats: t('nav.stats'),
      act: t('nav.act'), about: t('nav.about'), quiz: t('quiz.title'), space: t('space.title'), school: t('nav.school'),
    };
    const head = base ? base.name : titles[section];
    document.title = head ? `${head} – VisualBases` : `VisualBases – ${t('hero.kicker')}`;
  });

  $effect(() => {
    void route.path;
    menuOpen = false;
  });
</script>

{#if section === 'embed'}
  <Embed />
{:else}
<a class="skip-link" href="#main" onclick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>{t('nav.skip')}</a>

<header class="site-header" class:solid={section !== '' || scrolled || menuOpen}>
  <div class="bar">
    <a class="brand" href={href('/')} aria-label="VisualBases – {t('nav.home')}">
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5" />
        <ellipse cx="16" cy="16" rx="6" ry="13" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.35" />
        <circle cx="21" cy="11" r="4" fill="var(--accent)" />
      </svg>
      <span>Visual<b>Bases</b></span>
    </a>

    <nav class="main-nav" class:open={menuOpen} aria-label="Hauptnavigation">
      {#each nav as item}
        <a href={href(item.path)} aria-current={section === item.match ? 'page' : undefined}>{t(item.key)}</a>
      {/each}
    </nav>

    <div class="tools">
      <!-- the accessible name starts with the visible label (WCAG 2.5.3), in the language it switches to -->
      <button class="btn btn-ghost btn-sm lang" onclick={() => setLang(i18n.lang === 'de' ? 'en' : 'de')} lang={i18n.lang === 'de' ? 'en' : 'de'}
        aria-label="{i18n.lang === 'de' ? 'EN' : 'DE'} – {t('common.lang')}">
        {i18n.lang === 'de' ? 'EN' : 'DE'}
      </button>
      <button class="btn btn-ghost icon-btn menu-btn" aria-expanded={menuOpen} aria-label="Menü" onclick={() => (menuOpen = !menuOpen)}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          {#if menuOpen}
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          {:else}
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          {/if}
        </svg>
      </button>
    </div>
  </div>
</header>

<main id="main" tabindex="-1" class:map-view={isMapView}>
  {#if db.status === 'error'}
    <div class="container state">
      <p>{t('common.error')}</p>
      <button class="btn" onclick={() => { db.status = 'idle'; loadData(); }}>{t('common.retry')}</button>
    </div>
  {:else if section === ''}
    <Home />
  {:else if isMapView}
    <Atlas />
  {:else if section === 'near'}
    <Near />
  {:else if section === 'stats'}
    <Stats />
  {:else if section === 'news'}
    <News />
  {:else if section === 'school'}
    <School />
  {:else if section === 'space'}
    <Space />
  {:else if section === 'quiz'}
    <Quiz />
  {:else if section === 'act'}
    <Act />
  {:else if section === 'about'}
    <About />
  {:else}
    <Home />
  {/if}
</main>

{#if !isMapView}
  <footer class="site-footer">
    <div class="container foot">
      <span>Visual<b>Bases</b> · {t('common.openSource')}</span>
      <nav aria-label="Footer">
        <a href={href('/atlas')}>{t('nav.atlas')}</a>
        <a href={href('/space')}>{t('nav.space')}</a>
        <a href={href('/stats')}>{t('nav.stats')}</a>
        <a href={href('/quiz')}>{t('quiz.kicker')}</a>
        <a href={href('/school')}>{t('nav.school')}</a>
        <a href={href('/act')}>{t('nav.act')}</a>
        <a href={href('/about')}>{t('nav.about')}</a>
        <a href="./data/bases.csv" download>CSV</a>
        <a href="./data/bases.geojson" download>GeoJSON</a>
        <a href="https://github.com/Acephali92/VisualBases" target="_blank" rel="noopener">GitHub</a>
      </nav>
    </div>
  </footer>
{/if}
{/if}

<style>
  .site-header {
    position: fixed; inset: 0 0 auto 0; z-index: 50; height: var(--header-h);
    background: linear-gradient(to bottom, rgb(7 9 15 / 0.85), rgb(7 9 15 / 0));
    transition: background 0.2s;
  }
  .site-header.solid { background: rgb(7 9 15 / 0.88); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
  .bar { height: 100%; display: flex; align-items: center; gap: 16px; padding: 0 16px; max-width: 1400px; margin: 0 auto; }
  .brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; font-size: 1.15rem; letter-spacing: -0.01em; color: var(--text); }
  .brand b { color: var(--accent); font-weight: 800; }
  .main-nav { display: flex; gap: 4px; margin-left: auto; }
  .main-nav a { padding: 8px 12px; border-radius: 999px; text-decoration: none; color: var(--text-2); font-weight: 500; font-size: 0.95rem; }
  .main-nav a:hover { color: var(--text); background: rgb(255 255 255 / 0.06); }
  .main-nav a[aria-current='page'] { color: var(--text); background: rgb(255 255 255 / 0.1); }
  .tools { display: flex; align-items: center; gap: 6px; }
  .lang { border-color: transparent; }
  .menu-btn { display: none; border-color: transparent; }

  @media (max-width: 1100px) {
    .menu-btn { display: inline-flex; }
    .tools { margin-left: auto; }
    .main-nav {
      position: fixed; top: var(--header-h); left: 0; right: 0; flex-direction: column; gap: 0;
      background: rgb(7 9 15 / 0.97); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line);
      padding: 8px 16px 16px; transform: translateY(-8px); opacity: 0; pointer-events: none; transition: opacity 0.15s, transform 0.15s;
    }
    .main-nav.open { opacity: 1; transform: none; pointer-events: auto; }
    .main-nav a { padding: 14px 8px; border-radius: 0; border-bottom: 1px solid var(--line); font-size: 1.05rem; }
    .main-nav a[aria-current='page'] { background: none; color: var(--accent); }
  }

  main { outline: none; min-height: 100vh; }
  main.map-view { height: 100dvh; min-height: 0; overflow: hidden; }
  .state { padding: 140px 0; text-align: center; }

  .site-footer { border-top: 1px solid var(--line); padding: 28px 0 36px; color: var(--muted); font-size: 0.9rem; }
  .foot { display: flex; flex-wrap: wrap; gap: 12px 24px; justify-content: space-between; align-items: center; }
  .foot b { color: var(--accent); }
  .foot nav { display: flex; flex-wrap: wrap; gap: 16px; }
  .foot a { color: var(--text-2); text-decoration: none; }
  .foot a:hover { color: var(--text); text-decoration: underline; }
</style>
