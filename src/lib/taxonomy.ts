import type { Facility, Kind, Theme } from './types';

/**
 * Map encoding. Only three hues are used (validated for colour-vision deficiency
 * on the dark surface, all pairs); closed sites are neutral grey and military
 * communities are drawn as rings – so identity never relies on colour alone.
 */
export type ColorGroup = 'foreign' | 'shared' | 'other' | 'closed' | 'hotspot';

export const GROUP_COLOR: Record<ColorGroup, string> = {
  foreign: '#e8692f',
  shared: '#3987e5',
  other: '#199e70',
  closed: '#8b93a7',
  hotspot: '#f2efe6',
};

export const KIND_GROUP: Record<Kind, ColorGroup> = {
  foreign: 'foreign',
  shared: 'shared',
  national: 'other',
  usglobal: 'other',
  civilian: 'other',
  facility: 'other',
  unspecific: 'other',
  closed: 'closed',
  hotspot: 'hotspot',
};

export const KINDS: Kind[] = ['foreign', 'shared', 'national', 'usglobal', 'civilian', 'facility', 'closed', 'hotspot', 'unspecific'];

export const FACILITIES: Facility[] = [
  'airfield', 'naval', 'command', 'missile', 'nuclear', 'telecom', 'training', 'depot', 'helipad', 'laboratory', 'civilairport', 'civilport',
];

export const FACILITY_ICON: Record<Facility, string> = {
  airfield: '✈', naval: '⚓', command: '◎', missile: '⇡', nuclear: '☢', telecom: '📡',
  training: '⛺', depot: '▦', helipad: 'Ⓗ', laboratory: '⚗', civilairport: '✈︎', civilport: '⛴',
};

export const THEMES: Theme[] = ['resistance', 'drones', 'environment', 'surveillance', 'radar', 'defender', 'atlantic-resolve', 'un'];

export const NATIONS = ['US', 'FR', 'GB', 'CN', 'RU', 'JP', 'DE'];

export const CONTINENTS = ['europe', 'asia', 'africa', 'america', 'oceania', 'atlantic'];

/** flag emoji from an ISO alpha-2 code */
export function flag(cc: string | null | undefined): string {
  if (!cc || cc.length !== 2) return '🏳';
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}
