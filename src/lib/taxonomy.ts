/**
 * VisualBases classification model (taxonomy v2) – the single source of truth for all
 * category IDs, their German/English labels and definitions.
 *
 * Used by the app, the build scripts (import, validation, prerender) and the tests.
 * Plain TypeScript without enums so that Node can load it directly (type stripping).
 * The model is documented in docs/TAXONOMY.md.
 *
 * Dimensions (each answers one question):
 *   siteType      What kind of site is it?                       one value
 *   status        Is it in operation?                            one value
 *   host          On whose territory is it?                      country (+ territory)
 *   presences     Which states maintain a military presence?     0..n (nation + role)
 *   organisations Which organisations co-use it?                 0..n
 *   features      Infrastructure, used civilian infrastructure,  0..n
 *                 military functions, strategic arrangements
 *   themes        Political, social, ecological topics           0..n
 *   activities    Operations, exercises, missions                0..n
 */

export type Lang = 'de' | 'en';
export type L = { de: string; en: string };

export interface Term<Id extends string = string> {
  id: Id;
  label: L;
  /** definition / delimitation, shown in the profile and on "About & data" */
  info?: L;
  icon?: string;
}

/* ------------------------------------------------------------------ site type */

export type SiteType =
  | 'foreign-base'
  | 'overseas-base'
  | 'shared-base'
  | 'host-base-foreign-use'
  | 'domestic-global'
  | 'special-facility'
  | 'military-base'
  | 'civilian-site'
  | 'garrison'
  | 'region-cluster'
  | 'unspecified';

/** map colour groups – only three hues plus grey and a ring (identity never relies on colour alone) */
export type ColorGroup = 'foreign' | 'shared' | 'other' | 'closed' | 'aggregate';

export interface SiteTypeTerm extends Term<SiteType> {
  /** class of record: a single military site, a civilian site, a summary entry, or unknown */
  class: 'military' | 'civilian' | 'aggregate' | 'unknown';
  color: Exclude<ColorGroup, 'closed'>;
}

export const SITE_TYPES: SiteTypeTerm[] = [
  {
    id: 'foreign-base', class: 'military', color: 'foreign',
    label: { de: 'Ausländische Militärbasis', en: 'Foreign military base' },
    info: {
      de: 'Wird überwiegend von den Streitkräften eines anderen Staates betrieben und genutzt.',
      en: 'Operated and used mainly by the armed forces of another state.',
    },
  },
  {
    id: 'overseas-base', class: 'military', color: 'foreign',
    label: { de: 'Basis im eigenen Überseegebiet', en: 'Base in own overseas territory' },
    info: {
      de: 'Vom Stationierungsstaat betrieben, aber in einem eigenen Gebiet außerhalb des Kernlands (z. B. Guam, Martinique). Kein Gastland im engeren Sinn.',
      en: 'Operated by the stationing state in one of its own territories outside the mainland (e.g. Guam, Martinique). No host country in the narrow sense.',
    },
  },
  {
    id: 'shared-base', class: 'military', color: 'shared',
    label: { de: 'Gemeinsam genutzte Basis', en: 'Shared base' },
    info: {
      de: 'Vom Gastland betrieben, mit dauerhaft stationierten ausländischen Truppen oder Anlagen.',
      en: 'Run by the host country, with permanently deployed foreign troops or installations.',
    },
  },
  {
    id: 'host-base-foreign-use', class: 'military', color: 'other',
    label: { de: 'Nationale Basis mit ausländischer Nutzung', en: 'National base with foreign use' },
    info: {
      de: 'Basis des Gastlands, die zeitweise von ausländischen Streitkräften genutzt wird, z. B. für Übungen oder über Zugangsabkommen.',
      en: 'Base of the host country used temporarily by foreign forces, e.g. for exercises or under access agreements.',
    },
  },
  {
    id: 'domestic-global', class: 'military', color: 'other',
    label: { de: 'Inländische Basis mit globaler Funktion', en: 'Domestic base with global role' },
    info: {
      de: 'Standort auf dem eigenen Staatsgebiet des Betreibers (bisher nur USA), der eine Rolle im weltweiten Netz spielt (Raketenabwehr, Radar, Drohnen, Fernmeldewesen). Kontext-Standort: keine ausländische Präsenz.',
      en: 'Site on the operator’s own national territory (so far only the US) with a role in the global network (missile defence, radar, drones, communications). Context site: no foreign presence.',
    },
  },
  {
    id: 'special-facility', class: 'military', color: 'other',
    label: { de: 'Militärische Sondereinrichtung', en: 'Special military facility' },
    info: {
      de: 'Einzelne Anlage mit besonderer Funktion, oft Teil eines größeren Standorts (z. B. Bodenstation, Munitionslager, Lazarett).',
      en: 'Single installation with a special function, often part of a larger site (e.g. ground station, ammunition storage, hospital).',
    },
  },
  {
    id: 'military-base', class: 'military', color: 'other',
    label: { de: 'Militärbasis (Nutzungsform nicht angegeben)', en: 'Military base (form of use not specified)' },
    info: {
      de: 'Die Quelle nennt den Ort nur als (geschlossene) Basis, ohne anzugeben, wer ihn betrieben hat. Die Nutzungsform muss noch bestimmt werden.',
      en: 'The source lists the site only as a (closed) base without saying who operated it. The form of use still has to be determined.',
    },
  },
  {
    id: 'civilian-site', class: 'civilian', color: 'other',
    label: { de: 'Ziviler Standort mit Militärnutzung', en: 'Civilian site with military use' },
    info: {
      de: 'Offiziell zivile Einrichtung (meist Flughafen oder Hafen), die von ausländischen Streitkräften genutzt wird. Keine Militärbasis.',
      en: 'Officially civilian facility (mostly an airport or port) used by foreign forces. Not a military base.',
    },
  },
  {
    id: 'garrison', class: 'aggregate', color: 'aggregate',
    label: { de: 'Garnison / Militär-Community', en: 'Garrison / military community' },
    info: {
      de: 'Sammeleintrag (Σ): Verwaltungseinheit, die mehrere Standorte zusammenfasst (z. B. U.S. Army Garrison). Keine einzelne Basis.',
      en: 'Summary entry (Σ): administrative unit grouping several sites (e.g. a U.S. Army Garrison). Not a single base.',
    },
  },
  {
    id: 'region-cluster', class: 'aggregate', color: 'aggregate',
    label: { de: 'Regionaler Sammeleintrag', en: 'Regional summary entry' },
    info: {
      de: 'Sammeleintrag (Σ) für mehrere Standorte einer Insel, Stadt oder Region (z. B. Okinawa, Dschibuti) oder eine Übersicht.',
      en: 'Summary entry (Σ) for several sites on one island, in one city or region (e.g. Okinawa, Djibouti) or an overview.',
    },
  },
  {
    id: 'unspecified', class: 'unknown', color: 'other',
    label: { de: 'Nicht näher bestimmter Ort', en: 'Unspecified site' },
    info: {
      de: 'Die Art des Standorts ist in der Quelle nicht angegeben oder nicht eindeutig.',
      en: 'The source does not state the kind of site, or it is ambiguous.',
    },
  },
];

