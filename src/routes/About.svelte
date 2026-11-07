<script lang="ts">
  import { t, i18n } from '../lib/i18n.svelte';
  import { db } from '../lib/store.svelte';
  import { href } from '../lib/router.svelte';
  import { GROUP_COLOR, KIND_GROUP, KINDS } from '../lib/taxonomy';

  const usTypes = $derived(
    i18n.lang === 'de'
      ? [
          ['MOB', 'Main Operating Base – dauerhaft besetzte, gut geschützte Großbasis mit Luft- oder Seezugang.'],
          ['FOB', 'Forward Operating Base – vorgeschobene Basis zur Unterstützung von Einsätzen.'],
          ['FOS', 'Forward Operating Site – kleine Basis mit Vorräten und wenig Stammpersonal, schnell ausbaubar.'],
          ['CSL', 'Cooperative Security Location – „Lily Pad“ mit kaum Personal, vom Gastland betrieben, im Bedarfsfall nutzbar.'],
        ]
      : [
          ['MOB', 'Main Operating Base – permanently manned, well-protected base with robust air or sea access.'],
          ['FOB', 'Forward Operating Base – forward base supporting operations.'],
          ['FOS', 'Forward Operating Site – small base with pre-positioned equipment and little permanent staff, expandable.'],
          ['CSL', 'Cooperative Security Location – “lily pad” with little or no staff, run by the host nation, usable on demand.'],
        ],
  );
  const stories = $derived([...db.stories].sort((a, b) => (b.lastmod ?? '').localeCompare(a.lastmod ?? '')));
</script>

<div class="about container">
  <header>
    <p class="kicker">{t('nav.about')}</p>
    <h1>{t('about.title')}</h1>
    <p class="lead">{t('about.mission')}</p>
  </header>

  <div class="cols">
    <section class="card block">
      <h2>{t('about.data')}</h2>
      <p>{t('about.dataText')}</p>
      <div class="dl">
        <a class="btn btn-primary btn-sm" href="./data/bases.csv" download>⬇ CSV</a>
        <a class="btn btn-sm" href="./data/bases.geojson" download>⬇ GeoJSON</a>
        <a class="btn btn-sm" href="./data/bases.json" download>⬇ JSON</a>
      </div>
      <p class="small">
        {db.bases.length} · {t('about.license')}: <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> ·
        <a href="./data/LICENSE.txt" target="_blank" rel="noopener">{t('about.licenseDetails')}</a>
      </p>
      <p class="small">{t('about.attribution')}: „VisualBases – visualbases.org (Karl-Heinz Peil, Friedens- und Zukunftswerkstatt e. V.), CC BY 4.0“</p>
    </section>

    <section class="card block">
      <h2>{t('about.contribute')}</h2>
      <p>{t('about.contributeText')}</p>
      <a class="btn btn-sm" href="https://github.com/Acephali92/VisualBases" target="_blank" rel="noopener">{t('about.github')} ↗</a>
    </section>

    <section class="card block">
      <h2>{t('about.privacy')}</h2>
      <p>{t('about.privacyText')}</p>
    </section>
  </div>

  <section class="text">
    <h2>{t('about.method')}</h2>
    <p>{t('about.methodText')}</p>
    <p>{t('about.origin')}</p>
  </section>

  <section class="text">
    <h2>{t('about.kinds')}</h2>
    <dl class="kinds">
      {#each KINDS as k}
        <div>
          <dt><span class="dot" class:ring={KIND_GROUP[k] === 'hotspot'} style:background={GROUP_COLOR[KIND_GROUP[k]]}></span><a href={href('/atlas', `kinds=${k}`)}>{t(`kind.${k}`)}</a></dt>
          <dd>{t(`kindInfo.${k}`)}</dd>
        </div>
      {/each}
    </dl>
  </section>

  <section class="text">
    <h2>{t('base.usType')}</h2>
    <dl class="kinds">
      {#each usTypes as [k, v]}
        <div><dt><a href={href('/atlas', `q=${k}`)}>{k}</a></dt><dd>{v}</dd></div>
      {/each}
    </dl>
  </section>

  {#if stories.length}
    <section class="text">
      <h2>{t('about.stories')}</h2>
      <ul class="stories">
        {#each stories as s}
          <li><a href={s.url} target="_blank" rel="noopener">{s.title}</a> <span class="small">{s.lang.toUpperCase()}{#if s.lastmod} · {s.lastmod}{/if}</span></li>
        {/each}
      </ul>
    </section>
  {/if}

  <section class="text">
    <h2>{t('about.credits')}</h2>
    <p class="small">{t('about.creditsText')}</p>
  </section>
</div>

<style>
  .about { padding: calc(var(--header-h) + 48px) 0 64px; }
  h1 { font-size: clamp(1.9rem, 4.5vw, 3rem); font-weight: 800; }
  .lead { color: var(--text-2); font-size: 1.15rem; max-width: 42em; }
  .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin: 32px 0; }
  .block { padding: 20px 22px; }
  .block h2 { font-size: 1.15rem; }
  .block p { color: var(--text-2); font-size: 0.95rem; }
  .dl { display: flex; flex-wrap: wrap; gap: 8px; }
  .small { color: var(--muted); font-size: 0.82rem; margin-top: 10px; }
  .text { max-width: 760px; margin-top: 40px; }
  .text h2 { font-size: 1.4rem; }
  .text p { color: var(--text-2); }
  .kinds { display: grid; gap: 14px; margin: 0; }
  .kinds dt { display: flex; align-items: center; gap: 10px; font-weight: 700; }
  .kinds dt a { text-decoration: none; }
  .kinds dt a:hover { text-decoration: underline; }
  .kinds dd { margin: 4px 0 0 20px; color: var(--text-2); font-size: 0.95rem; }
  .stories { padding-left: 1.1em; display: grid; gap: 8px; }
  .stories a { color: var(--text); }
</style>
