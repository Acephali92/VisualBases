<script lang="ts">
  import { t, type Key } from '../lib/i18n.svelte';
  import { flag } from '../lib/taxonomy';
  import { placeLabel, type GeoPlace } from '../lib/geocode';

  /** list of geocoding matches the user picks from – distances are only computed after a pick */
  let { options, onpick }: { options: GeoPlace[]; onpick: (p: GeoPlace) => void } = $props();
</script>

<ul class="choices">
  {#each options as p, i (i)}
    <li>
      <button type="button" class="choice" onclick={() => onpick(p)}>
        <span class="fl" aria-hidden="true">{flag(p.countryCode)}</span>
        <span class="txt">
          <b>{placeLabel(p)}</b>
          <small>
            {p.postcode ? `${t('near.postcode')} ${p.postcode} · ` : ''}{t(`near.precision.${p.precision}` as Key)}
          </small>
        </span>
        <span class="arrow" aria-hidden="true">→</span>
      </button>
    </li>
  {/each}
</ul>

<style>
  .choices { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .choice { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 14px; text-align: left; border-radius: var(--radius-s); border: 1px solid var(--line); background: var(--bg-2); color: inherit; font: inherit; cursor: pointer; }
  .choice:hover, .choice:focus-visible { border-color: var(--accent); }
  .fl { font-size: 1.3rem; }
  .txt { flex: 1; min-width: 0; }
  .txt b { display: block; }
  .txt small { display: block; color: var(--muted); font-size: 0.82rem; }
  .arrow { color: var(--muted); }
</style>