/* ------------------------------------------------------------------ status */

export type Status = 'active' | 'closed' | 'unknown';

export const STATUSES: Term<Status>[] = [
  {
    id: 'active',
    label: { de: 'In Betrieb', en: 'In operation' },
    info: { de: 'Nicht als geschlossen bekannt.', en: 'Not known to be closed.' },
  },
  {
    id: 'closed',
    label: { de: 'Geschlossen / ehemalig', en: 'Closed / former' },
    info: {
      de: 'Die militärische Nutzung durch die genannten Staaten ist beendet. Der Ort kann weiter militärisch genutzt werden (z. B. vom Gastland) oder reaktivierbar sein.',
      en: 'Military use by the states listed has ended. The site may still be used by the military (e.g. by the host country) or could be reactivated.',
    },
  },
  {
    id: 'unknown',
    label: { de: 'Status unklar', en: 'Status unclear' },
    info: { de: 'Ob der Standort noch genutzt wird, ist nicht belegt.', en: 'Whether the site is still in use is not documented.' },
  },
];

/* ------------------------------------------------------------------ presences */

export type PresenceRole = 'stationing' | 'co-user';
/** how the presence was derived from the source (see docs/TAXONOMY.md, "Herkunft") */
export type PresenceVia = 'tag' | 'bsr' | 'us-posture' | 'site-type' | 'claim';
/** form of a presence (docs/TAXONOMY.md, "Präsenzart"); not stated = no value, never guessed */
export type PresenceForm = 'permanent' | 'rotational' | 'access' | 'exercise' | 'joint' | 'historical' | 'planned';
/** where the form comes from: a correction with source, or derived from the status "closed" of the site */
export type PresenceFormVia = 'claim' | 'status';
/** relation between the present state and the territory – computed, never stored */
export type Relation = 'foreign' | 'own-territory' | 'domestic';

export const PRESENCE_ROLES: Term<PresenceRole>[] = [
  { id: 'stationing', label: { de: 'Stationierungsnation', en: 'Stationing nation' }, info: { de: 'Staat, der dort militärisch präsent ist.', en: 'State with a military presence at the site.' } },
  { id: 'co-user', label: { de: 'Mitnutzer', en: 'Co-user' }, info: { de: 'Weiterer Staat, der den Standort mitnutzt.', en: 'Further state that co-uses the site.' } },
];

