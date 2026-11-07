<script lang="ts">
  import { t, tl, countryName } from '../lib/i18n.svelte';
  import { db } from '../lib/store.svelte';
  import { href } from '../lib/router.svelte';
  import { flag, GROUP_COLOR, colorGroup } from '../lib/taxonomy';
  import Compare from '../components/Compare.svelte';
  import type { Base, Image } from '../lib/types';

  /** every base with satellite images from at least two different years */
  const pairs = $derived(
    db.bases
      .map((b) => {
        const s = (b.images ?? []).filter((i) => i.type === 'satellite' && i.year).sort((x, y) => x.year! - y.year!);
        return s.length >= 2 && s[0].year !== s.at(-1)!.year ? { b, before: s[0], after: s.at(-1)! } : null;
      })
      .filter((x): x is { b: Base; before: Image; after: Image } => !!x)
      .sort((x, y) => y.after.year! - y.before.year! - (x.after.year! - x.before.year!)),
  );
</script>

<div class="space container">
  <header>
    <p class="kicker">{t('home.changeKicker')}</p>
    <h1>{t('space.title')}</h1>
    <p class="lead">{t('space.lead')}</p>
  </header>

  {#if db.status !== 'ready'}
    <p class="muted">{t('common.loading')}</p>
  {:else}
    <ul class="grid">
      {#each pairs as { b, before, after } (b.id)}
        <li class="card item">
          <Compare {before} {after} aspect={4 / 3} />
          <div class="meta">
            <a class="name" href={href(`/base/${b.id}`)}>
              <span class="dot" class:ring={colorGroup(b) === 'aggregate'} style:background={GROUP_COLOR[colorGroup(b)]}></span>{b.name}
            </a>
            <span class="sub">{flag(b.host.country)} {countryName(b.host.country)} · {before.year} → {after.year} · {tl('siteType', b.siteType)}</span>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .space { padding: calc(var(--header-h) + 48px) 0 64px; }
  h1 { font-size: clamp(1.9rem, 4.5vw, 3rem); font-weight: 800; }
  .lead { color: var(--text-2); max-width: 44em; }
  .muted { color: var(--muted); }
  .grid { list-style: none; padding: 0; margin: 28px 0 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); gap: 18px; }
  .item { padding: 12px; }
  .meta { display: flex; flex-direction: column; gap: 2px; margin-top: 8px; }
  .name { display: flex; align-items: center; gap: 8px; font-weight: 700; text-decoration: none; font-size: 1.05rem; }
  .name:hover { text-decoration: underline; }
  .sub { color: var(--muted); font-size: 0.85rem; }
</style>
