import { Map as MLMap, NavigationControl, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre v6 runs its tile parsing in a separate ES-module worker that the bundler must emit
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { feature } from 'topojson-client';
import type { FeatureCollection, Point } from 'geojson';
import type { Base } from './types';
import { GROUP_COLOR, KIND_GROUP } from './taxonomy';

export const COLORS = {
  space: '#07090f',
  ocean: '#0b1220',
  land: '#1a2233',
  landHi: '#232d42',
  border: '#34405a',
};

setWorkerUrl(workerUrl);

const SAT_URL = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg';
const SAT_ATTR = '<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless</a> by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2024)';

type Detail = '110m' | '50m';
const countriesCache: Partial<Record<Detail, Promise<FeatureCollection>>> = {};

/** country polygons are bundled with the app – no external tile server needed */
export function loadCountries(detail: Detail = '50m'): Promise<FeatureCollection> {
  countriesCache[detail] ??= (detail === '110m'
    ? import('world-atlas/countries-110m.json')
    : import('world-atlas/countries-50m.json')
  ).then((m) => {
    const topo = (m.default ?? m) as any;
    return feature(topo, topo.objects.countries) as unknown as FeatureCollection;
  });
  return countriesCache[detail]!;
}

export function basesToGeoJSON(bases: Base[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: bases.map((b) => ({
      type: 'Feature',
      id: undefined,
      geometry: { type: 'Point', coordinates: [b.lon, b.lat] },
      properties: { id: b.id, name: b.name, group: KIND_GROUP[b.kind], country: b.country },
    })),
  };
}

const colorExpr: any = ['match', ['get', 'group'], ...Object.entries(GROUP_COLOR).flat(), '#999'];

function style(countries: FeatureCollection): StyleSpecification {
  return {
    version: 8,
    projection: { type: 'globe' },
    sky: {
      'sky-color': COLORS.space,
      'horizon-color': '#1b2a4a',
      'fog-color': COLORS.space,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 0.8, 7, 0],
    } as any,
    sources: {
      countries: { type: 'geojson', data: countries, attribution: 'Natural Earth' },
      bases: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': COLORS.ocean } },
      { id: 'land', type: 'fill', source: 'countries', paint: { 'fill-color': COLORS.land } },
      { id: 'borders', type: 'line', source: 'countries', paint: { 'line-color': COLORS.border, 'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.3, 6, 1] } },
      {
        id: 'bases-glow', type: 'circle', source: 'bases',
        filter: ['!=', ['get', 'group'], 'hotspot'],
        paint: {
          'circle-color': colorExpr,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 7, 5, 12, 10, 18],
          'circle-blur': 1,
          'circle-opacity': ['case', ['boolean', ['feature-state', 'dim'], false], 0.05, 0.35],
        },
      },
      {
        id: 'bases', type: 'circle', source: 'bases',
        paint: {
          'circle-color': ['case', ['==', ['get', 'group'], 'hotspot'], 'rgba(0,0,0,0)', colorExpr],
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, ['case', ['==', ['get', 'group'], 'hotspot'], 5, 2.6], 5, ['case', ['==', ['get', 'group'], 'hotspot'], 9, 4.5], 10, ['case', ['==', ['get', 'group'], 'hotspot'], 16, 8]],
          'circle-stroke-color': ['case', ['==', ['get', 'group'], 'hotspot'], GROUP_COLOR.hotspot, COLORS.space],
          'circle-stroke-width': ['case', ['==', ['get', 'group'], 'hotspot'], 1.5, 0.8],
          'circle-opacity': ['case', ['boolean', ['feature-state', 'dim'], false], 0.15, 1],
          'circle-stroke-opacity': ['case', ['boolean', ['feature-state', 'dim'], false], 0.15, 1],
        },
      },
      {
        id: 'bases-focus', type: 'circle', source: 'bases',
        filter: ['in', ['get', 'id'], ['literal', []]],
        paint: {
          'circle-color': 'rgba(0,0,0,0)',
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 7, 5, 11, 10, 16],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      },
    ],
  };
}