export const PRESENCE_FORMS: Term<PresenceForm>[] = [
  { id: 'permanent', label: { de: 'Feste Stationierung', en: 'Permanent stationing' }, info: { de: 'Dauerhaft dort stationierte Einheiten oder Personal des Staates.', en: 'Units or personnel of the state permanently stationed at the site.' } },
  { id: 'rotational', label: { de: 'Rotation', en: 'Rotational presence' }, info: { de: 'Wiederkehrende, zeitlich begrenzte Verlegungen (z. B. sechsmonatige Rotationen), keine dauerhaft stationierte Einheit.', en: 'Recurring, time-limited deployments (e.g. six-month rotations), no permanently stationed unit.' } },
  { id: 'access', label: { de: 'Zugangsrecht', en: 'Access rights' }, info: { de: 'Zugangs- und Nutzungsrechte aus einem Abkommen (z. B. DCA); kein Beleg für eine dauerhafte Stationierung.', en: 'Access and use rights under an agreement (e.g. a DCA); not evidence of permanent stationing.' } },
  { id: 'exercise', label: { de: 'Übung', en: 'Exercise use' }, info: { de: 'Nutzung für Übungen oder Manöver, ohne dauerhaft stationierte Kräfte.', en: 'Use for exercises or manoeuvres, without permanently stationed forces.' } },
  { id: 'joint', label: { de: 'Gemeinsam betrieben', en: 'Jointly operated' }, info: { de: 'Anlage, die der Staat gemeinsam mit dem Gastland betreibt.', en: 'Facility operated by the state jointly with the host country.' } },
  { id: 'historical', label: { de: 'Historisch', en: 'Historical' }, info: { de: 'Die Präsenz dieses Staates ist beendet.', en: 'The presence of this state has ended.' } },
  { id: 'planned', label: { de: 'Geplant / im Aufbau', en: 'Planned / under construction' }, info: { de: 'Angekündigt oder im Bau, noch keine belegte Präsenz.', en: 'Announced or under construction, no documented presence yet.' } },
];

export const PRESENCE_FORM_VIA: Term<PresenceFormVia>[] = [
  { id: 'claim', label: { de: 'Korrektur mit Quelle', en: 'correction with source' } },
  { id: 'status', label: { de: 'abgeleitet: Standort geschlossen', en: 'derived: site closed' } },
];

export const RELATIONS: Term<Relation>[] = [
  { id: 'foreign', label: { de: 'im Ausland', en: 'abroad' } },
  { id: 'own-territory', label: { de: 'eigenes Überseegebiet', en: 'own overseas territory' } },
  { id: 'domestic', label: { de: 'eigenes Staatsgebiet', en: 'own national territory' } },
];

export const PRESENCE_VIA: Term<PresenceVia>[] = [
  { id: 'tag', label: { de: 'Angabe von visualbases.org', en: 'stated by visualbases.org' } },
  { id: 'bsr', label: { de: 'abgeleitet: im Pentagon-Bericht (BSR) gelistet', en: 'derived: listed in the Pentagon report (BSR)' } },
  { id: 'us-posture', label: { de: 'abgeleitet: US-Stationierungskategorie', en: 'derived: US posture category' } },
  { id: 'site-type', label: { de: 'abgeleitet: Kategorie „USA Global Base“', en: 'derived: category “USA Global Base”' } },
  { id: 'claim', label: { de: 'Korrektur mit Quelle', en: 'correction with source' } },
];

/* ------------------------------------------------------------------ organisations */

export type Organisation = 'nato' | 'eu' | 'un';

export const ORGANISATIONS: Term<Organisation>[] = [
  { id: 'nato', label: { de: 'NATO', en: 'NATO' }, info: { de: 'Militärbündnis; Standort wird von der NATO oder im NATO-Rahmen mitgenutzt.', en: 'Military alliance; the site is co-used by NATO or within the NATO framework.' } },
  { id: 'eu', label: { de: 'EU', en: 'EU' }, info: { de: 'Europäische Union; Standort wird für EU-Missionen mitgenutzt.', en: 'European Union; the site is co-used for EU missions.' } },
  { id: 'un', label: { de: 'Vereinte Nationen', en: 'United Nations' }, info: { de: 'Internationale Organisation; Träger von UN-Missionen.', en: 'International organisation; mandates UN missions.' } },
];

/* ------------------------------------------------------------------ features */

export type FeatureKind = 'infrastructure' | 'civil-use' | 'function' | 'arrangement';
export type Feature =
  | 'airfield' | 'helipad' | 'naval-port' | 'training-area' | 'depot' | 'laboratory' | 'telecom-station' | 'radar-station'
  | 'civil-airport-use' | 'civil-port-use'
  | 'command' | 'missile-defence' | 'signals-intelligence'
  | 'nuclear-sharing';

export interface FeatureTerm extends Term<Feature> { kind: FeatureKind; icon: string }

export const FEATURE_KINDS: Term<FeatureKind>[] = [
  { id: 'infrastructure', label: { de: 'Physische Einrichtungen', en: 'Physical facilities' } },
  { id: 'civil-use', label: { de: 'Genutzte zivile Infrastruktur', en: 'Civilian infrastructure used' } },
  { id: 'function', label: { de: 'Militärische Funktionen', en: 'Military functions' } },
  { id: 'arrangement', label: { de: 'Strategische Arrangements', en: 'Strategic arrangements' } },
];

