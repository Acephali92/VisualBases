<script lang="ts">
  import { t, formatNumber } from '../lib/i18n.svelte';

  type Row = { label: string; value: number; href?: string };
  let { title, rows, max = 12 }: { title: string; rows: Row[]; max?: number } = $props();

  let asTable = $state(false);
  let tip = $state<{ i: number } | null>(null);
  const shown = $derived(rows.slice(0, max));
  const top = $derived(Math.max(1, ...shown.map((r) => r.value)));
  const id = `bc-${Math.random().toString(36).slice(2, 8)}`;
</script>

<figure class="chart card" aria-labelledby={id}>
  <figcaption class="head">
    <span id={id} class="title">{title}</span>
    <button class="linkish" aria-pressed={asTable} onclick={() => (asTable = !asTable)}>{asTable ? '▮ Chart' : '☰ ' + t('stats.table')}</button>
  </figcaption>

  {#if asTable}
    <table>
      <thead><tr><th scope="col"></th><th scope="col" class="num">{t('stats.count')}</th></tr></thead>
      <tbody>
        {#each rows as r}<tr><td>{r.label}</td><td class="num">{formatNumber(r.value)}</td></tr>{/each}
      </tbody>
    </table>
  {:else}
    <ul class="bars">
      {#each shown as r, i}
        <li>
          <svelte:element this={r.href ? 'a' : 'div'} class="row" href={r.href} role={r.href ? undefined : 'img'} tabindex={r.href ? undefined : 0}
            aria-label="{r.label}: {r.value}"
            onmouseenter={() => (tip = { i })} onmouseleave={() => (tip = null)} onfocus={() => (tip = { i })} onblur={() => (tip = null)}>
            <span class="lbl">{r.label}</span>
            <span class="track">
              <span class="bar" style:width="{(r.value / top) * 100}%"></span>
              {#if i === 0}<span class="val">{formatNumber(r.value)}</span>{/if}
              {#if tip?.i === i}<span class="tooltip" style:left="{Math.min(88, (r.value / top) * 100)}%"><b>{formatNumber(r.value)}</b> · {r.label}</span>{/if}
            </span>
          </svelte:element>
        </li>
      {/each}
    </ul>
    {#if rows.length > max}<p class="rest">+ {rows.length - max}</p>{/if}
  {/if}
</figure>

<style>
  .chart { margin: 0; padding: 18px 20px; }
  .head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 14px; }
  .title { font-weight: 700; font-size: 1.02rem; }
  .linkish { background: none; border: 0; color: var(--muted); font-size: 0.8rem; text-decoration: underline; text-underline-offset: 3px; padding: 0; }
  .bars { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
  .row { display: grid; grid-template-columns: minmax(90px, 38%) 1fr; align-items: center; gap: 12px; padding: 5px 4px; border-radius: 6px; text-decoration: none; outline-offset: 0; }
  .row:hover, .row:focus-visible { background: rgb(255 255 255 / 0.04); }
  .lbl { font-size: 0.88rem; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .track { position: relative; display: flex; align-items: center; gap: 8px; height: 18px; }
  .bar { height: 12px; min-width: 3px; background: #3987e5; border-radius: 0 4px 4px 0; }
  .val { font-size: 0.82rem; color: var(--text); font-variant-numeric: tabular-nums; font-weight: 600; }
  .tooltip { position: absolute; bottom: calc(100% + 6px); transform: translateX(-50%); background: var(--text); color: var(--bg); font-size: 0.78rem; padding: 3px 8px; border-radius: 6px; white-space: nowrap; pointer-events: none; z-index: 2; }
  .rest { color: var(--muted); font-size: 0.8rem; margin: 8px 0 0; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  th, td { text-align: left; padding: 6px 4px; border-bottom: 1px solid var(--line); }
  th { color: var(--muted); font-weight: 600; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
</style>
