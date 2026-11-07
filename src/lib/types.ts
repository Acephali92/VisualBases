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

export interface Filters {
  q: string;
  kinds: Kind[];
  nations: string[];
  facilities: Facility[];
  themes: Theme[];
  continents: string[];
}
