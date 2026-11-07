export type Kind =
  | 'foreign'
  | 'shared'
  | 'national'
  | 'usglobal'
  | 'closed'
  | 'civilian'
  | 'hotspot'
  | 'facility'
  | 'unspecific';

export type Facility =
  | 'airfield' | 'command' | 'depot' | 'helipad' | 'laboratory' | 'missile'
  | 'naval' | 'nuclear' | 'telecom' | 'training' | 'civilairport' | 'civilport';

export type Theme = 'drones' | 'environment' | 'surveillance' | 'radar' | 'resistance' | 'un' | 'defender' | 'atlantic-resolve';

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

export interface Base {
  id: string;
  name: string;
  /** ISO 3166 alpha-2 (plus XK for Kosovo) of the host country */
  country: string | null;
  lat: number;
  lon: number;
  zoom: number;
  approx?: boolean;
  /** set from data/corrections.json when the position is known to be doubtful */
  positionCheck?: {
    status: 'proposed' | 'applied';
    issue: 'duplicate-in-source' | string;
    duplicateOf?: string;
    proposal?: { lat: number; lon: number; precision: string; source: string; url: string; retrieved: string };
  };
  kind: Kind;
  /** aggregated "military community" (Σ) */
  group?: boolean;
  facilities: Facility[];
  continent: string | null;
  region: string | null;
  subregion?: string;
  /** stationing nations (ISO alpha-2) */
  nations: string[];
  sharedWith: string[];
  themes: Theme[];
  usType?: 'MOB' | 'FOB' | 'FOS' | 'CSL';
  sourceType: string[];
  updates?: number[];
  review?: boolean;
  wikipedia?: Record<string, string>;
  related?: string[];
  sources: Source[];
  notes: string[];
  images?: Image[];
  origin: string;
  lastmod?: string;
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
  kinds: Kind[];
  nations: string[];
  facilities: Facility[];
  themes: Theme[];
  continents: string[];
  /** host countries (ISO alpha-2) */
  countries: string[];
}