export const FEATURES: FeatureTerm[] = [
  { id: 'airfield', kind: 'infrastructure', icon: '✈', label: { de: 'Militärflugplatz', en: 'Military airfield' }, info: { de: 'Start- und Landebahn für Flugzeuge.', en: 'Runway for fixed-wing aircraft.' } },
  { id: 'helipad', kind: 'infrastructure', icon: 'Ⓗ', label: { de: 'Hubschrauberlandeplatz', en: 'Helipad' }, info: { de: 'Landeplatz für Hubschrauber.', en: 'Landing site for helicopters.' } },
  { id: 'naval-port', kind: 'infrastructure', icon: '⚓', label: { de: 'Marinehafen', en: 'Naval port' }, info: { de: 'Militärische Hafenanlage.', en: 'Military port facility.' } },
  { id: 'training-area', kind: 'infrastructure', icon: '⛺', label: { de: 'Übungsplatz', en: 'Training area' }, info: { de: 'Truppenübungsplatz oder Schießplatz.', en: 'Military training or firing range.' } },
  { id: 'depot', kind: 'infrastructure', icon: '▦', label: { de: 'Depot / Lager', en: 'Depot / storage' }, info: { de: 'Lager für Material, Munition oder Treibstoff.', en: 'Storage for materiel, ammunition or fuel.' } },
  { id: 'laboratory', kind: 'infrastructure', icon: '⚗', label: { de: 'Labor', en: 'Laboratory' }, info: { de: 'Militärisches Forschungs- oder Testlabor.', en: 'Military research or test laboratory.' } },
  { id: 'telecom-station', kind: 'infrastructure', icon: '📡', label: { de: 'Fernmeldeanlage', en: 'Telecommunications station' }, info: { de: 'Funk-, Satelliten- oder Relaisanlage. Nicht automatisch eine Abhörstation.', en: 'Radio, satellite or relay installation. Not automatically a listening station.' } },
  { id: 'radar-station', kind: 'infrastructure', icon: '◠', label: { de: 'Radaranlage', en: 'Radar station' }, info: { de: 'Radaranlage, z. B. zur Luftraumüberwachung oder Frühwarnung (laut Quelle „Radar station“).', en: 'Radar installation, e.g. for air surveillance or early warning (“radar station” in the source).' } },
  { id: 'civil-airport-use', kind: 'civil-use', icon: '✈︎', label: { de: 'Nutzung eines zivilen Flughafens', en: 'Use of a civilian airport' }, info: { de: 'Ausländische Streitkräfte nutzen einen zivilen Flughafen mit; keine eigene militärische Infrastruktur nötig.', en: 'Foreign forces use a civilian airport; no own military infrastructure required.' } },
  { id: 'civil-port-use', kind: 'civil-use', icon: '⛴', label: { de: 'Nutzung eines zivilen Hafens', en: 'Use of a civilian port' }, info: { de: 'Ausländische Streitkräfte nutzen einen zivilen Hafen mit.', en: 'Foreign forces use a civilian port.' } },
  { id: 'command', kind: 'function', icon: '◎', label: { de: 'Kommando und Führung', en: 'Command and control' }, info: { de: 'Hauptquartier oder Kommandozentrale.', en: 'Headquarters or command centre.' } },
  { id: 'missile-defence', kind: 'function', icon: '⇡', label: { de: 'Raketenabwehr', en: 'Missile defence' }, info: { de: 'Teil eines Raketenabwehrsystems (Abfangraketen, Frühwarnradar oder Führung).', en: 'Part of a missile defence system (interceptors, early-warning radar or command).' } },
  { id: 'signals-intelligence', kind: 'function', icon: '👂', label: { de: 'Fernmeldeaufklärung / Abhören', en: 'Signals intelligence / listening' }, info: { de: 'Abhören und Auswerten von Kommunikation (laut Quelle „Listening station“).', en: 'Interception and analysis of communications (“listening station” in the source).' } },
  { id: 'nuclear-sharing', kind: 'arrangement', icon: '☢', label: { de: 'Nukleare Teilhabe', en: 'Nuclear sharing' }, info: { de: 'Standort im Rahmen der nuklearen Teilhabe der NATO (US-Atomwaffen für Trägersysteme von Verbündeten bzw. deren Lagerung). Offiziell nicht bestätigt.', en: 'Site within NATO nuclear sharing (US nuclear weapons for allied delivery systems or their storage). Not officially confirmed.' } },
];

/* ------------------------------------------------------------------ themes */

export type Theme = 'resistance' | 'drone-warfare' | 'environment';

export const THEMES: Term<Theme>[] = [
  { id: 'resistance', icon: '✊', label: { de: 'Widerstand und Protest', en: 'Resistance and protest' }, info: { de: 'Lokale Kampagnen und Friedensbewegung gegen den Standort.', en: 'Local campaigns and peace movement against the site.' } },
  { id: 'drone-warfare', icon: '🛩', label: { de: 'Drohnenkrieg', en: 'Drone warfare' }, info: { de: 'Beteiligung an bewaffneten Drohneneinsätzen (Start, Steuerung, Relais).', en: 'Involvement in armed drone operations (launch, control, relay).' } },
  { id: 'environment', icon: '🌱', label: { de: 'Umweltfolgen', en: 'Environmental impact' }, info: { de: 'Belastung von Boden, Wasser, Luft oder Lärm; Altlasten.', en: 'Contamination of soil, water or air, noise; legacy pollution.' } },
];

/* ------------------------------------------------------------------ activities */

export type ActivityKind = 'operation' | 'exercise' | 'mission';
export type Activity = 'atlantic-resolve' | 'defender-europe-20' | 'defender-europe-21' | 'un-mission';
/** filterable group: a series of exercises or a single activity */
export type ActivityGroup = 'atlantic-resolve' | 'defender-europe' | 'un-mission';

