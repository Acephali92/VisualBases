/**
 * Geometry helpers without imports, so that Node scripts (scripts/research/*) can load this file
 * directly via type stripping.
 */
/** mean earth radius (IUGG); the spherical model differs from the WGS84 ellipsoid by up to ~0.5 % */
export const EARTH_RADIUS_KM = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;

/** finite latitude/longitude within the valid range (numbers only – strings are not coerced) */
export function isValidCoord(lat: unknown, lon: unknown): lat is number {
  return typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon)
    && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

/**
 * Great-circle ("as the crow flies") distance in km (haversine). The atan2 form stays accurate for
 * very small distances and near antipodal points. Returns NaN for invalid coordinates, so that an
 * invalid record can never get a plausible-looking distance.
 */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!isValidCoord(lat1, lon1) || !isValidCoord(lat2, lon2)) return NaN;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  const a = Math.min(1, Math.max(0, h));
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** "50.3533° N, 7.5949° E" (German: O for Ost) */
export function formatCoord(lat: number, lon: number, lang: 'de' | 'en', digits = 4): string {
  const ns = `${Math.abs(lat).toFixed(digits)}° ${lat < 0 ? 'S' : 'N'}`;
  const ew = `${Math.abs(lon).toFixed(digits)}° ${lon < 0 ? 'W' : lang === 'de' ? 'O' : 'E'}`;
  return `${ns}, ${ew}`;
}
