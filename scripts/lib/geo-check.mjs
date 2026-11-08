/**
 * Offline plausibility checks of coordinates against country polygons (Natural Earth via world-atlas,
 * 1:10m – already a dependency of the app). Pure functions apart from loadCountries(); used by the validator.
 *
 * A coordinate is the reference point of a site. It is checked against the host state (or its territory):
 *   inside the host's polygon                      → fine
 *   inside an area claimed by several states       → coords-country-disputed (if the host is a claimant)
 *   inside another state's polygon                 → coords-country
 *   at sea, but within COAST_KM of the host        → fine (coastal and island sites, coarse coastlines)
 *   at sea, nearest land is another state          → coords-country
 *   at sea, no land within COAST_KM                → coords-offshore
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { TERRITORY_SOVEREIGN } from '../../src/lib/taxonomy.ts';

/** tolerance for coastal sites and simplified coastlines */
export const COAST_KM = 10;

/** ISO 3166-1 numeric → alpha-2 for the polygons of world-atlas */
const NUMERIC = Object.fromEntries(
  ('004AF 008AL 010AQ 012DZ 016AS 020AD 024AO 028AG 031AZ 032AR 036AU 040AT 044BS 048BH 050BD 051AM 052BB 056BE 060BM 064BT ' +
    '068BO 070BA 072BW 076BR 084BZ 086IO 090SB 092VG 096BN 100BG 104MM 108BI 112BY 116KH 120CM 124CA 132CV 136KY 140CF 144LK ' +
    '148TD 152CL 156CN 158TW 170CO 174KM 178CG 180CD 184CK 188CR 191HR 192CU 196CY 203CZ 204BJ 208DK 212DM 214DO 218EC 222SV ' +
    '226GQ 231ET 232ER 233EE 234FO 238FK 239GS 242FJ 246FI 248AX 250FR 258PF 260TF 262DJ 266GA 268GE 270GM 275PS 276DE 288GH ' +
    '292GI 296KI 300GR 304GL 308GD 316GU 320GT 324GN 328GY 332HT 334HM 336VA 340HN 344HK 348HU 352IS 356IN 360ID 364IR 368IQ ' +
    '372IE 376IL 380IT 384CI 388JM 392JP 398KZ 400JO 404KE 408KP 410KR 414KW 417KG 418LA 422LB 426LS 428LV 430LR 434LY 438LI ' +
    '440LT 442LU 446MO 450MG 454MW 458MY 462MV 466ML 470MT 478MR 480MU 484MX 492MC 496MN 498MD 499ME 500MS 504MA 508MZ 512OM ' +
    '516NA 520NR 524NP 528NL 531CW 533AW 534SX 540NC 548VU 554NZ 558NI 562NE 566NG 570NU 574NF 578NO 580MP 581UM 583FM 584MH ' +
    '585PW 586PK 591PA 598PG 600PY 604PE 608PH 612PN 616PL 620PT 624GW 626TL 630PR 634QA 642RO 643RU 646RW 652BL 654SH 659KN ' +
    '660AI 662LC 663MF 666PM 670VC 674SM 678ST 682SA 686SN 688RS 690SC 694SL 702SG 703SK 704VN 705SI 706SO 710ZA 716ZW 724ES ' +
    '728SS 729SD 732EH 740SR 748SZ 752SE 756CH 760SY 762TJ 764TH 768TG 776TO 780TT 784AE 788TN 792TR 795TM 796TC 798TV 800UG ' +
    '804UA 807MK 818EG 826GB 831GG 832JE 833IM 834TZ 840US 850VI 854BF 858UY 860UZ 862VE 876WF 882WS 887YE 894ZM')
    .split(' ')
    .map((x) => [x.slice(0, 3), x.slice(3)]),
);

/**
 * polygons without an ISO code (or claimed by several states): the states a record there may name.
 * `disputed` areas are reported separately – the host is then a political decision, not a data error.
 */
const SPECIAL = {
  Kosovo: { codes: ['XK'] },
  Somaliland: { codes: ['SO'] },
  'N. Cyprus': { codes: ['CY'] },
  'Cyprus U.N. Buffer Zone': { codes: ['CY'] },
  Akrotiri: { codes: ['GB', 'CY'] }, // British Sovereign Base Area
  Dhekelia: { codes: ['GB', 'CY'] },
  'USNB Guantanamo Bay': { codes: ['CU', 'US'] },
  Baikonur: { codes: ['KZ', 'RU'] },
  'Indian Ocean Ter.': { codes: ['AU'] },
  'Coral Sea Is.': { codes: ['AU'] },
  'Clipperton I.': { codes: ['FR'] },
  'Siachen Glacier': { codes: ['IN', 'PK'], disputed: true },
  'Spratly Is.': { codes: ['CN', 'TW', 'VN', 'PH', 'MY', 'BN'], disputed: true },
  'Scarborough Reef': { codes: ['CN', 'TW', 'PH'], disputed: true },
  'Bajo Nuevo Bank': { codes: ['CO', 'JM', 'NI', 'HN', 'US'], disputed: true },
  'Serranilla Bank': { codes: ['CO', 'JM', 'NI', 'HN', 'US'], disputed: true },
};
/** coded polygons whose sovereignty is contested by a state that the dataset may name as host */
const CONTESTED = { TW: ['CN'], EH: ['MA'], PS: ['IL'] };

