<script lang="ts">
  import { t, i18n, countryName } from '../lib/i18n.svelte';
  import { db } from '../lib/store.svelte';
  import { href } from '../lib/router.svelte';
  import { flag, SOURCE_WANTED } from '../lib/taxonomy';
  import { tl } from '../lib/i18n.svelte';
  import { issueUrl, mailUrl, REPO_URL } from '../lib/github';
  import type { Base } from '../lib/types';

  const campaigns = $derived(
    db.bases
      .filter((b) => b.themes.includes('resistance'))
      .map((b) => ({
        base: b,
        logo: b.images?.find((i) => i.type === 'logo'),
        photo: b.images?.find((i) => i.type === 'photo'),
        link: campaignLink(b),
      }))
      .sort((a, b) => Number(!!b.photo || !!b.logo) - Number(!!a.photo || !!a.logo) || (a.base.host.country ?? '').localeCompare(b.base.host.country ?? '')),
  );
  /** pick the campaign's own website – never official military or media hosting sites */
  const NOT_CAMPAIGN = /\.mil\b|militaryonesource|army\.|af\.mil|navy|africom|eucom|wikipedia|wikimedia|youtube|visualbases\.org|google\./i;
  function campaignLink(b: Base) {
    const ok = b.sources.filter((s) => !NOT_CAMPAIGN.test(s.url));
    return ok.find((s) => /campaign|kampagne|stopp|stop |watch|no[ -]|nein|netzwerk|initiative|coalition|bündnis|friedens|peace|cnd|save/i.test(`${s.label} ${s.url}`)) ?? ok[0];
  }
  const regionLabel = (r: string) => (r === 'INT' ? '🌐 International' : `${flag(r)} ${countryName(r)}`);
  const congress = $derived(db.movement.congress);
  const date = (d: string) => new Date(d).toLocaleDateString(i18n.lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const baseOf = (id?: string): Base | undefined => (id ? db.byId.get(id) : undefined);

  /** records without a checked source for the presence, by host country – the same set as the atlas filter and the report */
  const wanted = $derived(db.bases.filter((b) => (SOURCE_WANTED as string[]).includes(b.sourceLevel)));
  const wantedByCountry = $derived.by(() => {
    const m = new Map<string, Base[]>();
    for (const b of wanted) { const cc = b.host.territory ?? b.host.country ?? ''; m.set(cc, [...(m.get(cc) ?? []), b]); }
    return [...m.entries()]
      .map(([cc, list]) => ({ cc, list: list.sort((x, y) => x.name.localeCompare(y.name)) }))
      .sort((x, y) => y.list.length - x.list.length || countryName(x.cc).localeCompare(countryName(y.cc)));
  });
</script>

<div class="act">
  <header class="hero container">
    <p class="kicker">{t('nav.act')}</p>
    <h1>{t('act.title')}</h1>
    <p class="lead">{t('act.lead')}</p>
    <div class="actions">
      <div class="action card">
        <span class="ai">📍</span><b>{t('act.reportTitle')}</b><span>{t('act.reportText')}</span>
        <span class="alt">
          <a href={issueUrl('hinweis')} target="_blank" rel="noopener">GitHub ↗</a>
          <a href={mailUrl(t('act.mailSubject'), t('act.mailBody'))}>✉ {t('act.mail')}</a>
        </span>
      </div>
      <a class="action card" href={href('/near')}>
        <span class="ai">📲</span><b>{t('act.shareTitle')}</b><span>{t('act.shareText')}</span>
      </a>
      <a class="action card" href={href('/about')}>
        <span class="ai">⬇</span><b>{t('act.dataTitle')}</b><span>{t('act.dataText')}</span>
      </a>
      <a class="action card" href={href('/school')}>
        <span class="ai">🎓</span><b>{t('nav.school')}</b><span>{t('act.schoolText')}</span>
      </a>
      <a class="action card" href={href('/quiz')}>
        <span class="ai">❓</span><b>{t('quiz.teaserTitle')}</b><span>{t('quiz.teaserText')}</span>
      </a>
      <a class="action card" href={REPO_URL} target="_blank" rel="noopener">
        <span class="ai">⌨</span><b>{t('act.codeTitle')}</b><span>{t('act.codeText')}</span>
      </a>
    </div>
  </header>

  <section class="container" aria-labelledby="wanted-h">
    <h2 id="wanted-h">🔎 {t('act.wantedTitle')} <span class="n">{wanted.length}</span></h2>
    <p class="sub">{t('act.wantedText')}</p>
    <p class="wlinks">
      <a class="btn btn-sm" href={href('/atlas', `evidence=${SOURCE_WANTED.join(',')}`)}>{t('act.wantedAtlas')}</a>
      <a href={mailUrl(t('act.wantedMailSubject'), t('act.wantedMailBody'))}>✉ {t('act.wantedMail')}</a>
    </p>
    <div class="wanted">
      {#each wantedByCountry as g (g.cc)}
        <details>
          <summary>{g.cc ? `${flag(g.cc)} ${countryName(g.cc)}` : '–'} <span class="n">{g.list.length}</span></summary>
          <ul>
            {#each g.list as b (b.id)}
              <li>
                <a href={href(`/base/${b.id}`)}>{b.name}</a>
                <small>{tl('sourceLevel', b.sourceLevel)} · <a class="rep" href={issueUrl('beleg', { title: `Beleg: ${b.name}`, base: b.id })} target="_blank" rel="noopener">{t('base.reportSource')} ↗</a></small>
              </li>
            {/each}
          </ul>
        </details>
      {/each}
    </div>
  </section>

  <section class="container" aria-labelledby="camp-h">
    <h2 id="camp-h">{t('act.localTitle')} <span class="n">{campaigns.length}</span></h2>
    <p class="sub">{t('act.localText')}</p>
    <ul class="camps">
      {#each campaigns as c (c.base.id)}
        <li class="camp card">
          <a class="cimg" class:logo={!c.photo && !!c.logo} href={href(`/base/${c.base.id}`)} aria-label={c.base.name}>
            {#if c.photo}<img src={c.photo.thumb} alt="" loading="lazy" />{:else if c.logo}<img src={c.logo.thumb} alt="" loading="lazy" />{:else}<span class="ph">✊</span>{/if}
          </a>
          <div class="cbody">
            <a class="cname" href={href(`/base/${c.base.id}`)}>{c.base.name}</a>
            <span class="cwhere">{flag(c.base.host.country)} {countryName(c.base.host.country)}</span>
            {#if c.link}<a class="clink" href={c.link.url} target="_blank" rel="noopener">{c.link.label} ↗</a>{/if}
          </div>
        </li>
      {/each}
    </ul>
  </section>

  <section class="container" aria-labelledby="net-h">
    <h2 id="net-h">{t('act.networkTitle')}</h2>
    <ul class="nets">
      {#each db.movement.initiatives as ini}
        <li>
          <a class="net card" href={ini.url} target="_blank" rel="noopener">
            <span class="reg">{regionLabel(ini.region)}</span>
            <b>{ini.name} ↗</b>
            <span>{i18n.lang === 'de' ? ini.de : ini.en}</span>
          </a>
        </li>
      {/each}
    </ul>
  </section>

  {#if congress}
    <section class="container" aria-labelledby="cong-h">
      <p class="kicker">{date(congress.date)}</p>
      <h2 id="cong-h">{congress.title}</h2>
      <p class="sub">„{congress.subtitle}“</p>
      <ul class="speakers">
        {#each congress.speakers as s}
          {@const b = baseOf(s.base)}
          <li class="spk">
            {#if s.photo}<img src={s.photo} alt={s.name} width="160" height="160" loading="lazy" />{/if}
            <div>
              <b>{s.name}</b>
              <span class="from">{s.from}{s.role ? ` · ${s.role}` : ''}</span>
              <span class="topic">{s.topic}</span>
              <span class="links">
                {#if s.link}<a href={s.link} target="_blank" rel="noopener">{s.video ? '▶ Video' : '📄 Text'} ↗</a>{/if}
                {#if b}<a href={href(`/base/${b.id}`)}>📍 {b.name}</a>{/if}
              </span>
            </div>
          </li>
        {/each}
      </ul>
      {#if congress.next}<a class="btn" href={congress.next.url} target="_blank" rel="noopener">{congress.next.title} ↗</a>{/if}
    </section>
  {/if}
</div>

<style>
  .act { padding: calc(var(--header-h) + 48px) 0 64px; }
  h1 { font-size: clamp(2rem, 5vw, 3.4rem); font-weight: 800; max-width: 16em; text-wrap: balance; }
  .lead { color: var(--text-2); font-size: 1.12rem; max-width: 42em; }
  h2 { font-size: clamp(1.5rem, 3vw, 2.1rem); display: flex; align-items: baseline; gap: 10px; }
  .n { color: var(--muted); font-size: 1rem; font-weight: 500; }
  .sub { color: var(--text-2); max-width: 44em; }
  section { margin-top: 72px; }

  .actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 28px; }
  .action { display: flex; flex-direction: column; gap: 4px; padding: 20px; text-decoration: none; transition: border-color 0.15s, transform 0.15s; }
  .action:hover { border-color: var(--accent); transform: translateY(-2px); }
  .action b { font-size: 1.05rem; }
  .action span:last-child { color: var(--text-2); font-size: 0.9rem; }
  .ai { font-size: 1.6rem; }
  .action .alt { display: flex; gap: 14px; margin-top: 6px; color: var(--text) !important; font-weight: 600; }
  .action .alt a { color: var(--text); }

  .wlinks { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin: 14px 0 18px; }
  .wanted { columns: 280px; column-gap: 8px; }
  .wanted details { break-inside: avoid; margin-bottom: 8px; border: 1px solid var(--line); border-radius: var(--radius-s); background: var(--bg-2); padding: 8px 12px; }
  .wanted summary { cursor: pointer; font-weight: 600; }
  .wanted ul { list-style: none; padding: 0; margin: 8px 0 2px; display: grid; gap: 8px; }
  .wanted li { display: flex; flex-direction: column; gap: 1px; font-size: 0.92rem; }
  .wanted li small { color: var(--muted); font-size: 0.78rem; }
  .wanted .rep { font-size: 0.84rem; color: var(--text-2); }
  .camps { list-style: none; padding: 0; margin: 20px 0 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
  .camp { display: flex; gap: 12px; padding: 10px; align-items: center; }
  .cimg { width: 76px; height: 76px; flex: none; border-radius: 8px; overflow: hidden; background: var(--bg-2); display: grid; place-items: center; }
  .cimg img { width: 100%; height: 100%; object-fit: cover; }
  .cimg.logo { background: #fff; }
  .cimg.logo img { object-fit: contain; padding: 4px; }
  .ph { font-size: 1.8rem; opacity: 0.6; }
  .cbody { display: flex; flex-direction: column; min-width: 0; }
  .cname { font-weight: 700; text-decoration: none; }
  .cname:hover { text-decoration: underline; }
  .cwhere { color: var(--muted); font-size: 0.82rem; }
  .clink { color: var(--text-2); font-size: 0.84rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .nets { list-style: none; padding: 0; margin: 20px 0 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; }
  .net { display: flex; flex-direction: column; gap: 4px; padding: 16px 18px; text-decoration: none; height: 100%; }
  .net:hover { border-color: #3a4868; }
  .reg { color: var(--muted); font-size: 0.78rem; }
  .net span:last-child { color: var(--text-2); font-size: 0.9rem; }

  .speakers { list-style: none; padding: 0; margin: 24px 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
  .spk { display: flex; gap: 14px; align-items: flex-start; }
  .spk img { width: 84px; height: 84px; border-radius: 50%; object-fit: cover; flex: none; border: 2px solid var(--line); }
  .spk div { display: flex; flex-direction: column; gap: 2px; }
  .from { color: var(--muted); font-size: 0.82rem; }
  .topic { color: var(--text-2); font-size: 0.92rem; }
  .links { display: flex; flex-wrap: wrap; gap: 10px; font-size: 0.85rem; margin-top: 2px; }
  .links a { color: var(--text); }
</style>
