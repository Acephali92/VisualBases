<script lang="ts">
  import type { Image } from '../lib/types';
  import { t } from '../lib/i18n.svelte';

  let { images, title }: { images: Image[]; title: string } = $props();
  let open = $state<number | null>(null);
  let dialog: HTMLDialogElement | undefined = $state();

  function show(i: number) {
    open = i;
    dialog?.showModal();
  }
  function close() {
    dialog?.close();
    open = null;
  }
  function step(d: number) {
    if (open == null) return;
    open = (open + d + images.length) % images.length;
  }
  const label = (img: Image) =>
    [img.caption, img.type === 'satellite' ? `${t('img.satellite')}${img.year ? ' ' + img.year : ''}` : img.type === 'map' ? t('img.map') : '']
      .filter(Boolean)[0] ?? title;
  const cur = $derived(open != null ? images[open] : null);
</script>

<ul class="grid">
  {#each images as img, i}
    <li class:logo={img.type === 'logo'}>
      <button onclick={() => show(i)} aria-label="{label(img)} – {t('img.enlarge')}">
        <img src={img.thumb} width={img.tw} height={img.th} alt={label(img)} loading="lazy" decoding="async" />
        {#if img.type === 'satellite' && img.year}<span class="badge">{img.year}</span>{/if}
        {#if img.type === 'map'}<span class="badge">{t('img.map')}</span>{/if}
      </button>
    </li>
  {/each}
</ul>

<dialog bind:this={dialog} onclose={() => (open = null)} onclick={(e) => e.target === dialog && close()} onkeydown={(e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }}>
  {#if cur}
    <figure>
      <img src={cur.src} width={cur.w} height={cur.h} alt={label(cur)} />
      <figcaption>
        <span class="cap">{label(cur)}</span>
        <span class="credit">
          © {cur.credit ?? 'visualbases.org'}{#if cur.license}{' · '}{#if cur.licenseUrl}<a href={cur.licenseUrl} target="_blank" rel="noopener">{cur.license}</a>{:else}{cur.license}{/if}{/if}
          {#if cur.sourceUrl}{' · '}<a href={cur.sourceUrl} target="_blank" rel="noopener">{t('img.source')}</a>{/if}
        </span>
      </figcaption>
    </figure>
    <div class="nav">
      {#if images.length > 1}
        <button class="btn icon-btn" onclick={() => step(-1)} aria-label="←">←</button>
        <span class="count">{(open ?? 0) + 1} / {images.length}</span>
        <button class="btn icon-btn" onclick={() => step(1)} aria-label="→">→</button>
      {/if}
      <button class="btn btn-sm close" onclick={close}>✕ {t('base.close')}</button>
    </div>
  {/if}
</dialog>

<style>
  .grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .grid button { position: relative; display: block; width: 100%; aspect-ratio: 1; padding: 0; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; background: var(--bg-2); }
  .grid img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.25s; }
  .grid button:hover img { transform: scale(1.05); }
  .logo img { object-fit: contain; background: #fff; padding: 6px; }
  .badge { position: absolute; left: 4px; bottom: 4px; padding: 1px 6px; border-radius: 999px; font-size: 0.68rem; font-weight: 700; background: rgb(7 9 15 / 0.8); }

  dialog { padding: 0; border: 0; background: transparent; max-width: min(1200px, 96vw); max-height: 96vh; color: var(--text); }
  dialog::backdrop { background: rgb(3 4 8 / 0.9); backdrop-filter: blur(4px); }
  figure { margin: 0; display: flex; flex-direction: column; gap: 10px; }
  figure img { max-width: 100%; max-height: 78vh; width: auto; height: auto; margin: 0 auto; border-radius: 8px; object-fit: contain; }
  figcaption { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 16px; font-size: 0.88rem; }
  .credit { color: var(--muted); font-size: 0.8rem; }
  .credit a { color: var(--text-2); }
  .nav { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
  .count { color: var(--muted); font-variant-numeric: tabular-nums; font-size: 0.85rem; }
  .close { margin-left: auto; }
</style>