const rad = (d) => (d * Math.PI) / 180;

/** load and prepare the country polygons: [{ name, codes, disputed, polygons: [[ring, …], …], bbox }] */
export function loadCountries() {
  const require = createRequire(import.meta.url);
  const topo = JSON.parse(readFileSync(require.resolve('world-atlas/countries-10m.json'), 'utf8'));
  return prepareCountries(feature(topo, topo.objects.countries).features);
}

/** GeoJSON country features → lookup structure (exported for tests with hand-made polygons) */
export function prepareCountries(features) {
  return features.map((f) => {
    const name = f.properties?.name ?? '';
    const special = SPECIAL[name];
    const code = f.code ?? NUMERIC[f.id];
    const codes = special?.codes ?? (code ? [code, ...(CONTESTED[code] ?? [])] : []);
    const disputed = special?.disputed ?? Boolean(code && CONTESTED[code]);
    const g = f.geometry;
    const raw = !g ? [] : g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    const polygons = raw.map((poly) => poly.map(unwrap));
    polygons.forEach((poly) => { poly.bbox = bboxOf(poly[0]); });
    const all = polygons.map((p) => p.bbox);
    const bbox = [Math.min(...all.map((b) => b[0])), Math.min(...all.map((b) => b[1])), Math.max(...all.map((b) => b[2])), Math.max(...all.map((b) => b[3]))];
    return { name, code: code ?? null, codes, disputed, polygons, bbox };
  }).filter((c) => c.polygons.length && c.codes.length);
}

function bboxOf(ring) {
  let [w, s, e, n] = [Infinity, 90, -Infinity, -90];
  for (const [x, y] of ring) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }
  return [w, s, e, n];
}
const inBox = (x, y, [w, s, e, n], dx = 0, dy = 0) => y >= s - dy && y <= n + dy && x >= w - dx && x <= e + dx;

/**
 * rings that cross the antimeridian jump from 180 to -180 (Russia, Fiji, the US with the Aleutians); unwrapping
 * makes them continuous (longitudes may then exceed ±180), so ray casting and distances stay correct
 */
function unwrap(ring) {
  const out = [];
  let shift = 0;
  for (let i = 0; i < ring.length; i++) {
    if (i) { const d = ring[i][0] - ring[i - 1][0]; if (d > 180) shift -= 360; else if (d < -180) shift += 360; }
    out.push([ring[i][0] + shift, ring[i][1]]);
  }
  return out;
}

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inPolygonAt = (x, y, poly) => inRing(x, y, poly[0]) && !poly.slice(1).some((hole) => inRing(x, y, hole));
const inPolygon = (x, y, poly) => [x, x + 360, x - 360].some((xx) => inBox(xx, y, poly.bbox) && inPolygonAt(xx, y, poly));

/** distance in km from a point to a ring (local equirectangular projection – exact enough below ~100 km) */
function ringKm(lat, lon, ring) {
  const kx = 111.32 * Math.cos(rad(lat)), ky = 110.57;
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    // shift the whole segment (rings are unwrapped, so a segment never spans more than 180°)
    const ax = ((ring[j][0] - lon + 540) % 360) - 180;
    const bx = ax + (ring[i][0] - ring[j][0]);
    if (Math.abs(bx) > 180) continue; // the segment lies on the far side of the globe
    const [x1, y1, x2, y2] = [ax * kx, (ring[j][1] - lat) * ky, bx * kx, (ring[i][1] - lat) * ky];
    const dx = x2 - x1, dy = y2 - y1;
    const t = dx || dy ? Math.max(0, Math.min(1, -(x1 * dx + y1 * dy) / (dx * dx + dy * dy))) : 0;
    best = Math.min(best, Math.hypot(x1 + t * dx, y1 + t * dy));
  }
  return best;
}

const near = (c, lat, lon, km) => {
  const dLat = km / 110, dLon = km / (111 * Math.max(0.1, Math.cos(rad(lat))));
  return [lon, lon + 360, lon - 360].some((x) => inBox(x, lat, c.bbox, dLon, dLat));
};

/** the polygon a point lies in, or null */
export function countryAt(lat, lon, countries) {
  return countries.find((c) => near(c, lat, lon, 0) && c.polygons.some((p) => inPolygon(lon, lat, p))) ?? null;
}

/** countries within `km` of a point, nearest first: [{ country, km }] */
export function countriesNear(lat, lon, countries, km = COAST_KM) {
  return countries
    .filter((c) => near(c, lat, lon, km))
    .map((c) => ({ country: c, km: Math.min(...c.polygons.filter((p) => near({ bbox: p.bbox }, lat, lon, km)).map((p) => ringKm(lat, lon, p[0]))) }))
    .filter((x) => x.km <= km)
    .sort((a, b) => a.km - b.km);
}