export interface ActivityTerm extends Term<Activity> { kind: ActivityKind; group: ActivityGroup; organisation?: Organisation; year?: number }

export const ACTIVITY_KINDS: Term<ActivityKind>[] = [
  { id: 'operation', label: { de: 'Militärische Operation', en: 'Military operation' } },
  { id: 'exercise', label: { de: 'Übung / Manöver', en: 'Exercise' } },
  { id: 'mission', label: { de: 'Internationale Mission', en: 'International mission' } },
];

export const ACTIVITIES: ActivityTerm[] = [
  { id: 'atlantic-resolve', kind: 'operation', group: 'atlantic-resolve', label: { de: 'Operation Atlantic Resolve', en: 'Operation Atlantic Resolve' }, info: { de: 'US-Operation zur verstärkten, rotierenden Präsenz in Europa (seit 2014).', en: 'US operation for a reinforced, rotational presence in Europe (since 2014).' } },
  { id: 'defender-europe-20', kind: 'exercise', group: 'defender-europe', year: 2020, label: { de: 'DEFENDER-Europe 20', en: 'DEFENDER-Europe 20' } },
  { id: 'defender-europe-21', kind: 'exercise', group: 'defender-europe', year: 2021, label: { de: 'DEFENDER-Europe 21', en: 'DEFENDER-Europe 21' } },
  { id: 'un-mission', kind: 'mission', group: 'un-mission', organisation: 'un', label: { de: 'UN-Mission', en: 'UN mission' } },
];

export const ACTIVITY_GROUPS: (Term<ActivityGroup> & { kind: ActivityKind })[] = [
  { id: 'atlantic-resolve', kind: 'operation', label: { de: 'Operation Atlantic Resolve', en: 'Operation Atlantic Resolve' }, info: { de: 'US-Operation zur verstärkten, rotierenden Präsenz in Europa (seit 2014).', en: 'US operation for a reinforced, rotational presence in Europe (since 2014).' } },
  { id: 'defender-europe', kind: 'exercise', label: { de: 'Manöverserie DEFENDER-Europe', en: 'Exercise series DEFENDER-Europe' }, info: { de: 'US-geführte Großübungen in Europa.', en: 'US-led large-scale exercises in Europe.' } },
  { id: 'un-mission', kind: 'mission', label: { de: 'UN-Mission', en: 'UN mission' }, info: { de: 'Friedensmission im Auftrag der Vereinten Nationen.', en: 'Peace mission mandated by the United Nations.' } },
];

/* ------------------------------------------------------------------ geography */

export type Continent = 'europe' | 'asia' | 'africa' | 'america' | 'oceania' | 'atlantic';

export const CONTINENTS: Term<Continent>[] = [
  { id: 'europe', label: { de: 'Europa', en: 'Europe' } },
  { id: 'asia', label: { de: 'Asien', en: 'Asia' } },
  { id: 'africa', label: { de: 'Afrika', en: 'Africa' } },
  { id: 'america', label: { de: 'Amerika', en: 'Americas' } },
  { id: 'oceania', label: { de: 'Australien & Ozeanien', en: 'Australia & Oceania' } },
  { id: 'atlantic', label: { de: 'Atlantik', en: 'Atlantic' }, info: { de: 'Inseln im Atlantik (Kategorie von visualbases.org, kein Kontinent).', en: 'Atlantic islands (category of visualbases.org, not a continent).' } },
];

/**
 * Dependent territories with an own ISO 3166 code → sovereign state.
 * The host country of a site is always the sovereign state; the territory is kept separately.
 */
export const TERRITORY_SOVEREIGN: Record<string, string> = {
  PR: 'US', GU: 'US', VI: 'US', UM: 'US', MP: 'US', AS: 'US',
  GL: 'DK', FO: 'DK',
  AW: 'NL', CW: 'NL', SX: 'NL', BQ: 'NL',
  IO: 'GB', FK: 'GB', SH: 'GB', GI: 'GB', BM: 'GB', KY: 'GB', VG: 'GB', AI: 'GB', MS: 'GB', TC: 'GB', PN: 'GB', GS: 'GB',
  GF: 'FR', MQ: 'FR', GP: 'FR', RE: 'FR', YT: 'FR', PF: 'FR', NC: 'FR', PM: 'FR', WF: 'FR', BL: 'FR', MF: 'FR', TF: 'FR',
  NF: 'AU', CX: 'AU', CC: 'AU', HM: 'AU',
};

/* ------------------------------------------------------------------ other source fields */

export type UsPosture = 'MOB' | 'FOB' | 'FOS' | 'CSL';
export const US_POSTURES: Term<UsPosture>[] = [
  { id: 'MOB', label: { de: 'Main Operating Base', en: 'Main Operating Base' }, info: { de: 'Dauerhaft besetzte, gut geschützte Großbasis mit Luft- oder Seezugang.', en: 'Permanently manned, well-protected base with robust air or sea access.' } },
  { id: 'FOB', label: { de: 'Forward Operating Base', en: 'Forward Operating Base' }, info: { de: 'Vorgeschobene Basis zur Unterstützung von Einsätzen.', en: 'Forward base supporting operations.' } },
  { id: 'FOS', label: { de: 'Forward Operating Site / Location', en: 'Forward Operating Site / Location' }, info: { de: 'Kleine Basis mit Vorräten und wenig Stammpersonal, schnell ausbaubar.', en: 'Small base with pre-positioned equipment and little permanent staff, expandable.' } },
  { id: 'CSL', label: { de: 'Cooperative Security Location', en: 'Cooperative Security Location' }, info: { de: '„Lily Pad“ mit kaum Personal, vom Gastland betrieben, im Bedarfsfall nutzbar.', en: '“Lily pad” with little or no staff, run by the host nation, usable on demand.' } },
];