export interface MapHandle {
  map: MLMap;
  setBases(bases: Base[]): void;
  /** dim everything except these ids (null = no dimming) */
  highlight(ids: Set<string> | null): void;
  focus(ids: string[]): void;
  setSatellite(on: boolean): void;
  destroy(): void;
}

export async function createMap(
  container: HTMLElement,
  opts: { detail?: Detail; interactive?: boolean; center?: [number, number]; zoom?: number; onSelect?: (id: string) => void; onHover?: (b: { id: string; name: string } | null, x: number, y: number) => void } = {},
): Promise<MapHandle> {
  const countries = await loadCountries(opts.detail ?? '50m');
  const map = new MLMap({
    container,
    style: style(countries),
    center: opts.center ?? [10, 30],
    zoom: opts.zoom ?? 1.4,
    interactive: opts.interactive ?? true,
    attributionControl: { compact: true },
    maxPitch: 60,
    renderWorldCopies: false,
  });
  map.touchZoomRotate.disableRotation();
  if (opts.interactive !== false) map.addControl(new NavigationControl({ showCompass: false }), 'top-right');

  let ids: string[] = [];
  let pendingBases: Base[] | null = null;
  let pendingHighlight: Set<string> | null | undefined;
  const loaded = new Promise<void>((r) => map.once('load', () => r()));

  const applyHighlight = (hl: Set<string> | null) => {
    ids.forEach((id, i) => map.setFeatureState({ source: 'bases', id: i }, { dim: hl ? !hl.has(id) : false }));
  };

  let ready = false;
  loaded.then(() => {
    ready = true;
    if (pendingBases) handle.setBases(pendingBases);
    if (pendingHighlight !== undefined) applyHighlight(pendingHighlight);
  });

  if (opts.onSelect || opts.onHover) {
    map.on('click', 'bases', (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (f && opts.onSelect) opts.onSelect(f.properties.id);
    });
    map.on('mousemove', 'bases', (e: MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = 'pointer';
      const f = e.features?.[0];
      if (f && opts.onHover) opts.onHover({ id: f.properties.id, name: f.properties.name }, e.point.x, e.point.y);
    });
    map.on('mouseleave', 'bases', () => {
      map.getCanvas().style.cursor = '';
      opts.onHover?.(null, 0, 0);
    });
  }

  const handle: MapHandle = {
    map,
    setBases(bases) {
      pendingBases = bases;
      if (!ready) return;
      ids = bases.map((b) => b.id);
      const data = basesToGeoJSON(bases);
      data.features.forEach((f, i) => (f.id = i));
      (map.getSource('bases') as GeoJSONSource).setData(data);
    },
    highlight(hl) {
      pendingHighlight = hl;
      if (ready && ids.length) applyHighlight(hl);
    },
    focus(focusIds) {
      const set = () => map.setFilter('bases-focus', ['in', ['get', 'id'], ['literal', focusIds]]);
      if (ready) set(); else loaded.then(set);
    },
    setSatellite(on) {
      const apply = () => {
        if (on && !map.getSource('sat')) {
          map.addSource('sat', { type: 'raster', tiles: [SAT_URL], tileSize: 256, maxzoom: 15, attribution: SAT_ATTR });
          map.addLayer({ id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.55, 6, 1], 'raster-saturation': -0.2 } }, 'bases-glow');
          map.addLayer({ id: 'sat-borders', type: 'line', source: 'countries', paint: { 'line-color': '#ffffff', 'line-opacity': 0.35, 'line-width': 0.8 } }, 'bases-glow');
        } else if (!on && map.getSource('sat')) {
          map.removeLayer('sat-borders');
          map.removeLayer('sat');
          map.removeSource('sat');
        }
      };
      if (ready) apply(); else loaded.then(apply);
    },
    destroy() { map.remove(); },
  };
  // resolve only once the style is ready, so callers can move the camera safely
  await loaded;
  return handle;
}

export { prefersReducedMotion } from './motion';