/** does a polygon belong to the record's host (state, its territory, or the sovereign of the polygon's territory)? */
export function matchesHost(country, host = {}) {
  return country.codes.some((c) => c === host.country || c === host.territory || TERRITORY_SOVEREIGN[c] === host.country);
}

const label = (c) => `${c.name}${c.code ? ` (${c.code})` : ''}`;

/**
 * Check one (resolved) record. Returns null or { rule, msg, country, km }.
 */
export function checkCountry(b, countries, { coastKm = COAST_KM } = {}) {
  if (typeof b.lat !== 'number' || typeof b.lon !== 'number') return null;
  const host = b.host ?? {};
  const where = [host.country, host.territory].filter(Boolean).join('/');
  const at = countryAt(b.lat, b.lon, countries);
  if (at) {
    if (at.disputed && matchesHost(at, host) && at.code !== host.country && at.code !== host.territory) {
      return { rule: 'coords-country-disputed', msg: `position lies in ${label(at)}, an area also claimed by the host ${where}`, country: at.name, km: 0 };
    }
    if (matchesHost(at, host)) return null;
    // borders are simplified: a site right at the host's border is not reported
    if (countriesNear(b.lat, b.lon, countries, coastKm / 2).some((x) => matchesHost(x.country, host))) return null;
    return { rule: 'coords-country', msg: `position lies in ${label(at)}, host country is ${where}`, country: at.name, km: 0 };
  }
  const around = countriesNear(b.lat, b.lon, countries, coastKm);
  if (around.some((x) => matchesHost(x.country, host))) return null;
  if (around.length) {
    const n = around[0];
    return { rule: 'coords-country', msg: `position lies at sea ${n.km.toFixed(1)} km off ${label(n.country)}, host country is ${where}`, country: n.country.name, km: n.km };
  }
  return { rule: 'coords-offshore', msg: `position lies at sea, no land within ${coastKm} km (host ${where})`, country: null, km: null };
}

/* ---------------------------------------------------------------- research signals (data/research/checks.json) */

/** site types that stand for several facilities – their position is symbolic */
export const AGGREGATE_TYPES = new Set(['garrison', 'region-cluster']);
/** a Wikidata coordinate may lie this far from the reference point before it is reported */
export const WIKIDATA_KM = { site: 5, large: 15 };
/** facilities that typically extend over several kilometres */
const LARGE = new Set(['training-area', 'airfield']);
/** Wikidata classes of places (not facilities) */
const PLACE_ITEM = /\b(city|town|village|municipality|commune|human settlement|capital|administrative|country|sovereign state|province|district|metropolis)\b/i;
/** positions closer than this count as unchanged since a check */
const SAME_POSITION_KM = 0.01;

const distance = (a, b) => {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(h)));
};

/**
 * Warnings from the automatic research checks for one resolved record:
 *   position-check-stale   the OSM check was made for another position (e.g. before a position claim)
 *   position-osm-none      OpenStreetMap shows nothing military within 3 km of the current position
 *   position-wikidata-far  the coordinate of the matched Wikidata item is far from the current position
 * Aggregates and positions known to be approximate (town/region) are not checked against OSM and Wikidata.
 */
export function researchSignals(b, check = {}) {
  const out = [];
  if (typeof b.lat !== 'number' || typeof b.lon !== 'number') return out;
  const pos = { lat: b.lat, lon: b.lon };
  const coarse = AGGREGATE_TYPES.has(b.siteType) || b.positionPrecision === 'town' || b.positionPrecision === 'region';
  const osm = check.osm;
  if (osm && typeof osm.lat === 'number') {
    const moved = distance(pos, osm);
    if (moved > SAME_POSITION_KM) out.push({ rule: 'position-check-stale', msg: `OSM check refers to a position ${moved.toFixed(1)} km away – run scripts/research/osm-check.mjs again` });
    else if (osm.verdict === 'none' && !coarse) out.push({ rule: 'position-osm-none', msg: 'OpenStreetMap shows no military area or aerodrome within 3 km' });
  }
  const wd = check.wikidata;
  // an item for a town or country locates the place, not the facility
  const placeItem = (wd?.instanceOf ?? []).some((t) => PLACE_ITEM.test(t));
  if (wd?.coord && !coarse && !placeItem) {
    const km = distance(pos, { lat: wd.coord[0], lon: wd.coord[1] });
    const limit = (b.features ?? []).some((f) => LARGE.has(f)) ? WIKIDATA_KM.large : WIKIDATA_KM.site;
    if (km > limit) {
      const kind = wd.instanceOf?.length ? ` (${wd.instanceOf.slice(0, 2).join(', ')})` : '';
      out.push({ rule: 'position-wikidata-far', msg: `Wikidata ${wd.item}${kind} is ${km.toFixed(1)} km away (tolerance ${limit} km) – wrong match or wrong position?` });
    }
  }
  return out;
}