export type Listing = 'bsr' | 'bsr-multi' | 'wikipedia-list' | 'other-list';
export const LISTINGS: Term<Listing>[] = [
  { id: 'bsr', label: { de: 'Im Pentagon-Bericht (BSR) gelistet', en: 'Listed in the Pentagon report (BSR)' } },
  { id: 'bsr-multi', label: { de: 'Mit mehreren Einträgen im Pentagon-Bericht (BSR)', en: 'Several entries in the Pentagon report (BSR)' } },
  { id: 'wikipedia-list', label: { de: 'In einer Wikipedia-Liste geführt', en: 'Listed in a Wikipedia list' } },
  { id: 'other-list', label: { de: 'In einer anderen Liste geführt', en: 'Listed in another listing' } },
];

export type RelationType = 'part-of' | 'member-of' | 'related';
export const RELATION_TYPES: Term<RelationType | 'includes' | 'has-part'>[] = [
  { id: 'part-of', label: { de: 'Teil von', en: 'Part of' } },
  { id: 'has-part', label: { de: 'Umfasst die Einrichtung', en: 'Includes the facility' } },
  { id: 'member-of', label: { de: 'Gehört zu', en: 'Belongs to' } },
  { id: 'includes', label: { de: 'Umfasst', en: 'Includes' } },
  { id: 'related', label: { de: 'Siehe auch', en: 'See also' } },
];

/* ------------------------------------------------------------------ evidence */

/** state of evidence for one statement group – no numeric confidence scores */
export type EvidenceState = 'confirmed' | 'corrected' | 'disputed' | 'context' | 'unverified';
/** statement groups a source can support (same IDs as data/research) */
export type ClaimType = 'presence' | 'nation' | 'position' | 'status' | 'facility' | 'activity';

export const EVIDENCE_STATES: Term<EvidenceState>[] = [
  { id: 'confirmed', label: { de: 'belegt', en: 'documented' }, info: { de: 'Mindestens eine von Hand geprüfte Quelle stützt die Angabe.', en: 'At least one manually checked source supports the statement.' } },
  { id: 'corrected', label: { de: 'korrigiert', en: 'corrected' }, info: { de: 'Die Angabe von visualbases.org wurde anhand einer Quelle korrigiert.', en: 'The statement of visualbases.org was corrected based on a source.' } },
  { id: 'disputed', label: { de: 'umstritten', en: 'disputed' }, info: { de: 'Eine geprüfte Quelle widerspricht der Angabe.', en: 'A checked source contradicts the statement.' } },
  { id: 'context', label: { de: 'nur Kontext', en: 'context only' }, info: { de: 'Quellen sind relevant, belegen die Angabe aber nicht.', en: 'Sources are relevant but do not prove the statement.' } },
  { id: 'unverified', label: { de: 'ungeprüft', en: 'unverified' }, info: { de: 'Nur die Einordnung von visualbases.org, noch keine geprüfte Quelle.', en: 'Only the classification of visualbases.org, no checked source yet.' } },
];

/**
 * evidence level of a site as a whole (docs/TAXONOMY.md, "Belegstufe"), derived from the evidence on the
 * presence and the stationing nation and from the source links; strongest first
 */
export type SourceLevel = 'verified' | 'disputed' | 'context' | 'source-listed' | 'wikipedia-only' | 'none';
export const SOURCE_LEVELS: Term<SourceLevel>[] = [
  { id: 'verified', label: { de: 'geprüft belegt', en: 'checked source' }, info: { de: 'Eine von Hand geprüfte Quelle stützt die militärische Präsenz oder die Stationierungsnation, oder sie wurde anhand einer Quelle korrigiert.', en: 'A manually checked source supports the military presence or the stationing nation, or it was corrected based on a source.' } },
  { id: 'disputed', label: { de: 'umstritten', en: 'disputed' }, info: { de: 'Eine geprüfte Quelle widerspricht der Präsenz oder der Stationierungsnation, oder ein Korrekturvorschlag dazu ist offen.', en: 'A checked source contradicts the presence or the stationing nation, or a proposed correction is open.' } },
  { id: 'context', label: { de: 'nur Kontext', en: 'context only' }, info: { de: 'Es gibt von Hand geprüfte Quellen, aber keine belegt die Präsenz.', en: 'There are manually checked sources, but none documents the presence.' } },
  { id: 'source-listed', label: { de: 'Quelle von visualbases.org', en: 'source from visualbases.org' }, info: { de: 'visualbases.org nennt eine Quelle; sie ist noch nicht geprüft.', en: 'visualbases.org names a source; it has not been checked yet.' } },
  { id: 'wikipedia-only', label: { de: 'nur Wikipedia', en: 'Wikipedia only' }, info: { de: 'Einzige Quelle ist ein Wikipedia-Artikel.', en: 'The only source is a Wikipedia article.' } },
  { id: 'none', label: { de: 'ohne Beleg', en: 'no source' }, info: { de: 'Keine Quelle angegeben.', en: 'No source given.' } },
];
/** levels below which a site counts as "source wanted" (Mitmachen, Atlas) */
export const SOURCE_WANTED: SourceLevel[] = ['context', 'wikipedia-only', 'none'];

