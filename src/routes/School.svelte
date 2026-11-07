<script lang="ts">
  import { i18n } from '../lib/i18n.svelte';
  import { href } from '../lib/router.svelte';
  import { db } from '../lib/store.svelte';
  import { summary } from '../lib/data';

  const s = $derived(summary(db.bases));
  const de = $derived(i18n.lang === 'de');

  const tasks = $derived(
    de
      ? [
          { t: 'Einstieg: Wie nah ist die nächste Basis?', min: 10, link: '/near', steps: ['Gib den Ort eurer Schule unter „Deine Basis“ ein.', 'Notiert die Entfernung und die Art der nächsten Basis.', 'Vergleicht in der Klasse: Hat euch das Ergebnis überrascht? Warum (nicht)?'] },
          { t: 'Das Netz verstehen', min: 20, link: '/stats', steps: [`Wie viele Standorte sind im Datensatz erfasst (aktuell ${s.locations})? In wie vielen Ländern?`, 'Welche fünf Länder beherbergen die meisten Standorte? Welche Staaten stationieren Truppen im Ausland?', 'Recherchiert: Warum sind gerade diese Länder Stationierungsländer? (Geschichte nach 1945, Bündnisse, Lage)'] },
          { t: 'Aus dem All: Veränderung sichtbar machen', min: 20, link: '/space', steps: ['Wählt unter „Zeitreisen“ eine Basis aus.', 'Beschreibt genau, was sich zwischen den beiden Aufnahmen verändert hat (Gebäude, Start- und Landebahnen, Flächen).', 'Welche Schlüsse lassen sich aus Satellitenbildern ziehen – und welche nicht?'] },
          { t: 'Quellenkritik', min: 25, link: '/about', steps: ['Öffnet ein Standort-Profil und seht euch die Quellen an: offizielle Berichte, Wikipedia, Medien, Kampagnen.', 'Ordnet jede Quelle ein: Wer hat sie verfasst? Mit welchem Interesse?', 'Warum fehlt etwa die Hälfte der US-Auslandsbasen im offiziellen Pentagon-Bericht (BSR)? Welche Gründe könnte es geben?'] },
          { t: 'Kontrovers diskutieren', min: 30, link: '/act', steps: ['Sammelt Argumente für ausländische Militärbasen (z. B. Bündnisverteidigung, Abschreckung, Arbeitsplätze) und dagegen (z. B. Souveränität, Lärm, Umweltschäden, Beteiligung an Kriegen).', 'Recherchiert zu einem Ort mit Widerstand (z. B. Ramstein, Okinawa, Jeju): Wer protestiert, mit welchen Argumenten? Wie argumentieren Regierung und Militär?', 'Bildet euch eine eigene, begründete Meinung. Pro- und Contra-Debatte oder Positionspapier.'] },
        ]
      : [
          { t: 'Warm-up: how close is the nearest base?', min: 10, link: '/near', steps: ['Enter your school’s town under “Your base”.', 'Note the distance and the kind of the nearest base.', 'Compare in class: were you surprised? Why (not)?'] },
          { t: 'Understanding the network', min: 20, link: '/stats', steps: [`How many sites are in the dataset (currently ${s.locations})? In how many countries?`, 'Which five countries host the most sites? Which states station troops abroad?', 'Research: why are these countries hosts? (history after 1945, alliances, geography)'] },
          { t: 'From space: making change visible', min: 20, link: '/space', steps: ['Pick a base under “Time travel”.', 'Describe precisely what changed between the two images (buildings, runways, areas).', 'What can satellite images tell us – and what can they not?'] },
          { t: 'Source criticism', min: 25, link: '/about', steps: ['Open a base profile and look at its sources: official reports, Wikipedia, media, campaigns.', 'Classify each source: who wrote it, with what interest?', 'Why are about half of the US bases abroad missing from the official Pentagon report (BSR)? What could the reasons be?'] },
          { t: 'Debate the controversy', min: 30, link: '/act', steps: ['Collect arguments for foreign military bases (e.g. alliance defence, deterrence, jobs) and against them (e.g. sovereignty, noise, environmental damage, involvement in wars).', 'Research a site of resistance (e.g. Ramstein, Okinawa, Jeju): who protests, with what arguments? How do government and military argue?', 'Form your own reasoned opinion. Pro/contra debate or position paper.'] },
        ],
  );
</script>

