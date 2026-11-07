<script lang="ts">
  import type { Image } from '../lib/types';
  import { t } from '../lib/i18n.svelte';

  /** before/after slider for two satellite images of the same site */
  let { before, after }: { before: Image; after: Image } = $props();
  let pos = $state(50);
  let box: HTMLDivElement;
  let dragging = false;

  function setFrom(clientX: number) {
    const r = box.getBoundingClientRect();
    pos = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
  }
  const ratio = $derived(after.h / after.w);
</script>

<figure class="compare">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="box"
    bind:this={box}
    style:aspect-ratio="{1 / ratio}"
    onpointerdown={(e) => { dragging = true; box.setPointerCapture(e.pointerId); setFrom(e.clientX); }}
    onpointermove={(e) => dragging && setFrom(e.clientX)}
    onpointerup={() => (dragging = false)}
    onpointercancel={() => (dragging = false)}
  >
    <img src={after.src} alt="{t('img.satellite')} {after.year ?? ''}" draggable="false" loading="lazy" />
    <div class="clip" style:clip-path="inset(0 {100 - pos}% 0 0)">
      <img src={before.src} alt="{t('img.satellite')} {before.year ?? ''}" draggable="false" loading="lazy" />
    </div>
    <span class="yr left">{before.year ?? t('img.before')}</span>
    <span class="yr right">{after.year ?? t('img.after')}</span>
    <div class="handle" style:left="{pos}%"><span>⇆</span></div>
    <input
      class="range"
      type="range"
      min="0"
      max="100"
      step="1"
      bind:value={pos}
      aria-label="{t('img.compare')}: {before.year} – {after.year}"
    />
  </div>
  <figcaption>{t('img.compare')} · © {after.credit ?? 'Google Earth'}</figcaption>
</figure>

<style>
  .compare { margin: 0; }
  .box { position: relative; overflow: hidden; border-radius: var(--radius-s); border: 1px solid var(--line); touch-action: pan-y; cursor: ew-resize; user-select: none; background: var(--bg-2); }
  .box img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
  .clip { position: absolute; inset: 0; }
  .yr { position: absolute; top: 8px; padding: 2px 8px; border-radius: 999px; background: rgb(7 9 15 / 0.75); font-size: 0.78rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .left { left: 8px; }
  .right { right: 8px; }
  .handle { position: absolute; top: 0; bottom: 0; width: 2px; background: #fff; transform: translateX(-1px); pointer-events: none; box-shadow: 0 0 8px rgb(0 0 0 / 0.6); }
  .handle span { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 34px; height: 34px; border-radius: 50%; background: #fff; color: #07090f; display: grid; place-items: center; font-weight: 800; box-shadow: 0 2px 10px rgb(0 0 0 / 0.5); }
  .range { position: absolute; inset: auto 0 0 0; width: 100%; opacity: 0; height: 100%; margin: 0; cursor: ew-resize; }
  .box:focus-within .handle span { outline: 2px solid var(--focus); }
  figcaption { color: var(--muted); font-size: 0.75rem; margin-top: 6px; }
</style>