export const CLAIM_TYPES: Term<ClaimType>[] = [
  { id: 'presence', label: { de: 'Militärische Präsenz', en: 'Military presence' } },
  { id: 'nation', label: { de: 'Stationierungsnation', en: 'Stationing nation' } },
  { id: 'position', label: { de: 'Lage', en: 'Location' } },
  { id: 'status', label: { de: 'Status', en: 'Status' } },
  { id: 'facility', label: { de: 'Einrichtungen', en: 'Facilities' } },
  { id: 'activity', label: { de: 'Aktivitäten', en: 'Activities' } },
];

/** codes of review notes attached to a record (computed by scripts/lib/resolve.mjs) */
export type IssueCode =
  | 'multiple-site-types' | 'no-site-type' | 'site-type-from-status' | 'foreign-without-foreign-presence'
  | 'nation-missing' | 'continent-check' | 'review-on-origin' | 'position-unverified' | 'out-of-scope-candidate' | 'duplicate-entry';

export const ISSUES: Term<IssueCode>[] = [
  { id: 'multiple-site-types', label: { de: 'Mehrere Standorttypen in der Quelle', en: 'Several site types in the source' }, info: { de: 'Auf visualbases.org trägt der Beitrag mehrere sich ausschließende Standortarten; übernommen wurde eine.', en: 'On visualbases.org the post carries several mutually exclusive kinds; one was used.' } },
  { id: 'no-site-type', label: { de: 'Ohne Standorttyp in der Quelle', en: 'No site type in the source' } },
  { id: 'site-type-from-status', label: { de: 'Nutzungsform nach Schließung nicht angegeben', en: 'Form of use not given after closure' } },
  { id: 'foreign-without-foreign-presence', label: { de: 'Als ausländisch eingestuft, aber keine ausländische Präsenz', en: 'Classified as foreign, but no foreign presence' } },
  { id: 'nation-missing', label: { de: 'Keine Stationierungsnation angegeben', en: 'No stationing nation given' } },
  { id: 'continent-check', label: { de: 'Kontinent prüfen', en: 'Check continent' } },
  { id: 'review-on-origin', label: { de: 'Auf visualbases.org zur Prüfung markiert', en: 'Marked for review on visualbases.org' } },
  { id: 'position-unverified', label: { de: 'Position ungeprüft', en: 'Position unverified' } },
  { id: 'out-of-scope-candidate', label: { de: 'Gehört möglicherweise nicht in den Atlas', en: 'Possibly outside the atlas’ scope' } },
  { id: 'duplicate-entry', label: { de: 'Doppelter Eintrag', en: 'Duplicate entry' }, info: { de: 'Dieselbe Einrichtung ist auf visualbases.org ein zweites Mal erfasst; siehe Korrektur.', en: 'The same facility is listed a second time on visualbases.org; see correction.' } },
];

/* ------------------------------------------------------------------ review layer data/corrections.json */

/**
 * Status of an entry in data/corrections.json (docs/DATA-QUALITY.md):
 * proposed – doubtful, shown as "position unverified", data unchanged · applied – fixed (claim or at the source) ·
 * confirmed – checked by the editors and kept as it is (with source)
 */
export const POSITION_CHECK_STATUSES = ['proposed', 'applied', 'confirmed'] as const;
export type PositionCheckStatus = (typeof POSITION_CHECK_STATUSES)[number];

/** kind of position problem in data/corrections.json */
export const POSITION_ISSUES = [
  'duplicate-in-source', // same coordinates as another post on visualbases.org
  'copied-coordinates', // coordinates belong to another place
  'wrong-country', // coordinates and host country do not match
  'off-site', // reference point clearly beside the described facility
  'imprecise', // only a town or region is known
  'shared-site', // several records legitimately share one site (with confirmed)
] as const;
export type PositionIssue = (typeof POSITION_ISSUES)[number];

/**
 * how precisely a coordinate locates the facility: site – on the facility · reference – reference point from
 * the source's map link · town – town centre · region – region or island
 */
export const POSITION_PRECISIONS = ['site', 'reference', 'town', 'region'] as const;
export type PositionPrecision = (typeof POSITION_PRECISIONS)[number];

/* ------------------------------------------------------------------ helpers */