<div class="school container">
  <header>
    <p class="kicker">{de ? 'Für Schulen & Gruppen' : 'For schools & groups'}</p>
    <h1>{de ? 'Militärbasen verstehen – Unterrichtsmaterial' : 'Understanding military bases – teaching material'}</h1>
    <p class="lead">
      {de
        ? 'Fünf Bausteine für Geografie, Politik und Geschichte ab Klasse 9 sowie für Jugendgruppen. Alle Aufgaben lassen sich mit VisualBases im Browser lösen – ohne Anmeldung, ohne Tracking.'
        : 'Five modules for geography, politics and history (age 14+) and youth groups. All tasks can be solved with VisualBases in the browser – no login, no tracking.'}
    </p>
    <div class="row no-print">
      <button class="btn btn-primary" onclick={() => print()}>🖨 {de ? 'Arbeitsblatt drucken' : 'Print worksheet'}</button>
      <a class="btn" href={href('/quiz')}>❓ {de ? 'Quiz als Einstieg' : 'Quiz as warm-up'}</a>
    </div>
  </header>

  <aside class="note card">
    <b>{de ? 'Hinweis für Lehrkräfte' : 'Note for teachers'}</b>
    <p>
      {de
        ? 'VisualBases ist ein Projekt aus der Friedensbewegung. Im Sinne des Beutelsbacher Konsenses sollten die Positionen von Regierungen, Bündnissen und Militär gleichberechtigt einbezogen werden (Kontroversitätsgebot); die Schülerinnen und Schüler sollen sich ein eigenes Urteil bilden (Überwältigungsverbot). Baustein 4 und 5 sind dafür gedacht.'
        : 'VisualBases comes from the peace movement. Positions of governments, alliances and the military should be included on equal terms; learners should form their own judgement. Modules 4 and 5 are designed for this.'}
    </p>
  </aside>

  <ol class="tasks">
    {#each tasks as task, i}
      <li class="task card">
        <div class="thead">
          <span class="n">{i + 1}</span>
          <h2>{task.t}</h2>
          <span class="min">~{task.min} min</span>
        </div>
        <ol class="steps">
          {#each task.steps as st}<li>{st}</li>{/each}
        </ol>
        <a class="link no-print" href={href(task.link)}>{de ? 'Passende Seite öffnen' : 'Open matching page'} →</a>
        <div class="lines print-only" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      </li>
    {/each}
  </ol>

  <p class="foot">{de ? 'Material frei nutzbar für Bildungszwecke · Quelle: VisualBases' : 'Free to use for education · Source: VisualBases'} · {location.host}{location.pathname.replace(/index\.html$/, '')}</p>
</div>

<style>
  .school { padding: calc(var(--header-h) + 48px) 0 64px; max-width: 900px; }
  h1 { font-size: clamp(1.8rem, 4.2vw, 2.8rem); font-weight: 800; }
  .lead { color: var(--text-2); }
  .row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
  .note { padding: 16px 20px; margin: 28px 0; border-left: 3px solid var(--c-shared); }
  .note p { color: var(--text-2); font-size: 0.92rem; margin: 6px 0 0; }
  .tasks { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px; }
  .task { padding: 20px 22px; }
  .thead { display: flex; align-items: baseline; gap: 12px; }
  .n { width: 32px; height: 32px; flex: none; border-radius: 50%; display: grid; place-items: center; background: var(--accent-strong); font-weight: 800; align-self: center; }
  h2 { font-size: 1.2rem; margin: 0; flex: 1; }
  .min { color: var(--muted); font-size: 0.85rem; white-space: nowrap; }
  .steps { margin: 12px 0 10px; padding-left: 1.3em; color: var(--text-2); display: grid; gap: 6px; }
  .link { font-weight: 600; }
  .foot { color: var(--muted); font-size: 0.82rem; margin-top: 24px; }
  .print-only { display: none; }

  @media print {
    :global(.site-header), :global(.site-footer), .no-print { display: none !important; }
    :global(body) { background: #fff !important; color: #000 !important; }
    .school { padding: 0; max-width: none; }
    .lead, .note p, .steps, .min, .foot { color: #222 !important; }
    .card { background: #fff !important; border: 1px solid #999 !important; break-inside: avoid; }
    .n { background: #000 !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-only { display: grid; gap: 22px; margin-top: 14px; }
    .print-only span { border-bottom: 1px solid #999; height: 1px; }
  }
</style>
