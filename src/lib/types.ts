import type {
  Activity, ClaimType, EvidenceState, Feature, IssueCode, Listing, Organisation, PresenceRole, PresenceVia,
  Relation, RelationType, SiteType, Status, Theme, UsPosture, Continent, PositionCheckStatus, PositionIssue, PositionPrecision,
} from './taxonomy';

export type { Activity, Feature, Organisation, SiteType, Status, Theme, Continent } from './taxonomy';

export interface Source {
  url: string;
  label: string;
}

export interface Image {
  src: string;
  thumb: string;
  w: number;
  h: number;
  tw: number;
  th: number;
  type: 'photo' | 'satellite' | 'map' | 'document' | 'logo';
  year?: number;
  caption?: string;
  credit?: string;
  license?: string;
  licenseUrl?: string;
  sourceUrl?: string;
}

/** territory of the site: sovereign state, plus the dependent territory if it has an own ISO code */
export interface Host {
  /** ISO 3166-1 alpha-2 of the sovereign state (plus XK for Kosovo) */
  country: string | null;
  /** ISO code of a dependent territory (GU, PR, GL, MQ …), see TERRITORY_SOVEREIGN */
  territory?: string;
}

export interface Presence {
  /** ISO alpha-2 of the state */
  nation: string;
  role: PresenceRole;
  /** how the presence was derived from the source */
  via: PresenceVia;
}

export interface Relationship {
  type: RelationType;
  id: string;
}

/**
 * One record of data/bases.json – the import layer (written by scripts/import-visualbases.mjs,
 * never edited by hand). Classification is the normalised form of the source terms in `origin.terms`.
 */
export interface SourceRecord {
  id: string;
  name: string;
  altNames?: string[];
  host: Host;
  lat: number;
  lon: number;
  /** zoom level of the source's map link */
  zoom: number;
  /** approximate position: geocoded by hand (import) or precision "town"/"region" (resolved) */
  approx?: boolean;
  /** source of the coordinate if not the post's map link: an explicit coordinate in the text or a Google Earth link */
  positionFrom?: 'text' | 'google-earth';
  continent: Continent | null;
  region: string | null;
  subregion?: string;
  siteType: SiteType;
  status: Status;
  presences: Presence[];
  organisations: Organisation[];
  features: Feature[];
  themes: Theme[];
  activities: Activity[];
  usPosture?: UsPosture;
  listedIn: Listing[];
  relations?: Relationship[];
  sources: Source[];
  wikipedia?: Record<string, string>;
  notes: string[];
  images?: { url: string; caption: string }[];
  origin: {
    url: string;
    lastmod?: string;
    /** marked "Review required" on visualbases.org */
    review?: boolean;
    /** years of update notes on visualbases.org */
    updates?: number[];
    /** raw WordPress categories and tags – the basis of every derived classification */
    terms: { categories: string[]; tags: string[] };
  };
}

/** a checked source from data/research attached to a record */
export interface Evidence {
  url: string;
  title: string;
  publisher: string;
  type: string;
  published?: string;
  accessed: string;
  supports: ClaimType[];
  verdict: 'supports' | 'contradicts' | 'context' | 'unreviewed';
  /** verdict per statement group where it differs from `verdict` */
  verdicts?: Partial<Record<ClaimType, 'supports' | 'contradicts' | 'context'>>;
  /** for sources on the position: how precisely they locate the site */
  precision?: PositionPrecision;
  method: 'manual' | 'auto';
  summary: string;
  note?: string;
}

/** a correction from data/claims.json that was applied to the record */
export interface Correction {
  id: string;
  field: string;
  op: 'set' | 'add' | 'remove';
  from: unknown;
  to: unknown;
  statement: { de: string; en: string };
  sources: string[];
  decided: string;
}

/** the resolved record as published in public/data/bases.json and used by the app */
export interface Base extends Omit<SourceRecord, 'images' | 'presences'> {
  images?: Image[];
  presences: (Presence & { relation: Relation })[];
  /** foreign: at least one foreign presence · overseas: only in own territories · domestic: context site */
  scope: 'foreign' | 'overseas' | 'domestic' | 'unknown';
  /** where each classification comes from */
  basis: { siteType: 'source' | 'derived' | 'claim'; status: 'source' | 'implicit' | 'claim' };
  /** period of (foreign) use, only where documented */
  period?: { from?: string; to?: string };
  /** how precisely the coordinate locates the facility (docs/DATA-QUALITY.md); approx = town or region */
  positionPrecision: PositionPrecision;
  positionCheck?: {
    status: PositionCheckStatus;
    issue: PositionIssue;
    duplicateOf?: string;
    proposal?: { lat: number; lon: number; precision: PositionPrecision; source: string; url: string; retrieved: string };
    /** evidence of a confirmed position (status "confirmed") */
    source?: string;
    url?: string;
    retrieved?: string;
    note?: string;
    /** precision stated by the editors for a confirmed position */
    precision?: PositionPrecision;
  };
  corrections?: Correction[];
  /** proposed corrections from data/claims.json – not applied, shown as review notes */
  proposals?: (Omit<Correction, 'from' | 'to' | 'decided'> & { value: unknown })[];
  /** state of evidence per statement group, from the source research */
  evidence?: Partial<Record<ClaimType, EvidenceState>>;
  research?: Evidence[];
  /** date of the most recent manual check of a source for this record */
  lastChecked?: string;
  issues?: IssueCode[];
  /** inverse relations (computed) */
  includes?: string[];
  hasParts?: string[];
}

export interface Story {
  id: string;
  title: string;
  lang: 'de' | 'en';
  excerpt?: string;
  url: string;
  lastmod?: string;
}

export interface NewsItem {
  lang: 'de' | 'en';
  title: string;
  teaser?: string;
  source?: string;
  /** YYYY-MM-DD, YYYY-MM or YYYY */
  date: string | null;
  url: string;
  bases?: string[];
}

export interface Initiative { name: string; url: string; region: string; de: string; en: string }
export interface Speaker { name: string; from: string; role: string; topic: string; photo?: string; link?: string; video?: boolean; base?: string }
export interface Movement {
  initiatives: Initiative[];
  congress?: { title: string; date: string; subtitle: string; next?: { title: string; url: string }; speakers: Speaker[] };
}

export interface Filters {
  q: string;
  /** site types */
  kinds: SiteType[];
  status: Status[];
  nations: string[];
  /** features: infrastructure, civilian use, functions, arrangements */
  facilities: Feature[];
  themes: Theme[];
  /** activity groups (atlantic-resolve, defender-europe, un-mission) and organisations (nato, eu) */
  activities: string[];
  continents: string[];
  /** host countries or territories (ISO alpha-2) */
  countries: string[];
}