/** all vocabularies by dimension – used for validation and completeness tests */
export const VOCABULARIES = {
  siteType: SITE_TYPES, status: STATUSES, organisation: ORGANISATIONS, feature: FEATURES, featureKind: FEATURE_KINDS,
  theme: THEMES, activity: ACTIVITIES, activityGroup: ACTIVITY_GROUPS, activityKind: ACTIVITY_KINDS, continent: CONTINENTS,
  usPosture: US_POSTURES, listing: LISTINGS, presenceRole: PRESENCE_ROLES, presenceVia: PRESENCE_VIA, presenceForm: PRESENCE_FORMS, presenceFormVia: PRESENCE_FORM_VIA, relation: RELATIONS,
  relationType: RELATION_TYPES, evidence: EVIDENCE_STATES, sourceLevel: SOURCE_LEVELS, claimType: CLAIM_TYPES, issue: ISSUES,
} as const;
export type Dimension = keyof typeof VOCABULARIES;

export const ids = <T extends { id: string }>(list: readonly T[]) => list.map((x) => x.id);

const index = new Map<string, Map<string, Term>>();
/** term of a dimension by id (undefined if unknown) */
export function term(dim: Dimension, id: string): Term | undefined {
  let m = index.get(dim);
  if (!m) { m = new Map((VOCABULARIES[dim] as readonly Term[]).map((x) => [x.id, x])); index.set(dim, m); }
  return m.get(id);
}

/** label of a term in a language; falls back to the id so that a missing term is visible, not blank */
export function label(dim: Dimension, id: string, lang: Lang): string {
  return term(dim, id)?.label[lang] ?? id;
}

export function info(dim: Dimension, id: string, lang: Lang): string {
  return term(dim, id)?.info?.[lang] ?? '';
}

export const SITE_TYPE: Record<SiteType, SiteTypeTerm> = Object.fromEntries(SITE_TYPES.map((t) => [t.id, t])) as Record<SiteType, SiteTypeTerm>;
export const FEATURE: Record<Feature, FeatureTerm> = Object.fromEntries(FEATURES.map((t) => [t.id, t])) as Record<Feature, FeatureTerm>;
export const ACTIVITY: Record<Activity, ActivityTerm> = Object.fromEntries(ACTIVITIES.map((t) => [t.id, t])) as Record<Activity, ActivityTerm>;

export const GROUP_COLOR: Record<ColorGroup, string> = {
  foreign: '#e8692f',
  shared: '#3987e5',
  other: '#199e70',
  closed: '#8b93a7',
  aggregate: '#f2efe6',
};

/** map colour group of a record: closed sites are grey whatever their type */
export function colorGroup(b: { siteType: SiteType; status: Status }): ColorGroup {
  const c = SITE_TYPE[b.siteType]?.color ?? 'other';
  return b.status === 'closed' && c !== 'aggregate' ? 'closed' : c;
}

export const LEGEND_GROUPS: { id: ColorGroup; label: L }[] = [
  { id: 'foreign', label: { de: 'Ausländische Basis / Überseegebiet', en: 'Foreign / overseas base' } },
  { id: 'shared', label: { de: 'Gemeinsam genutzte Basis', en: 'Shared base' } },
  { id: 'other', label: { de: 'Sonstige Militärnutzung', en: 'Other military use' } },
  { id: 'closed', label: { de: 'Geschlossen / ehemalig', en: 'Closed / former' } },
  { id: 'aggregate', label: { de: 'Sammeleintrag (Garnison, Region)', en: 'Summary entry (garrison, region)' } },
];

/** flag emoji from an ISO alpha-2 code */
export function flag(cc: string | null | undefined): string {
  if (!cc || cc.length !== 2) return '🏳';
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

/**
 * Old (v1) filter values in shared links → new filter values. Keeps every atlas link that was
 * ever shared working (see data.ts queryToFilters).
 */
export const LEGACY_FILTERS: Record<string, Record<string, { key: 'kinds' | 'status' | 'facilities' | 'themes' | 'activities'; values: string[] }>> = {
  kinds: {
    foreign: { key: 'kinds', values: ['foreign-base', 'overseas-base'] },
    shared: { key: 'kinds', values: ['shared-base'] },
    national: { key: 'kinds', values: ['host-base-foreign-use'] },
    usglobal: { key: 'kinds', values: ['domestic-global'] },
    civilian: { key: 'kinds', values: ['civilian-site'] },
    facility: { key: 'kinds', values: ['special-facility'] },
    closed: { key: 'status', values: ['closed'] },
    hotspot: { key: 'kinds', values: ['garrison', 'region-cluster'] },
    unspecific: { key: 'kinds', values: ['unspecified'] },
  },
  facilities: {
    naval: { key: 'facilities', values: ['naval-port'] },
    missile: { key: 'facilities', values: ['missile-defence'] },
    nuclear: { key: 'facilities', values: ['nuclear-sharing'] },
    telecom: { key: 'facilities', values: ['telecom-station'] },
    training: { key: 'facilities', values: ['training-area'] },
    civilairport: { key: 'facilities', values: ['civil-airport-use'] },
    civilport: { key: 'facilities', values: ['civil-port-use'] },
  },
  themes: {
    drones: { key: 'themes', values: ['drone-warfare'] },
    surveillance: { key: 'facilities', values: ['signals-intelligence'] },
    radar: { key: 'facilities', values: ['radar-station'] },
    defender: { key: 'activities', values: ['defender-europe'] },
    'atlantic-resolve': { key: 'activities', values: ['atlantic-resolve'] },
    un: { key: 'activities', values: ['un-mission'] },
  },
};
