<script lang="ts">
  import { onMount } from 'svelte';
  import { t, formatNumber, i18n } from '../lib/i18n.svelte';
  import { db } from '../lib/store.svelte';
  import { href } from '../lib/router.svelte';
  import { summary, filtersToQuery, EMPTY_FILTERS } from '../lib/data';
  import type { MapHandle } from '../lib/map';
  import { prefersReducedMotion, isNarrow } from '../lib/motion';
  import type { Base, Filters } from '../lib/types';
  import Legend from '../components/Legend.svelte';
  import Compare from '../components/Compare.svelte';
  import NewsList from '../components/NewsList.svelte';
  import type { Image } from '../lib/types';

  // protest photos from the archive, each linked to its base
  const FACES = ['stopp-ramstein-fahrradmarathon', 'marcha-contra-la-base-de-rota', 'menwith-hill-day-of-action', '2015-sabr1', 'guantanomo-final'];
  const faces = $derived(
    FACES.map((key) => {
      for (const b of db.bases) {
        const img = b.images?.find((i) => i.src.includes(key));
        if (img) return { base: b, img };
      }
      return null;
    }).filter((x): x is { base: Base; img: Image } => !!x),
  );
  const showcase = $derived.by(() => {
    const b = db.byId.get('ramstein-air-base');
    const s = (b?.images ?? []).filter((i) => i.type === 'satellite' && i.year).sort((x, y) => x.year! - y.year!);
    return b && s.length >= 2 ? { base: b, before: s[0], after: s.at(-1)! } : null;
  });

  let mapEl: HTMLDivElement;
  let handle: MapHandle | null = $state(null);
  let active = $state(0);
  let shown = $state({ locations: 0, countries: 0, us: 0, resistance: 0 });

  const stats = $derived(summary(db.bases));
  const counts = $derived({
    de: db.bases.filter((b) => b.country === 'DE' && !b.group).length,
    okinawa: db.bases.filter((b) => b.subregion === 'Okinawa' && !b.group).length,
    africa: db.bases.filter((b) => b.continent === 'africa' && !b.group).length,
    resistance: stats.resistance,
  });

  type Chapter = { key: 'story.1' | 'story.2' | 'story.3' | 'story.4' | 'story.5' | 'story.6'; n?: number; center: [number, number]; zoom: number; pick?: (b: Base) => boolean };
  const chapters: Chapter[] = $derived([
    { key: 'story.1', center: [25, 28], zoom: 1.5 },
    { key: 'story.2', n: counts.de, center: [9.5, 50.2], zoom: 4.7, pick: (b) => b.country === 'DE' },
    { key: 'story.3', n: counts.okinawa, center: [127.85, 26.45], zoom: 7.2, pick: (b) => b.subregion === 'Okinawa' },
    { key: 'story.4', n: counts.africa, center: [18, 4], zoom: 2.5, pick: (b) => b.continent === 'africa' },
    { key: 'story.5', n: counts.resistance, center: [40, 30], zoom: 1.5, pick: (b) => b.themes.includes('resistance') },
    { key: 'story.6', center: [10, 40], zoom: 1.6 },
  ]);

  const topics: { key: Parameters<typeof t>[0]; icon: string; filters: Partial<Filters> }[] = [
    { key: 'theme.drones', icon: '🛩', filters: { themes: ['drones'] } },
    { key: 'fac.nuclear', icon: '☢', filters: { facilities: ['nuclear'] } },
    { key: 'theme.environment', icon: '🌱', filters: { themes: ['environment'] } },
    { key: 'theme.surveillance', icon: '📡', filters: { themes: ['surveillance'] } },
    { key: 'fac.missile', icon: '⇡', filters: { facilities: ['missile'] } },
    { key: 'theme.resistance', icon: '✊', filters: { themes: ['resistance'] } },
  ];
  const topicCount = (f: Partial<Filters>) =>
    db.bases.filter((b) => (f.themes ?? []).every((x) => b.themes.includes(x)) && (f.facilities ?? []).every((x) => b.facilities.includes(x))).length;

  const latestNews = $derived(db.news.slice(0, 5));
  const latestStories = $derived(
    [...db.stories].filter((s) => s.lang === i18n.lang).sort((a, b) => (b.lastmod ?? '').localeCompare(a.lastmod ?? '')).slice(0, 3),
  );

  const zoomAdj = () => (innerWidth < 700 ? -0.7 : 0);
  /** keep the globe clear of the text: right half on desktop, upper half on phones */
  const camPadding = () =>
    isNarrow() ? { top: 0, bottom: Math.round(innerHeight * 0.42), left: 0, right: 0 } : { top: 0, bottom: 0, left: Math.round(innerWidth * 0.4), right: 0 };

  // camera follows the active chapter
  $effect(() => {
    const h = handle;
    const ch = chapters[active];
    if (!h || !ch || db.status !== 'ready') return;
    const ids = ch.pick ? new Set(db.bases.filter(ch.pick).map((b) => b.id)) : null;
    h.highlight(ids);
    h.map.flyTo({ center: ch.center, zoom: ch.zoom + zoomAdj(), padding: camPadding(), duration: prefersReducedMotion() ? 0 : 2200, essential: true });
  });

  $effect(() => {
    if (handle && db.status === 'ready') handle.setBases(db.bases);
  });

  // count-up for the hero numbers
  $effect(() => {
    if (db.status !== 'ready') return;
    const target = stats;
    if (prefersReducedMotion()) { shown = { ...target }; return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 1400);
      const e = 1 - Math.pow(1 - p, 3);
      shown = {
        locations: Math.round(target.locations * e),
        countries: Math.round(target.countries * e),
        us: Math.round(target.us * e),
        resistance: Math.round(target.resistance * e),
      };
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  onMount(() => {
    let destroyed = false;
    let raf = 0;
    import('../lib/map').then(({ createMap }) => createMap(mapEl, { detail: '110m', interactive: false, center: [25, 28], zoom: 1.5 + zoomAdj() })).then((h) => {
      if (destroyed) return h.destroy();
      h.map.setPadding(camPadding());
      // the coarse world shapes load fast; small islands (Okinawa, Diego Garcia …) follow
      h.map.once('idle', () => h.upgradeDetail());
      handle = h;
      // slow spin while the hero is visible
      if (!prefersReducedMotion()) {
        const spin = () => {
          if (active === 0 && !h.map.isMoving()) {
            const c = h.map.getCenter();
            h.map.setCenter([c.lng + 0.04, c.lat]);
          }
          raf = requestAnimationFrame(spin);
        };
        h.map.once('idle', () => (raf = requestAnimationFrame(spin)));
      }
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) active = Number((e.target as HTMLElement).dataset.step);
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    document.querySelectorAll('[data-step]').forEach((el) => io.observe(el));

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      handle?.destroy();
    };
  });
</script>

<section class="scrolly" aria-label="Story">
  <div class="sticky">
    <div class="globe" bind:this={mapEl} aria-hidden="true"></div>
    <div class="vignette"></div>
    <div class="legend-wrap" class:visible={active > 0 && active < 5}>
      <Legend compact />
    </div>
  </div>

  <div class="steps">
    <div class="step hero" data-step="0">
      <div class="hero-inner">
        <p class="kicker">{t('hero.kicker')}</p>
        <h1>{t('hero.title')}</h1>
        <p class="lead">{t('hero.lead')} <span class="cite">({t('hero.vineSource')})</span></p>
        <div class="ctas">
          <a class="btn btn-primary" href={href('/near')}>📍 {t('hero.ctaNear')}</a>
          <a class="btn" href={href('/atlas')}>{t('hero.ctaAtlas')} →</a>
        </div>
        <dl class="stats" aria-live="polite">
          <div><dt>{t('stat.locations')}</dt><dd>{formatNumber(shown.locations)}</dd></div>
          <div><dt>{t('stat.countries')}</dt><dd>{formatNumber(shown.countries)}</dd></div>
          <div><dt>{t('stat.us')}</dt><dd>{formatNumber(shown.us)}</dd></div>
          <div><dt>{t('stat.resistance')}</dt><dd>{formatNumber(shown.resistance)}</dd></div>
        </dl>
      </div>
      <a class="scroll-hint" href="#step-1">{t('hero.scroll')} ↓</a>
    </div>

    {#each chapters.slice(1) as ch, i}
      <div class="step" id="step-{i + 1}" data-step={i + 1}>
        <article class="panel" class:current={active === i + 1}>
          <span class="num">{String(i + 1).padStart(2, '0')}</span>
          <h2>{t(`${ch.key}.title`)}</h2>
          <p>{t(`${ch.key}.text`, { n: ch.n ?? 0 })}</p>
          {#if ch.key === 'story.2'}
            <a class="link" href={href('/base/ramstein-air-base')}>Ramstein Air Base →</a>
          {:else if ch.key === 'story.3'}
            <a class="link" href={href('/atlas', 'q=Okinawa')}>{t('nav.atlas')}: Okinawa →</a>
          {:else if ch.key === 'story.4'}
            <a class="link" href={href('/atlas', filtersToQuery({ ...EMPTY_FILTERS, continents: ['africa'] }))}>{t('nav.atlas')}: {t('cont.africa')} →</a>
          {:else if ch.key === 'story.5'}
            <a class="link" href={href('/atlas', filtersToQuery({ ...EMPTY_FILTERS, themes: ['resistance'] }))}>{t('theme.resistance')} →</a>
          {:else if ch.key === 'story.6'}
            <div class="ctas"><a class="btn btn-primary" href={href('/near')}>📍 {t('nav.near')}</a><a class="btn" href={href('/atlas')}>{t('hero.ctaAtlas')}</a></div>
          {/if}
        </article>
      </div>
    {/each}
  </div>
</section>

{#if faces.length}
  <section class="faces container" aria-labelledby="faces-h">
    <p class="kicker">{t('home.facesKicker')}</p>
    <h2 id="faces-h">{t('home.facesTitle')}</h2>
    <p class="sub">{t('home.facesText')}</p>
    <div class="mosaic">
      {#each faces as f, i}
        <a class="tile" class:wide={i === 0} href={href(`/base/${f.base.id}`)}>
          <img src={i === 0 ? f.img.src : f.img.thumb} alt="{f.base.name}" loading="lazy" decoding="async" />
          <span class="tl-cap"><b>{f.base.name}</b><small>© {f.img.credit}</small></span>
        </a>
      {/each}
    </div>
  </section>
{/if}

{#if showcase}
  <section class="change container" aria-labelledby="change-h">
    <div class="change-text">
      <p class="kicker">{t('home.changeKicker')}</p>
      <h2 id="change-h">{t('home.changeTitle')}</h2>
      <p class="sub">{t('home.changeText')}</p>
      <a class="btn" href={href(`/base/${showcase.base.id}`)}>{showcase.base.name} →</a>
    </div>
    <div class="change-img"><Compare before={showcase.before} after={showcase.after} /></div>
  </section>
{/if}

<section class="quiz-teaser container">
  <a class="qt card" href={href('/quiz')}>
    <span class="qt-icon" aria-hidden="true">?</span>
    <span><b>{t('quiz.teaserTitle')}</b><span>{t('quiz.teaserText')}</span></span>
    <span class="qt-go">→</span>
  </a>
</section>

{#if latestNews.length}
  <section class="latest container" aria-labelledby="latest-h">
    <div class="latest-head">
      <h2 id="latest-h">{t('news.latest')}</h2>
      <a class="btn btn-sm" href={href('/news')}>{t('news.allLink')} →</a>
    </div>
    <NewsList items={latestNews} />
  </section>
{/if}

<section class="topics container" aria-labelledby="topics-h">
  <h2 id="topics-h">{t('filters.theme')}</h2>
  <div class="topic-grid">
    {#each topics as tp}
      <a class="topic card" href={href('/atlas', filtersToQuery({ ...EMPTY_FILTERS, ...tp.filters }))}>
        <span class="ti" aria-hidden="true">{tp.icon}</span>
        <span class="tl">{t(tp.key)}</span>
        <span class="tc">{t('filters.results', { n: topicCount(tp.filters) })}</span>
      </a>
    {/each}
  </div>
</section>

{#if latestStories.length}
  <section class="stories container" aria-labelledby="stories-h">
    <h2 id="stories-h">{t('about.stories')}</h2>
    <div class="story-grid">
      {#each latestStories as s}
        <a class="story card" href={s.url} target="_blank" rel="noopener">
          <span class="src">visualbases.org{#if s.lastmod} · {s.lastmod.slice(0, 7)}{/if}</span>
          <h3>{s.title}</h3>
          {#if s.excerpt}<p>{s.excerpt}</p>{/if}
          <span class="more">↗</span>
        </a>
      {/each}
    </div>
  </section>
{/if}

<style>
  .scrolly { position: relative; }
  .sticky { position: sticky; top: 0; height: 100svh; overflow: hidden; z-index: 0; }
  .globe { position: absolute; inset: 0; background: radial-gradient(ellipse at 60% 40%, #101a33 0%, var(--bg) 65%); }
  .vignette { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg, rgb(7 9 15 / 0.85) 0%, rgb(7 9 15 / 0.35) 45%, transparent 70%); }
  .legend-wrap { position: absolute; right: 16px; bottom: 16px; opacity: 0; transition: opacity 0.4s; }
  .legend-wrap.visible { opacity: 1; }

  .steps { position: relative; z-index: 1; margin-top: -100svh; pointer-events: none; }
  .step { min-height: 100svh; display: flex; align-items: center; padding: 96px 16px; }
  .step :global(a), .step :global(button) { pointer-events: auto; }

  .hero { flex-direction: column; justify-content: center; align-items: flex-start; position: relative; }
  .hero-inner { max-width: 640px; margin-left: max(0px, calc((100vw - 1180px) / 2)); }
  h1 { font-size: clamp(2.2rem, 5.5vw, 4.2rem); font-weight: 800; margin-bottom: 0.4em; text-wrap: balance; }
  .lead { font-size: clamp(1.05rem, 1.6vw, 1.25rem); color: var(--text-2); max-width: 36em; }
  .cite { color: var(--muted); font-size: 0.8em; }
  .ctas { display: flex; flex-wrap: wrap; gap: 10px; margin: 1.6em 0 2em; }
  .stats { display: grid; grid-template-columns: repeat(4, auto); gap: 8px 28px; margin: 0; justify-content: start; }
  .stats div { display: flex; flex-direction: column-reverse; }
  .stats dd { margin: 0; font-size: clamp(1.8rem, 3.4vw, 2.6rem); font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
  .stats dt { color: var(--muted); font-size: 0.85rem; }
  .scroll-hint { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); color: var(--muted); text-decoration: none; font-size: 0.85rem; animation: bob 2s ease-in-out infinite; }
  @keyframes bob { 50% { transform: translate(-50%, 6px); } }

  .panel {
    pointer-events: auto; max-width: 420px; margin-left: max(0px, calc((100vw - 1180px) / 2));
    padding: 24px 26px; border-radius: var(--radius); background: rgb(13 18 32 / 0.82); backdrop-filter: blur(10px);
    border: 1px solid var(--line); box-shadow: var(--shadow); transition: border-color 0.4s, transform 0.4s;
  }
  .panel.current { border-color: rgb(255 90 60 / 0.55); }
  .panel h2 { font-size: clamp(1.4rem, 2.6vw, 1.9rem); }
  .panel p { color: var(--text-2); }
  .panel .ctas { margin: 1em 0 0; }
  .num { display: block; font-weight: 800; color: var(--accent); font-size: 0.85rem; letter-spacing: 0.1em; margin-bottom: 0.6em; }
  .link { color: var(--text); font-weight: 600; text-decoration: none; border-bottom: 1px solid var(--accent); }

  @media (max-width: 700px) {
    .vignette { background: linear-gradient(180deg, rgb(7 9 15 / 0) 0%, rgb(7 9 15 / 0.2) 35%, rgb(7 9 15 / 0.92) 58%, var(--bg) 100%); }
    .hero { justify-content: flex-end; padding-bottom: 64px; padding-top: 38svh; }
    h1 { font-size: 2.1rem; }
    .lead { font-size: 1rem; }
    .ctas { margin: 1.2em 0 1.4em; }
    .ctas .btn { flex: 1 1 auto; }
    .stats dd { font-size: 1.7rem; }
    .scroll-hint { display: none; }
    .stats { grid-template-columns: repeat(2, auto); }
    .step:not(.hero) { align-items: flex-end; padding-bottom: 48px; }
    .legend-wrap { top: calc(var(--header-h) + 8px); bottom: auto; right: 8px; }
  }

  .faces, .change { padding: 88px 0 8px; }
  .faces h2, .change h2 { font-size: clamp(1.7rem, 3.6vw, 2.6rem); font-weight: 800; max-width: 18em; }
  .sub { color: var(--text-2); max-width: 40em; }
  .mosaic { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 190px; gap: 8px; margin-top: 24px; }
  .tile { position: relative; overflow: hidden; border-radius: 10px; background: var(--surface); }
  .tile.wide { grid-column: span 2; grid-row: span 2; }
  .tile img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; filter: saturate(0.9); }
  .tile:hover img { transform: scale(1.04); filter: none; }
  .tl-cap { position: absolute; inset: auto 0 0 0; padding: 28px 12px 10px; background: linear-gradient(transparent, rgb(7 9 15 / 0.9)); display: flex; flex-direction: column; font-size: 0.85rem; }
  .tl-cap small { color: var(--muted); font-size: 0.7rem; }
  @media (max-width: 700px) {
    .mosaic { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 140px; }
  }
  .change { display: grid; grid-template-columns: 1fr 1.4fr; gap: 32px; align-items: center; }
  @media (max-width: 820px) { .change { grid-template-columns: 1fr; } }
  .topics, .stories { padding: 72px 0 24px; }
  .latest { padding: 88px 0 8px; max-width: 900px; }
  .quiz-teaser { padding-top: 72px; }
  .qt { display: flex; align-items: center; gap: 18px; padding: 22px 24px; text-decoration: none; background: linear-gradient(120deg, #1a2c4f, var(--surface) 60%); transition: transform 0.15s, border-color 0.15s; }
  .qt:hover { transform: translateY(-2px); border-color: var(--c-shared); }
  .qt-icon { width: 54px; height: 54px; flex: none; border-radius: 14px; display: grid; place-items: center; background: var(--c-shared); font-size: 1.8rem; font-weight: 800; }
  .qt b { display: block; font-size: 1.2rem; }
  .qt span span { color: var(--text-2); }
  .qt-go { margin-left: auto; font-size: 1.4rem; color: var(--text-2); }
  .latest-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .latest h2 { font-size: clamp(1.5rem, 3vw, 2.1rem); }
  .topics h2, .stories h2 { font-size: clamp(1.5rem, 3vw, 2.1rem); }
  .topic-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
  .topic { display: flex; flex-direction: column; gap: 4px; padding: 18px; text-decoration: none; transition: border-color 0.15s, transform 0.15s; }
  .topic:hover { border-color: var(--accent); transform: translateY(-2px); }
  .ti { font-size: 1.6rem; }
  .tl { font-weight: 700; }
  .tc { color: var(--muted); font-size: 0.85rem; }
  .story-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; padding-bottom: 56px; }
  .story { position: relative; padding: 20px 22px; text-decoration: none; display: flex; flex-direction: column; transition: border-color 0.15s; }
  .story:hover { border-color: #3a4868; }
  .story h3 { font-size: 1.1rem; margin: 0.4em 0; }
  .story p { color: var(--text-2); font-size: 0.92rem; margin: 0; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .src { color: var(--muted); font-size: 0.78rem; }
  .more { position: absolute; top: 16px; right: 18px; color: var(--muted); }
</style>
