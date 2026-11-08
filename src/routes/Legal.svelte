<script lang="ts">
  import { t, i18n } from '../lib/i18n.svelte';
  import { href } from '../lib/router.svelte';
  import { IMPRINT, missingImprintFields } from '../lib/legal';
  import { REPO_URL } from '../lib/github';

  let { page }: { page: 'impressum' | 'datenschutz' } = $props();

  const missing = $derived(missingImprintFields());
  const de = $derived(i18n.lang === 'de');

  /**
   * Privacy statement. Describes what the app actually does (checked against the code, 2026-11-08):
   * no cookies, no tracking, fonts and world map bundled; external requests only on user action.
   * Keep it in step with docs/DATA-SOURCES.md, section 2.
   */
  const privacy = $derived(de ? [
    { h: 'Kurz gesagt', p: ['VisualBases setzt keine Cookies, verwendet kein Tracking und keine Analysedienste und bindet keine Inhalte von Google, Facebook o. Ä. ein. Schriften und Weltkarte werden mit der Seite ausgeliefert. Externe Dienste werden nur aufgerufen, wenn du es auslöst (Satellitenbilder, Ortssuche).'] },
    { h: 'Verantwortliche Stelle', p: ['Verantwortlich im Sinne der DSGVO ist die im Impressum genannte Stelle.'] },
    { h: 'Hosting (GitHub Pages)', p: [
      'Die Seite wird über GitHub Pages ausgeliefert (GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA). Beim Aufruf verarbeitet GitHub technisch notwendige Zugriffsdaten (u. a. IP-Adresse, Zeitpunkt, aufgerufene Datei, Browserkennung), um die Seite auszuliefern und vor Angriffen zu schützen. Dabei können Daten in die USA übermittelt werden. Wir selbst erhalten diese Daten nicht.',
      'Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer sicheren, verfügbaren Website). Einzelheiten: Datenschutzerklärung von GitHub.',
    ], link: { url: 'https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement', label: 'GitHub General Privacy Statement' } },
    { h: 'Speicherung auf deinem Gerät', p: [
      'Einige Einstellungen werden nur auf deinem Gerät gespeichert (localStorage bzw. sessionStorage) und nie übertragen: Sprache, Satellitenansicht an/aus, das zuletzt gewählte Land in „Deine Basis“, Ergebnisse der Ortssuche für die laufende Sitzung und ein Zeitstempel, der Neuladeschleifen verhindert. Für die Offline-Nutzung legt der Browser Dateien der App in einem lokalen Zwischenspeicher ab. Du kannst all das in den Browser-Einstellungen löschen.',
      'Wenn du in „Deine Basis“ deinen Standort verwendest, wird er nur auf deinem Gerät verarbeitet und nicht übertragen.',
    ] },
    { h: 'Satellitenbilder (EOX)', p: ['Nur wenn du die Satellitenansicht einschaltest, lädt dein Browser Kartenkacheln von EOX IT Services GmbH (Schloßhofer Straße 4, 1210 Wien, Österreich). Dabei wird deine IP-Adresse an EOX übermittelt. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Darstellung der gewünschten Ansicht).'] },
    { h: 'Ortssuche (OpenStreetMap Nominatim)', p: ['Nur wenn du in „Deine Basis“ eine Suche absendest, wird der eingegebene Text zusammen mit deiner IP-Adresse an den Dienst Nominatim der OpenStreetMap Foundation (St John’s Innovation Centre, Cowley Road, Cambridge, CB4 0WS, Vereinigtes Königreich) gesendet. Für das Vereinigte Königreich besteht ein Angemessenheitsbeschluss der EU-Kommission. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.'], link: { url: 'https://osmfoundation.org/wiki/Privacy_Policy', label: 'OSMF Privacy Policy' } },
    { h: 'Hinweise, Korrekturen und E-Mail', p: ['Hinweise über die Formulare werden als öffentliche GitHub-Issues gespeichert; dafür gelten die Bedingungen von GitHub. Wenn du uns eine E-Mail schreibst, verwenden wir deine Angaben nur, um deine Nachricht zu bearbeiten (Art. 6 Abs. 1 lit. f DSGVO), und löschen sie, wenn sie dafür nicht mehr nötig sind.'] },
    { h: 'Links zu anderen Seiten', p: ['Links zu Quellen (z. B. Wikipedia, Ministerien, Medien, visualbases.org) werden erst beim Anklicken aufgerufen; dann gelten die Datenschutzbestimmungen der jeweiligen Seite.'] },
    { h: 'Deine Rechte', p: ['Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO). Da wir selbst keine personenbezogenen Daten über die Nutzung der Seite speichern, betreffen diese Rechte vor allem E-Mails und die Verarbeitung durch die genannten Dienste.'] },
  ] : [
    { h: 'In short', p: ['VisualBases sets no cookies, uses no tracking or analytics and embeds no content from Google, Facebook or similar. Fonts and the world map ship with the site. External services are only contacted when you trigger it (satellite images, place search).'] },
    { h: 'Controller', p: ['The controller under the GDPR is the body named in the legal notice (Impressum).'] },
    { h: 'Hosting (GitHub Pages)', p: [
      'The site is served by GitHub Pages (GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA). When you visit it, GitHub processes technically necessary access data (e.g. IP address, time, requested file, browser identifier) to deliver the site and protect it against attacks. Data may be transferred to the USA. We do not receive these data ourselves.',
      'Legal basis is Art. 6(1)(f) GDPR (legitimate interest in a secure, available website). Details: GitHub’s privacy statement.',
    ], link: { url: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement', label: 'GitHub General Privacy Statement' } },
    { h: 'Storage on your device', p: [
      'Some settings are stored only on your device (localStorage or sessionStorage) and never transmitted: language, satellite view on/off, the country last chosen in “Your base”, place search results for the current session and a timestamp that prevents reload loops. For offline use the browser keeps the app’s files in a local cache. You can delete all of this in your browser settings.',
      'If you use your location in “Your base”, it is processed on your device only and never transmitted.',
    ] },
    { h: 'Satellite images (EOX)', p: ['Only if you switch on the satellite view, your browser loads map tiles from EOX IT Services GmbH (Schloßhofer Straße 4, 1210 Vienna, Austria). Your IP address is transmitted to EOX. Legal basis: Art. 6(1)(f) GDPR (showing the view you asked for).'] },
    { h: 'Place search (OpenStreetMap Nominatim)', p: ['Only if you submit a search in “Your base”, the text you entered is sent together with your IP address to the Nominatim service of the OpenStreetMap Foundation (St John’s Innovation Centre, Cowley Road, Cambridge, CB4 0WS, United Kingdom). The EU Commission has issued an adequacy decision for the United Kingdom. Legal basis: Art. 6(1)(f) GDPR.'], link: { url: 'https://osmfoundation.org/wiki/Privacy_Policy', label: 'OSMF Privacy Policy' } },
    { h: 'Hints, corrections and e-mail', p: ['Hints sent via the forms are stored as public GitHub issues; GitHub’s terms apply. If you e-mail us, we use your details only to handle your message (Art. 6(1)(f) GDPR) and delete them when they are no longer needed for that.'] },
    { h: 'Links to other sites', p: ['Links to sources (e.g. Wikipedia, ministries, media, visualbases.org) are only opened when you click them; the privacy terms of that site then apply.'] },
    { h: 'Your rights', p: ['You have the right of access, rectification, erasure, restriction of processing, data portability and objection (Art. 15–21 GDPR) and the right to lodge a complaint with a data protection supervisory authority (Art. 77 GDPR). As we do not store personal data about the use of the site ourselves, these rights mainly concern e-mails and the processing by the services named above.'] },
  ]);
</script>

<div class="legal container">
  {#if page === 'impressum'}
    <header>
      <p class="kicker">{t('nav.imprint')}</p>
      <h1>{de ? 'Impressum' : 'Legal notice (Impressum)'}</h1>
    </header>
    <section class="text">
      {#if missing.length}
        <p class="pending" role="note">{de ? 'Die Angaben zur verantwortlichen Stelle werden derzeit ergänzt.' : 'The details of the responsible body are being completed.'}</p>
      {/if}
      {#if IMPRINT.name}
        <h2>{de ? 'Angaben gemäß § 5 DDG' : 'Information according to § 5 DDG'}</h2>
        <p>{IMPRINT.name}{#each IMPRINT.address as line}<br />{line}{/each}</p>
        {#if IMPRINT.representedBy}<p>{de ? 'Vertreten durch' : 'Represented by'}: {IMPRINT.representedBy}</p>{/if}
        {#if IMPRINT.register}<p>{IMPRINT.register}</p>{/if}
      {/if}
      <h2>{de ? 'Kontakt' : 'Contact'}</h2>
      <p>E-Mail: <a href="mailto:{IMPRINT.email}">{IMPRINT.email}</a></p>
      {#if IMPRINT.responsibleForContent}
        <h2>{de ? 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV' : 'Responsible for the content (§ 18 (2) MStV)'}</h2>
        <p>{IMPRINT.responsibleForContent}</p>
      {/if}
      <h2>{de ? 'Daten, Quellen und Lizenzen' : 'Data, sources and licences'}</h2>
      <p>{de
        ? 'Die Standortdaten stammen von visualbases.org (Karl-Heinz Peil, Friedens- und Zukunftswerkstatt e. V.) und stehen unter CC BY 4.0. Herkunft, Prüfung und Korrekturen beschreibt die Seite'
        : 'The site data come from visualbases.org (Karl-Heinz Peil, Friedens- und Zukunftswerkstatt e. V.) and are licensed CC BY 4.0. Origin, checks and corrections are described on the page'}
        <a href={href('/quality')}>{t('quality.title')}</a>.
        {de ? 'Bildnachweise stehen jeweils am Bild.' : 'Image credits are shown with each image.'}</p>
      <h2>{de ? 'Haftung für Links' : 'Liability for links'}</h2>
      <p>{de
        ? 'Die Seite verweist auf Quellen Dritter. Für deren Inhalte sind ausschließlich die jeweiligen Anbieter verantwortlich. Bei Bekanntwerden von Rechtsverletzungen entfernen wir solche Links umgehend.'
        : 'The site links to third-party sources. Their providers alone are responsible for their content. We remove such links as soon as we become aware of an infringement.'}</p>
      <p class="small"><a href={href('/datenschutz')}>{t('nav.privacy')}</a> · <a href={REPO_URL} target="_blank" rel="noopener">GitHub</a></p>
    </section>
  {:else}
    <header>
      <p class="kicker">{t('nav.privacy')}</p>
      <h1>{de ? 'Datenschutzerklärung' : 'Privacy statement'}</h1>
    </header>
    <section class="text">
      {#each privacy as s (s.h)}
        <h2>{s.h}</h2>
        {#each s.p as p}<p>{p}</p>{/each}
        {#if s.link}<p class="small"><a href={s.link.url} target="_blank" rel="noopener">{s.link.label} ↗</a></p>{/if}
      {/each}
      <p class="small">{de ? 'Stand' : 'As of'}: 2026-11-08 · <a href={href('/impressum')}>{t('nav.imprint')}</a></p>
    </section>
  {/if}
</div>

<style>
  .legal { padding: calc(var(--header-h) + 48px) 0 64px; }
  h1 { font-size: clamp(1.9rem, 4.5vw, 3rem); font-weight: 800; }
  .text { max-width: 760px; margin-top: 24px; }
  .text h2 { font-size: 1.2rem; margin-top: 1.6em; }
  .text p { color: var(--text-2); }
  .small { color: var(--muted); font-size: 0.85rem; }
  .pending { border-left: 3px solid var(--accent); padding: 8px 12px; color: var(--text); }
</style>
